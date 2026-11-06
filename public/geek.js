
(() => {
  "use strict";

  const API_URL = "/api/animes";
  const $ = selector => document.querySelector(selector);

  const FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420">' +
      '<rect width="100%" height="100%" fill="#241a30"/>' +
      '<text x="50%" y="48%" text-anchor="middle" fill="#ff9a27" ' +
      'font-family="Arial" font-size="22">GEEKVERSE</text>' +
      '<text x="50%" y="56%" text-anchor="middle" fill="#ddd" ' +
      'font-family="Arial" font-size="13">Imagem indisponível</text></svg>'
    );

  const state = {
    favoritesOnly: false,
    favorites: new Set(),
    releases: [],
    recommendations: [],
    trending: [],
    characters: [],
    searchItems: [],
    searchCharacters: [],
    search: { q: "", page: 1 },
    pageInfo: {
      total: 0,
      currentPage: 1,
      lastPage: 0,
      hasNextPage: false
    },
    loading: false,
    controller: null,
    charactersPage: 0,
    charactersLoading: false,
    charactersController: null
  };

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function safeImage(value) {
    if (typeof value !== "string") return FALLBACK_IMAGE;
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol)
        ? value : FALLBACK_IMAGE;
    } catch {
      return FALLBACK_IMAGE;
    }
  }

  function imageUrl(item) {
    return safeImage(
      item?.coverImage?.extraLarge ||
      item?.coverImage?.large ||
      item?.image
    );
  }

  function titleOf(item) {
    return item?.title?.portuguese ||
      item?.title?.english ||
      item?.title?.romaji ||
      item?.name ||
      "Título não informado";
  }

  function yearOf(item) {
    return item?.startDate?.year ||
      item?.seasonYear ||
      "Ano não informado";
  }

  function showMessage(message) {
    const el = $("#page-message");
    el.textContent = message;
    el.hidden = !message;
  }

  function showStatus(message, type = "") {
    const el = $("#status-api");
    el.textContent = message;
    el.dataset.tipo = type;
  }

  function cardMarkup(item, type = "anime") {
    const title = escapeHtml(titleOf(item));
    const image = escapeHtml(imageUrl(item));

    const meta = type === "character"
      ? `${Number(item.favourites || 0).toLocaleString("pt-BR")} favoritos`
      : `${escapeHtml(yearOf(item))}${
          item.episodes ? ` • ${escapeHtml(item.episodes)} eps.` : ""
        }`;

    const score = type === "anime" && item.averageScore
      ? `<span class="score">${escapeHtml(item.averageScore)}%</span>`
      : "";

    return `
      <article class="anime-card" role="button" tabindex="0"
        data-item-id="${escapeHtml(item.id)}"
        data-item-type="${type}"
        aria-label="Ver detalhes de ${title}">
        <div class="poster-wrap">
          <img src="${image}" alt="Imagem de ${title}" loading="lazy">
          ${score}
        </div>
        <h3 class="card-title">${title}</h3>
        <div class="card-meta">${meta}</div>
      </article>
    `;
  }

  function renderTrack(selector, items, type = "anime") {
    const target = $(selector);
    if (!target) return;

    const filtered = state.favoritesOnly && type === "anime"
      ? items.filter(item => state.favorites.has(String(item.id)))
      : items;

    target.innerHTML = filtered.length
      ? filtered.map(item => cardMarkup(item, type)).join("")
      : `<div class="empty-state">${
          state.favoritesOnly
            ? "Nenhum anime favorito nesta seção."
            : "Nenhum item encontrado."
        }</div>`;
  }

  function renderTrending(items) {
    const target = $("#trending-list");

    target.innerHTML = items.length
      ? items.slice(0, 8).map((item, index) => `
        <li>
          <span class="rank-number">${index + 1}</span>
          <img src="${escapeHtml(imageUrl(item))}" alt="" loading="lazy">
          <div>
            <div class="trend-title">${escapeHtml(titleOf(item))}</div>
            <div class="trend-meta">
              ${escapeHtml(yearOf(item))}
              ${item.averageScore ? ` • ${item.averageScore}%` : ""}
            </div>
          </div>
        </li>
      `).join("")
      : "<li>Nenhum anime em alta encontrado.</li>";
  }

  function renderHome() {
    renderTrack("#releases-track", state.releases);
    renderTrack("#recommendations-track", state.recommendations);
    renderTrack("#characters-track", state.characters, "character");
    renderTrending(state.trending);
  }

  async function loadCharacters(page = 1, append = false) {
    if (state.charactersLoading) return;

    state.charactersController?.abort();
    const controller = new AbortController();
    state.charactersController = controller;
    state.charactersLoading = true;

    const button = $("#characters-load-more");
    const status = $("#characters-status");
    button.disabled = true;
    button.hidden = page === 1 && !append;
    status.textContent = append
      ? "Carregando mais personagens..."
      : "Carregando personagens...";

    if (!append) {
      state.characters = [];
      state.charactersPage = 0;
      renderTrack("#characters-track", [], "character");
    }

    try {
      const data = await requestApi(
        `/api/personagens?page=${page}`,
        controller.signal
      );

      if (controller !== state.charactersController) return;
      if (!Array.isArray(data.results) || !data.pageInfo) {
        throw new Error("A API retornou dados inválidos de personagens.");
      }

      state.characters.push(...data.results);
      state.charactersPage = data.pageInfo.currentPage;
      renderTrack("#characters-track", state.characters, "character");
      status.textContent = data.pageInfo.total
        ? `Exibindo ${state.characters.length} de ${data.pageInfo.total} personagens${
            data.meta?.avisoTraducao ? ` • ${data.meta.avisoTraducao}` : ""
          }`
        : "Nenhum personagem encontrado.";
      button.hidden = !data.pageInfo.hasNextPage;
      button.disabled = false;
      button.textContent = "Carregar mais personagens";
      if (data.meta?.requisicao) showInspector(data.meta.requisicao);
    } catch (error) {
      if (
        controller !== state.charactersController ||
        error.name === "AbortError"
      ) return;

      console.error("Erro ao carregar personagens:", error);
      status.textContent = error.message;
      button.hidden = false;
      button.disabled = false;
      button.textContent = state.characters.length
        ? "Tentar novamente"
        : "Tentar carregar personagens novamente";
    } finally {
      if (controller === state.charactersController) {
        state.charactersLoading = false;
      }
    }
  }

  function showInspector(request) {
    const inspector = $("#inspector");

    if (!request) {
      inspector.textContent = "Nenhuma requisição disponível.";
      return;
    }

    inspector.textContent =
      `${request.metodo} ${request.url}\n\n` +
      `Content-Type: application/json\n\n` +
      `Consulta GraphQL:\n${request.query}\n\n` +
      `Variables:\n${JSON.stringify(request.variables, null, 2)}`;
  }

  async function requestApi(url, signal) {
    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/json" }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.erro || `Erro HTTP ${response.status}`);
      error.request = data.requisicao;
      throw error;
    }

    return data;
  }

  function findItem(id, type) {
    const items = type === "character"
      ? [...state.characters, ...state.searchCharacters]
      : [
          ...state.releases,
          ...state.recommendations,
          ...state.trending,
          ...state.searchItems
        ];

    return items.find(item => String(item.id) === String(id));
  }

  function formatInlineMarkdown(value) {
    const code = [];
    let formatted = escapeHtml(value).replace(
      /`([^`\n]+)`/g,
      (_match, text) => {
        const index = code.push(text) - 1;
        return `\u0000${index}\u0000`;
      }
    );

    formatted = formatted
      .replace(/~!(.+?)!~/g, '<span class="description-spoiler">$1</span>')
      .replace(/(\*\*|__)(?=\S)(.+?\S)\1/g, "<strong>$2</strong>")
      .replace(/~~(?=\S)(.+?\S)~~/g, "<del>$1</del>")
      .replace(/(^|[\s(])([*_])(?=\S)(.+?\S)\2(?=$|[\s).,!?:;])/g,
        "$1<em>$3</em>");

    return formatted.replace(/\u0000(\d+)\u0000/g,
      (_match, index) => `<code>${code[Number(index)]}</code>`);
  }

  function formatDescription(description, heading) {
    const source = String(description || "Sem descrição disponível.")
      .replace(/<br\s*\/?>/gi, "\n");
    const decoder = document.createElement("textarea");
    decoder.innerHTML = source;

    const lines = decoder.value.split(/\r?\n/);
    const content = [];
    let listOpen = false;

    function closeList() {
      if (listOpen) content.push("</ul>");
      listOpen = false;
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const listItem = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);

      if (!line) {
        closeList();
        continue;
      }

      if (listItem) {
        if (!listOpen) {
          content.push('<ul class="description-list">');
          listOpen = true;
        }
        content.push(`<li>${formatInlineMarkdown(listItem[1])}</li>`);
        continue;
      }

      closeList();
      const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
      if (headingMatch) {
        content.push(`<h4>${formatInlineMarkdown(headingMatch[1])}</h4>`);
      } else if (line.startsWith("> ")) {
        content.push(
          `<blockquote>${formatInlineMarkdown(line.slice(2))}</blockquote>`
        );
      } else {
        content.push(`<p>${formatInlineMarkdown(line)}</p>`);
      }
    }

    closeList();

    return `
      <section class="dialog-description">
        <h3>${heading}</h3>
        <div class="description-content">
          ${content.join("") || "<p>Sem descrição disponível.</p>"}
        </div>
      </section>
    `;
  }

  function openDetails(item, type = "anime") {
    const dialog = $("#anime-dialog");
    const content = $("#dialog-content");
    const title = escapeHtml(titleOf(item));
    const image = escapeHtml(imageUrl(item));
    const description = formatDescription(
      item.description,
      type === "character" ? "Sobre o personagem" : "Sinopse"
    );

    if (type === "character") {
      content.innerHTML = `
        <div class="dialog-layout">
          <img src="${image}" alt="${title}">
          <div>
            <h2>${title}</h2>
            <p class="dialog-stats">
              ${Number(item.favourites || 0).toLocaleString("pt-BR")} favoritos
            </p>
            ${description}
          </div>
        </div>
      `;
    } else {
      const id = String(item.id);
      const favorite = state.favorites.has(id);

      content.innerHTML = `
        <div class="dialog-layout">
          <img src="${image}" alt="Capa de ${title}">
          <div>
            <h2>${title}</h2>
            <p class="dialog-stats">
              ${escapeHtml(yearOf(item))}
              ${item.format ? ` • ${escapeHtml(item.format)}` : ""}
              ${item.episodes ? ` • ${item.episodes} episódios` : ""}
              ${item.averageScore ? ` • Nota ${item.averageScore}%` : ""}
            </p>
            ${description}
            <button class="favorite-button" id="dialog-favorite"
              type="button">
              ${favorite ? "♥ Remover dos favoritos" : "♡ Adicionar aos favoritos"}
            </button>
            ${item.siteUrl && /^https:\/\/anilist\.co\//.test(item.siteUrl)
              ? `<p><a href="${escapeHtml(item.siteUrl)}"
                  target="_blank" rel="noopener noreferrer">
                  Ver na AniList ↗
                </a></p>`
              : ""}
          </div>
        </div>
      `;

      $("#dialog-favorite").addEventListener("click", () => {
        if (state.favorites.has(id)) {
          state.favorites.delete(id);
        } else {
          state.favorites.add(id);
        }

        try {
          localStorage.setItem(
            "geekverse-anime-favorites",
            JSON.stringify([...state.favorites])
          );
        } catch (error) {
          console.warn("Não foi possível salvar favoritos:", error);
        }

        $("#dialog-favorite").textContent =
          state.favorites.has(id)
            ? "♥ Remover dos favoritos"
            : "♡ Adicionar aos favoritos";

        if (state.favoritesOnly) renderHome();
      });
    }
    dialog.showModal();
  }

  function updatePagination() {
    $("#btn-anterior").disabled =
      state.loading || state.pageInfo.currentPage <= 1;

    $("#btn-proxima").disabled =
      state.loading || !state.pageInfo.hasNextPage;

    $("#pagina-atual").textContent =
      state.pageInfo.lastPage ? state.pageInfo.currentPage : "—";

    $("#total-paginas").textContent =
      state.pageInfo.lastPage || "—";
  }

  async function searchAnime(q, page = 1) {
    state.controller?.abort();

    const controller = new AbortController();
    state.controller = controller;
    state.search = { q, page };
    state.loading = true;

    $("#home-content").hidden = true;
    $("#search-results").hidden = false;
    $("#search-title").textContent = `Resultados para "${q}"`;
    $("#search-grid").setAttribute("aria-busy", "true");
    $("#search-grid").innerHTML =
      '<div class="loading-card">Buscando animes e personagens...</div>';

    $("#btn-tentar").hidden = true;
    $("#total-resultados").textContent = "—";
    showStatus("Consultando animes e personagens na AniList...");

    updatePagination();

    try {
      const params = new URLSearchParams({
        q,
        page: String(page)
      });

      const data = await requestApi(
        `${API_URL}?${params}`,
        controller.signal
      );

      if (controller !== state.controller) return;
      if (
        !Array.isArray(data.results) ||
        !data.pageInfo ||
        !Array.isArray(data.characters)
      ) {
        throw new Error("O servidor retornou dados inesperados.");
      }

      state.searchItems = data.results;
      state.searchCharacters = data.characters;
      state.pageInfo = data.pageInfo;

      const resultCards = [
        ...data.results.map(item => cardMarkup(item, "anime")),
        ...data.characters.map(item => cardMarkup(item, "character"))
      ];
      $("#search-grid").innerHTML = resultCards.length
        ? resultCards.join("")
        : '<div class="empty-state">Nenhum anime ou personagem encontrado.</div>';

      $("#total-resultados").textContent =
        `${state.pageInfo.total} resultado(s)`;

      showStatus(
        `${data.results.length} anime(s) e ` +
          `${data.characters.length} personagem(ns) nesta página.` +
          (data.meta?.avisoTraducao ? ` ${data.meta.avisoTraducao}` : ""),
        "sucesso"
      );

      showInspector(data.meta?.requisicao);

    } catch (error) {
      if (
        controller !== state.controller ||
        error.name === "AbortError"
      ) return;

      console.error(error);
      $("#search-grid").innerHTML = "";
      $("#btn-tentar").hidden = false;
      showStatus(error.message, "erro");
      if (error.request) showInspector(error.request);

    } finally {
      if (controller === state.controller) {
        state.loading = false;
        $("#search-grid").setAttribute("aria-busy", "false");
        updatePagination();
      }
    }
  }

  async function loadHome() {
    showMessage("");

    try {
      const data = await requestApi(API_URL);

      if (
        !Array.isArray(data.releases) ||
        !Array.isArray(data.recommendations) ||
        !Array.isArray(data.trending)
      ) {
        throw new Error("O catálogo retornou dados inesperados.");
      }

      state.releases = data.releases;
      state.recommendations = data.recommendations;
      state.trending = data.trending;

      renderHome();
      showMessage(data.meta?.avisoTraducao || "");
      showInspector(data.meta?.requisicao);

    } catch (error) {
      console.error(error);

      for (const selector of [
        "#releases-track",
        "#recommendations-track"
      ]) {
        $(selector).innerHTML =
          `<div class="empty-state">${escapeHtml(error.message)}</div>`;
      }

      $("#trending-list").innerHTML =
        "<li>Ranking indisponível.</li>";

      showMessage(
        "Não foi possível carregar os animes. Confira a conexão e tente atualizar a página."
      );
    }
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const loadMoreCharacters = event.target.closest(
        "#characters-load-more"
      );
      if (loadMoreCharacters && !loadMoreCharacters.disabled) {
        const page = state.charactersPage + 1;
        loadCharacters(page, state.characters.length > 0);
        return;
      }

      const card = event.target.closest(".anime-card");

      if (card) {
        const item = findItem(card.dataset.itemId, card.dataset.itemType);
        if (item) openDetails(item, card.dataset.itemType);
      }

      const previous = event.target.closest("[data-scroll]");
      const next = event.target.closest("[data-scroll-next]");

      if (previous || next) {
        const button = previous || next;
        const id = button.dataset.scroll || button.dataset.scrollNext;
        const track = document.getElementById(id);

        if (track) {
          track.scrollBy({
            left: (next ? 1 : -1) *
              Math.max(220, track.clientWidth * .8),
            behavior: "smooth"
          });
        }
      }
    });

    document.addEventListener("keydown", event => {
      if (
        ["Enter", " "].includes(event.key) &&
        event.target.matches(".anime-card")
      ) {
        event.preventDefault();
        event.target.click();
      }
    });

    document.addEventListener("error", event => {
      if (event.target instanceof HTMLImageElement) {
        if (event.target.src !== FALLBACK_IMAGE) {
          event.target.src = FALLBACK_IMAGE;
        }
      }
    }, true);

    $("#anime-search-form").addEventListener("submit", event => {
      event.preventDefault();
      const q = $("#anime-search").value.trim();
      if (q) searchAnime(q, 1);
    });

    $("#clear-search").addEventListener("click", () => {
      state.controller?.abort();
      state.controller = null;
      state.loading = false;
      $("#search-results").hidden = true;
      $("#home-content").hidden = false;
      $("#anime-search").value = "";
    });

    $("#btn-anterior").addEventListener("click", () => {
      if (!state.loading && state.pageInfo.currentPage > 1) {
        searchAnime(state.search.q, state.pageInfo.currentPage - 1);
      }
    });

    $("#btn-proxima").addEventListener("click", () => {
      if (!state.loading && state.pageInfo.hasNextPage) {
        searchAnime(state.search.q, state.pageInfo.currentPage + 1);
      }
    });

    $("#btn-tentar").addEventListener("click", () => {
      searchAnime(state.search.q, state.search.page);
    });

    $("#favorites-toggle").addEventListener("click", () => {
      state.controller?.abort();
      state.controller = null;
      state.loading = false;
      state.favoritesOnly = !state.favoritesOnly;

      $("#favorites-toggle").setAttribute(
        "aria-pressed",
        String(state.favoritesOnly)
      );

      $("#home-content").hidden = false;
      $("#search-results").hidden = true;
      renderHome();

      showMessage(
        state.favoritesOnly
          ? "Mostrando favoritos. Clique no coração novamente para voltar."
          : ""
      );
    });

    $("#explore-button").addEventListener("click", () => {
      $("#releases-track").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });

    $("#dialog-close").addEventListener("click", () => {
      $("#anime-dialog").close();
    });

  }

  function init() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("geekverse-anime-favorites") || "[]"
      );
      state.favorites = new Set(
        Array.isArray(saved) ? saved.map(String) : []
      );
    } catch {
      state.favorites = new Set();
    }

    $("#current-year").textContent = new Date().getFullYear();
    $("#release-year").textContent = new Date().getFullYear();

    bindEvents();
    loadHome();
    loadCharacters();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
