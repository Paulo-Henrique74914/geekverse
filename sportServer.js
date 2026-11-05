const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const productsFile = path.join(__dirname, "produtos.json");

app.disable("x-powered-by");
app.set("query parser", "simple");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/public", express.static(path.join(__dirname, "public")));

axios.defaults.timeout = 8000;

// ======================================
// FUNÇÕES DOS PRODUTOS
// ======================================

async function readProducts() {
  const content = await fs.promises.readFile(productsFile, "utf8");
  return JSON.parse(content);
}

async function writeProducts(products) {
  await fs.promises.writeFile(
    productsFile,
    `${JSON.stringify(products, null, 2)}\n`,
    "utf8"
  );
}

function resolveImagesDir() {
  const candidates = [
    path.join(__dirname, "img"),
    path.join(__dirname, "public", "img")
  ];

  return candidates.find(directory => {
    try {
      return fs.existsSync(directory) &&
        fs.statSync(directory).isDirectory();
    } catch {
      return false;
    }
  }) || null;
}

// ======================================
// RAPIDAPI - FUTEBOL
// ======================================

const apiHeaders = {
  "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
  "X-RapidAPI-Host": process.env.RAPIDAPI_HOST
};

async function buscarEventosRapidApi(dataFiltro) {
  const baseUrl =
    `https://${process.env.RAPIDAPI_HOST}/api/v1/sport/football`;

  try {
    const resposta = await axios.get(
      `${baseUrl}/scheduled-events/${dataFiltro}`,
      { headers: apiHeaders }
    );

    return resposta.data.events || [];

  } catch (error) {
    if (error.response?.status !== 404) throw error;

    console.warn(
      "Endpoint scheduled-events indisponível; usando eventos ao vivo."
    );

    const resposta = await axios.get(
      `${baseUrl}/events/live`,
      { headers: apiHeaders }
    );

    return resposta.data.events || [];
  }
}

app.get("/", (req, res) => {
  res.redirect("/sports.html");
});

app.get("/public/sports.html", (req, res) => {
  res.redirect("/sports.html");
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.get("/api/partidas", async (req, res) => {
  try {
    const dataFiltro =
      req.query.data || new Date().toISOString().split("T")[0];

    if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_HOST) {
      return res.status(500).json({
        erro: "Configure RAPIDAPI_KEY e RAPIDAPI_HOST."
      });
    }

    res.json(await buscarEventosRapidApi(dataFiltro));

  } catch (error) {
    const status = error.response?.status;
    console.error("Erro ao buscar partidas:", status || error.message);

    res.status(502).json({
      erro: status === 401 || status === 403
        ? "A chave da RapidAPI não está autorizada."
        : "Falha ao buscar os jogos na RapidAPI."
    });
  }
});

app.get("/api/jpartida/:id/jogadores", async (req, res) => {
  try {
    const url =
      `https://${process.env.RAPIDAPI_HOST}/api/v1/sport/football/event/${encodeURIComponent(req.params.id)}/lineups`;

    const response = await axios.get(url, {
      headers: apiHeaders
    });

    res.json(response.data);

  } catch (error) {
    console.error(
      `Erro ao buscar jogadores para partida ${req.params.id}:`,
      error.message
    );

    res.status(502).json({
      erro: "Falha ao buscar a escalação."
    });
  }
});

// ======================================
// GALERIA DE IMAGENS
// ======================================

app.get("/imagens", async (req, res) => {
  try {
    const imagesPath = resolveImagesDir();

    if (!imagesPath) {
      return res.status(200).send(
        "<p>Nenhuma imagem encontrada.</p>"
      );
    }

    const files = await fs.promises.readdir(imagesPath);
    const imageFiles = files.filter(
      file => /\.(jpe?g|png|gif|webp|svg)$/i.test(file)
    );

    const items = imageFiles.map(file => {
      const safeName = file.replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);

      return `
        <li class="image-item">
          <figure>
            <img src="/img/${encodeURIComponent(file)}"
              alt="${safeName}" loading="lazy">
            <figcaption>${safeName}</figcaption>
          </figure>
        </li>
      `;
    }).join("");

    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport"
          content="width=device-width,initial-scale=1.0">
        <title>Galeria de Imagens</title>
      </head>
      <body>
        <a href="/sports.html">Voltar para Esportes</a>
        <h1>Galeria de imagens</h1>
        <p>Mostrando ${imageFiles.length} imagem(ns).</p>
        <ul>${items}</ul>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("Erro ao listar imagens:", error.message);
    res.status(500).send("Erro interno ao listar imagens.");
  }
});

app.get("/api/imagens", async (req, res) => {
  try {
    const imagesPath = resolveImagesDir();

    if (!imagesPath) {
      return res.json({ count: 0, images: [] });
    }

    const files = await fs.promises.readdir(imagesPath);

    const images = files
      .filter(file => /\.(jpe?g|png|gif|webp|svg)$/i.test(file))
      .map(file => `/img/${encodeURIComponent(file)}`);

    res.json({
      count: images.length,
      images
    });

  } catch (error) {
    console.error("Erro ao listar imagens:", error.message);
    res.status(500).json({
      erro: "Erro interno ao listar imagens."
    });
  }
});

// ======================================
// API DE PRODUTOS
// ======================================

app.get("/api/products", async (req, res) => {
  try {
    res.json(await readProducts());
  } catch (error) {
    console.error("Erro ao buscar produtos:", error.message);
    res.status(500).json({
      erro: "Não foi possível carregar os produtos."
    });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const {
      title,
      price,
      category,
      image = "",
      description = ""
    } = req.body || {};

    const numericPrice = Number(price);

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof image !== "string" ||
      typeof description !== "string" ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        erro: "Informe nome, preço válido e categoria."
      });
    }

    const products = await readProducts();

    const product = {
      id: products.length
        ? Math.max(...products.map(item => Number(item.id) || 0)) + 1
        : 1,
      title: title.trim(),
      price: numericPrice,
      description: description.trim(),
      category: category.trim(),
      image: image.trim()
    };

    products.push(product);
    await writeProducts(products);

    res.status(201).json(product);

  } catch (error) {
    console.error("Erro ao cadastrar produto:", error.message);
    res.status(500).json({
      erro: "Não foi possível cadastrar o produto."
    });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const products = await readProducts();

    res.json([
      ...new Set(products.map(product => product.category))
    ]);

  } catch (error) {
    console.error("Erro ao buscar categorias:", error.message);
    res.status(500).json({
      erro: "Não foi possível carregar as categorias."
    });
  }
});

app.get("/api/products/category/:category", async (req, res) => {
  try {
    const products = await readProducts();
    const category = req.params.category.toLowerCase();

    res.json(
      products.filter(
        product => product.category.toLowerCase() === category
      )
    );

  } catch (error) {
    console.error("Erro ao buscar categoria:", error.message);
    res.status(500).json({
      erro: "Não foi possível carregar os produtos desta categoria."
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = (await readProducts()).find(
      item => String(item.id) === req.params.id
    );

    if (!product) {
      return res.status(404).json({
        erro: "Produto não encontrado."
      });
    }

    res.json(product);

  } catch (error) {
    console.error("Erro ao buscar produto:", error.message);
    res.status(500).json({
      erro: "Não foi possível carregar este produto."
    });
  }
});

// ======================================
// ANILIST - GRAPHQL
// ======================================

const ANILIST_URL = "https://graphql.anilist.co";
const TRANSLATION_URL =
  "https://translate.googleapis.com/translate_a/single";
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const translationCache = new Map();

const anilistHttp = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

// Consulta fixa: os valores variáveis são enviados separadamente.
const ANIME_CATALOG_QUERY = `
  query GeekVerseAnimePage($seasonYear: Int!) {
    releases: Page(page: 1, perPage: 12) {
      media(
        type: ANIME
        seasonYear: $seasonYear
        sort: POPULARITY_DESC
      ) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        startDate { year }
        seasonYear
        episodes
        averageScore
        format
        description(asHtml: false)
        siteUrl
      }
    }

    recommendations: Page(page: 1, perPage: 12) {
      media(type: ANIME, sort: SCORE_DESC) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        startDate { year }
        seasonYear
        episodes
        averageScore
        format
        description(asHtml: false)
        siteUrl
      }
    }

    trending: Page(page: 1, perPage: 8) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        startDate { year }
        seasonYear
        episodes
        averageScore
        format
        description(asHtml: false)
        siteUrl
      }
    }

  }
`;

const ANIME_SEARCH_QUERY = `
  query BuscarAnimes($search: String!, $page: Int!) {
    Page(page: $page, perPage: 24) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }

      media(
        search: $search
        type: ANIME
        sort: SEARCH_MATCH
      ) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        startDate { year }
        seasonYear
        episodes
        averageScore
        format
        description(asHtml: false)
        siteUrl
      }
    }

    characterSearch: Page(page: $page, perPage: 25) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }
      characters(
        search: $search
        sort: SEARCH_MATCH
      ) {
        id
        name { full }
        image { large }
        favourites
        description(asHtml: false)
      }
    }
  }
`;

const CHARACTERS_QUERY = `
  query GeekVerseCharacters($page: Int!, $search: String) {
    Page(page: $page, perPage: 25) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }
      characters(
        search: $search
        sort: FAVOURITES_DESC
      ) {
        id
        name { full }
        image { large }
        favourites
        description(asHtml: false)
      }
    }
  }
`;

function falhaAniList(status, mensagem) {
  return Object.assign(new Error(mensagem), {
    statusHttp: status
  });
}

async function traduzirTexto(texto) {
  const original = typeof texto === "string" ? texto : "";
  const normalized = original.trim();

  if (!normalized) return original;
  if (translationCache.has(normalized)) {
    return translationCache.get(normalized);
  }

  try {
    const response = GOOGLE_TRANSLATE_API_KEY
      ? await axios.post(
          "https://translation.googleapis.com/language/translate/v2",
          { q: normalized, target: "pt", format: "text" },
          {
            params: { key: GOOGLE_TRANSLATE_API_KEY },
            timeout: 15000
          }
        )
      : await axios.get(TRANSLATION_URL, {
          params: {
            client: "gtx",
            sl: "auto",
            tl: "pt",
            dt: "t",
            q: normalized
          },
          timeout: 15000
        });

    const translated = GOOGLE_TRANSLATE_API_KEY
      ? response.data?.data?.translations?.[0]?.translatedText
      : response.data?.[0]
          ?.map(segment => segment?.[0])
          .filter(segment => typeof segment === "string")
          .join("");

    if (!translated) {
      throw new Error("A resposta do serviço de tradução está vazia.");
    }

    if (translationCache.size >= 1000) {
      translationCache.delete(translationCache.keys().next().value);
    }
    translationCache.set(normalized, translated);
    return translated;
  } catch (error) {
    if (error.statusHttp) throw error;

    const upstreamStatus = error.response?.status;
    console.error(
      "[Tradução para pt-BR]",
      upstreamStatus || error.message
    );

    throw falhaAniList(
      upstreamStatus === 429 ? 503 : 502,
      upstreamStatus === 429
        ? "O serviço de tradução atingiu o limite de consultas. Tente novamente."
        : "Não foi possível traduzir os dados para português."
    );
  }
}

async function traduzirTextos(textos) {
  const resultadosUnicos = new Map();
  const textosUnicos = [...new Set(textos.filter(texto => texto.trim()))];
  let proximo = 0;

  async function processarFila() {
    while (proximo < textosUnicos.length) {
      const texto = textosUnicos[proximo];
      proximo += 1;
      resultadosUnicos.set(texto, await traduzirTexto(texto));
    }
  }

  const quantidadeWorkers = Math.min(4, textosUnicos.length);
  await Promise.all(
    Array.from({ length: quantidadeWorkers }, processarFila)
  );
  return textos.map(texto => resultadosUnicos.get(texto) || texto);
}

async function traduzirMidias(media) {
  const textos = media.flatMap(item => [
    item.title?.english || item.title?.romaji || "",
    item.description || ""
  ]);
  const traducoes = await traduzirTextos(textos);

  return media.map((item, index) => ({
    ...item,
    title: {
      ...item.title,
      portuguese: traducoes[index * 2]
    },
    description: traducoes[index * 2 + 1]
  }));
}

const FORMATOS_PT_BR = {
  TV: "Série de TV",
  TV_SHORT: "Série curta",
  MOVIE: "Filme",
  SPECIAL: "Especial",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Clipe musical",
  MANGA: "Mangá",
  NOVEL: "Novel",
  ONE_SHOT: "One-shot"
};

function traduzirFormato(media) {
  return media.map(item => ({
    ...item,
    format: FORMATOS_PT_BR[item.format] || item.format
  }));
}

async function traduzirPersonagens(characters) {
  const descricoes = await traduzirTextos(
    characters.map(character => character.description || "")
  );

  return characters.map((character, index) => ({
    ...character,
    description: descricoes[index]
  }));
}

function validarBuscaAnime(query) {
  const q = query.q === undefined ? "" : query.q;
  const pageText = query.page === undefined ? "1" : query.page;

  if (typeof q !== "string" || q.length > 80) {
    throw falhaAniList(
      400,
      "O nome do anime deve ter até 80 caracteres."
    );
  }

  if (
    typeof pageText !== "string" ||
    !/^\d+$/.test(pageText)
  ) {
    throw falhaAniList(400, "Página inválida.");
  }

  const page = Number(pageText);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 500
  ) {
    throw falhaAniList(
      400,
      "A página deve estar entre 1 e 500."
    );
  }

  return {
    q: q.trim(),
    page
  };
}

function validarMidias(media) {
  if (!Array.isArray(media)) {
    throw falhaAniList(
      502,
      "A AniList retornou uma lista inválida."
    );
  }

  if (media.some(item =>
    !item ||
    !Number.isInteger(item.id) ||
    !item.title
  )) {
    throw falhaAniList(
      502,
      "A AniList retornou dados de animes inválidos."
    );
  }

  return media;
}

async function normalizarPaginaAnime(page, pagina, paginaPersonagens) {
  if (!pagina || !Array.isArray(pagina.media)) {
    throw falhaAniList(
      502,
      "A AniList retornou dados inesperados."
    );
  }

  const info = pagina.pageInfo;
  const personagens = paginaPersonagens?.characters;
  const infoPersonagens = paginaPersonagens?.pageInfo;

  if (
    !info ||
    !Number.isInteger(info.total) ||
    !Number.isInteger(info.currentPage) ||
    !Number.isInteger(info.lastPage) ||
    typeof info.hasNextPage !== "boolean"
  ) {
    throw falhaAniList(
      502,
      "A AniList retornou paginação inválida."
    );
  }

  if (
    !Array.isArray(personagens) ||
    !infoPersonagens ||
    !Number.isInteger(infoPersonagens.total) ||
    !Number.isInteger(infoPersonagens.currentPage) ||
    !Number.isInteger(infoPersonagens.lastPage) ||
    typeof infoPersonagens.hasNextPage !== "boolean"
  ) {
    throw falhaAniList(
      502,
      "A AniList retornou paginação de personagens inválida."
    );
  }

  if (
    page > 1 &&
    pagina.media.length === 0 &&
    personagens.length === 0 &&
    !info.hasNextPage &&
    !infoPersonagens.hasNextPage
  ) {
    throw falhaAniList(
      404,
      "Página inexistente para esta pesquisa."
    );
  }

  const characters = personagens.map(character => ({
    id: character.id,
    name: character.name?.full || "Personagem",
    image: character.image?.large || "",
    favourites: character.favourites || 0,
    description: character.description || ""
  }));

  if (characters.some(character => !Number.isInteger(character.id))) {
    throw falhaAniList(
      502,
      "A AniList retornou personagens inválidos."
    );
  }

  return {
    results: traduzirFormato(
      await traduzirMidias(validarMidias(pagina.media))
    ),
    characters: await traduzirPersonagens(characters),
    pageInfo: {
      total: info.total + infoPersonagens.total,
      currentPage: info.currentPage,
      lastPage: Math.max(info.lastPage, infoPersonagens.lastPage),
      hasNextPage: info.hasNextPage || infoPersonagens.hasNextPage
    }
  };
}

async function normalizarCatalogo(data) {
  if (!data) {
    throw falhaAniList(
      502,
      "A AniList retornou uma resposta vazia."
    );
  }

  const releases = validarMidias(data.releases?.media);
  const recommendations = validarMidias(
    data.recommendations?.media
  );
  const trending = validarMidias(data.trending?.media);

  const mediaTraduzida = await traduzirMidias([
    ...releases,
    ...recommendations,
    ...trending
  ]);
  const releasesPt = mediaTraduzida.slice(0, releases.length);
  const recommendationsPt = mediaTraduzida.slice(
    releases.length,
    releases.length + recommendations.length
  );
  const trendingPt = mediaTraduzida.slice(
    releases.length + recommendations.length
  );
  return {
    releases: traduzirFormato(releasesPt),
    recommendations: traduzirFormato(recommendationsPt),
    trending: traduzirFormato(trendingPt)
  };
}

app.get("/api/animes", async (req, res) => {
  let requisicao;

  try {
    const { q, page } = validarBuscaAnime(req.query);

    const query = q
      ? ANIME_SEARCH_QUERY
      : ANIME_CATALOG_QUERY;

    const variables = q
      ? { search: q, page }
      : { seasonYear: new Date().getFullYear() };

    requisicao = {
      metodo: "POST",
      url: ANILIST_URL,
      query: query.trim(),
      variables
    };

    const resposta = await anilistHttp.post(
      ANILIST_URL,
      { query, variables }
    );

    if (resposta.data?.errors?.length) {
      console.error(
        "[AniList GraphQL]",
        resposta.data.errors
      );

      throw falhaAniList(
        502,
        "A API GraphQL não conseguiu concluir a consulta."
      );
    }

    const data = resposta.data?.data;

    if (!data) {
      throw falhaAniList(
        502,
        "A AniList retornou uma resposta vazia."
      );
    }

    if (q) {
      const resultado = await normalizarPaginaAnime(
        page,
        data.Page,
        data.characterSearch
      );

      return res.json({
        ...resultado,
        meta: { requisicao }
      });
    }

    const catalogo = await normalizarCatalogo(data);

    return res.json({
      ...catalogo,
      meta: { requisicao }
    });

  } catch (erro) {
    const upstreamStatus = erro.response?.status;

    console.error(
      "[GeekVerse AniList]",
      upstreamStatus || erro.message
    );

    const timeout = [
      "ECONNABORTED",
      "ETIMEDOUT"
    ].includes(erro.code);

    const status = erro.statusHttp ||
      (upstreamStatus === 429
        ? 429
        : timeout
          ? 504
          : 502);

    const mensagem = erro.statusHttp
      ? erro.message
      : status === 429
        ? "Limite de consultas da AniList atingido. Tente novamente."
        : timeout
          ? "A AniList demorou para responder. Tente novamente."
          : "Não foi possível consultar a AniList.";

    return res.status(status).json({
      erro: mensagem,
      requisicao
    });
  }
});

app.get("/api/personagens", async (req, res) => {
  let requisicao;

  try {
    const pageText = req.query.page === undefined ? "1" : req.query.page;
    const search = req.query.q === undefined ? "" : req.query.q;

    if (
      typeof pageText !== "string" ||
      !/^\d+$/.test(pageText) ||
      !Number.isSafeInteger(Number(pageText)) ||
      Number(pageText) < 1 ||
      Number(pageText) > 2147483647
    ) {
      throw falhaAniList(400, "Página de personagens inválida.");
    }

    if (typeof search !== "string" || search.length > 80) {
      throw falhaAniList(
        400,
        "A busca por personagem deve ter até 80 caracteres."
      );
    }

    const page = Number(pageText);
    const variables = {
      page,
      search: search.trim() || null
    };

    requisicao = {
      metodo: "POST",
      url: ANILIST_URL,
      query: CHARACTERS_QUERY.trim(),
      variables
    };

    const resposta = await anilistHttp.post(
      ANILIST_URL,
      { query: CHARACTERS_QUERY, variables }
    );

    if (resposta.data?.errors?.length) {
      console.error(
        "[AniList GraphQL - catálogo de personagens]",
        resposta.data.errors
      );
      throw falhaAniList(
        502,
        "A AniList não conseguiu carregar os personagens."
      );
    }

    const pagina = resposta.data?.data?.Page;
    const characters = pagina?.characters;
    const info = pagina?.pageInfo;

    if (
      !Array.isArray(characters) ||
      !info ||
      !Number.isInteger(info.total) ||
      !Number.isInteger(info.currentPage) ||
      !Number.isInteger(info.lastPage) ||
      typeof info.hasNextPage !== "boolean"
    ) {
      throw falhaAniList(
        502,
        "A AniList retornou dados ou paginação de personagens inválidos."
      );
    }

    const results = characters.map(character => ({
      id: character.id,
      name: character.name?.full || "Personagem",
      image: character.image?.large || "",
      favourites: character.favourites || 0,
      description: character.description || ""
    }));

    if (results.some(character => !Number.isInteger(character.id))) {
      throw falhaAniList(
        502,
        "A AniList retornou personagens inválidos."
      );
    }

    return res.json({
      results: await traduzirPersonagens(results),
      pageInfo: {
        total: info.total,
        currentPage: info.currentPage,
        lastPage: info.lastPage,
        hasNextPage: info.hasNextPage
      },
      meta: { requisicao }
    });
  } catch (erro) {
    const upstreamStatus = erro.response?.status;
    console.error(
      "[GeekVerse AniList - catálogo de personagens]",
      upstreamStatus || erro.message
    );

    const timeout = ["ECONNABORTED", "ETIMEDOUT"].includes(erro.code);
    const status = erro.statusHttp ||
      (upstreamStatus === 429 ? 429 : timeout ? 504 : 502);
    const mensagem = erro.statusHttp
      ? erro.message
      : status === 429
        ? "Limite de consultas da AniList atingido. Tente novamente."
        : timeout
          ? "A AniList demorou para responder. Tente novamente."
          : "Não foi possível carregar os personagens.";

    return res.status(status).json({ erro: mensagem, requisicao });
  }
});

// ======================================
// ROTAS NÃO ENCONTRADAS
// ======================================

app.use("/api", (req, res) => {
  res.status(404).json({
    erro: "Rota da API não encontrada."
  });
});

// Mantenha esta rota por último.
app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ======================================
// INICIAR SERVIDOR
// ======================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `GeekVerse rodando em http://localhost:${PORT}`
    );
  });
}

module.exports = app;
