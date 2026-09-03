/* =====================================================
   GEEKVERSE STORE
   API UTILIZADA:

   GET  /api/products
   POST /api/products

   NÃO É NECESSÁRIO ALTERAR O SERVER.JS
===================================================== */


/* =====================================================
   ELEMENTOS
===================================================== */

const produtosContainer =
    document.querySelector("#produtos");

const btnCarrinho =
    document.querySelector("#btnCarrinho");

const fecharCarrinho =
    document.querySelector("#fecharCarrinho");

const painelCarrinho =
    document.querySelector("#painelCarrinho");

const overlay =
    document.querySelector("#overlay");

const statusLoja =
    document.querySelector("#status");

const itensCarrinhoContainer =
    document.querySelector("#itensCarrinho");

const contadorCarrinho =
    document.querySelector("#contadorCarrinho");

const subtotalCarrinho =
    document.querySelector("#subtotalCarrinho");

const totalCarrinho =
    document.querySelector("#totalCarrinho");

const finalizarCompraBtn =
    document.querySelector("#finalizarCompra");

const limparCarrinhoBtn =
    document.querySelector("#limparCarrinho");

const busca =
    document.querySelector("#busca");

const limparBusca =
    document.querySelector("#limparBusca");

const ordenacao =
    document.querySelector("#ordenacao");

const filtroCategorias =
    document.querySelector("#filtroCategorias");

const resultadoBusca =
    document.querySelector("#resultadoBusca");

const vazio =
    document.querySelector("#vazio");

const formProduto =
    document.querySelector("#form-produto");

const painelAdmin =
    document.querySelector("#painel-admin");


/* =====================================================
   VARIÁVEIS
===================================================== */

let produtosAtuais = [];

let carrinho =
    JSON.parse(
        localStorage.getItem(
            "carrinhoFakeStore"
        )
    ) || [];

let categoriaAtiva = "all";

let faixaPreco = "todos";

let termoBusca = "";

let cupomAtivo = false;


/* =====================================================
   MOEDA
===================================================== */

function formatarMoeda(valor) {

    return Number(valor || 0)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}


/* =====================================================
   TRADUZIR CATEGORIA
===================================================== */

function traduzirCategoria(categoria = "") {

    const traducoes = {

        "electronics":
            "Eletrônicos",

        "eletronics":
            "Eletrônicos",

        "jewelery":
            "Joias",

        "jewelry":
            "Joias",

        "men's clothing":
            "Roupas Masculinas",

        "women's clothing":
            "Roupas Femininas"
    };


    return (
        traducoes[
            categoria.toLowerCase()
        ] || categoria
    );
}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHTML(texto) {

    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


const IMAGEM_PADRAO = "/img/placeholder.svg";


function normalizarImagem(imagem) {

    const valor = String(imagem ?? "").trim();


    if (!valor) {
        return IMAGEM_PADRAO;
    }


    if (/^(https?:|data:|blob:)/i.test(valor)) {
        return valor;
    }


    const caminho = valor
        .replace(/\\/g, "/")
        .replace(/^\.?\//, "")
        .replace(/^public\/(?:images|img)\//i, "img/")
        .replace(/^images\//i, "img/");


    if (!caminho.startsWith("img/")) {
        return IMAGEM_PADRAO;
    }


    return `/${caminho
        .split("/")
        .map(parte => encodeURIComponent(parte))
        .join("/")}`;
}


/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function normalizar(texto) {

    return String(texto)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}


/* =====================================================
   FILTRAR PRODUTOS
===================================================== */

function produtoFiltrado(produto) {

    const titulo =
        normalizar(produto.title);

    const categoria =
        normalizar(produto.category);

    const termo =
        normalizar(termoBusca);


    /* BUSCA */

    const buscaOK =
        !termo ||
        titulo.includes(termo) ||
        categoria.includes(termo);


    /* CATEGORIA */

    const categoriaOK =
        categoriaAtiva === "all" ||
        categoria ===
        normalizar(categoriaAtiva);


    /* PREÇO */

    const preco =
        Number(produto.price) || 0;

    let precoOK = true;


    if (faixaPreco === "0-100") {

        precoOK =
            preco <= 100;
    }


    if (faixaPreco === "100-250") {

        precoOK =
            preco > 100 &&
            preco <= 250;
    }


    if (faixaPreco === "250-500") {

        precoOK =
            preco > 250 &&
            preco <= 500;
    }


    if (faixaPreco === "500+") {

        precoOK =
            preco > 500;
    }


    return (
        buscaOK &&
        categoriaOK &&
        precoOK
    );
}


/* =====================================================
   ORDENAÇÃO
===================================================== */

function ordenarProdutos(lista) {

    const copia = [...lista];


    switch (ordenacao.value) {

        case "menor":

            return copia.sort(
                (a, b) =>
                    Number(a.price) -
                    Number(b.price)
            );


        case "maior":

            return copia.sort(
                (a, b) =>
                    Number(b.price) -
                    Number(a.price)
            );


        case "az":

            return copia.sort(
                (a, b) =>
                    a.title.localeCompare(
                        b.title,
                        "pt-BR"
                    )
            );


        default:

            return copia;
    }
}


/* =====================================================
   CATEGORIAS
===================================================== */

function construirCategorias() {

    const categorias =
        [
            ...new Set(
                produtosAtuais
                    .map(
                        produto =>
                            produto.category
                    )
                    .filter(Boolean)
            )
        ];


    filtroCategorias.innerHTML = `

        <label
            class="${
                categoriaAtiva === "all"
                    ? "ativo"
                    : ""
            }"
        >

            <input
                type="radio"
                name="categoria"
                value="all"

                ${
                    categoriaAtiva === "all"
                        ? "checked"
                        : ""
                }
            >

            Todos

        </label>


        ${
            categorias
                .map(categoria => `

                    <label
                        class="${
                            normalizar(
                                categoria
                            ) ===
                            normalizar(
                                categoriaAtiva
                            )
                                ? "ativo"
                                : ""
                        }"
                    >

                        <input
                            type="radio"
                            name="categoria"

                            value="${escaparHTML(
                                categoria
                            )}"

                            ${
                                normalizar(
                                    categoria
                                ) ===
                                normalizar(
                                    categoriaAtiva
                                )
                                    ? "checked"
                                    : ""
                            }
                        >

                        ${escaparHTML(
                            traduzirCategoria(
                                categoria
                            )
                        )}

                    </label>

                `)
                .join("")
        }

    `;


    filtroCategorias
        .querySelectorAll(
            "input"
        )
        .forEach(input => {

            input.addEventListener(
                "change",
                () => {

                    categoriaAtiva =
                        input.value;

                    construirCategorias();

                    renderizarProdutos();
                }
            );

        });
}


/* =====================================================
   CRIAR CARD
===================================================== */

function criarCard(produto) {

    return `

        <article class="card-produto">

            <img

                class="imagem-produto"

                src="${
                    escaparHTML(
                        normalizarImagem(
                            produto.image
                        )
                    )
                }"

                alt="${escaparHTML(
                    produto.title
                )}"

                loading="lazy"

                onerror="
                    this.onerror=null;
                    this.src='/img/placeholder.svg';
                "
            >


            <div class="info-produto">

                <div
                    class="categoria-produto"
                >
                    ${escaparHTML(
                        traduzirCategoria(
                            produto.category
                        )
                    )}
                </div>


                <h3
                    class="nome-produto"
                    title="${escaparHTML(
                        produto.title
                    )}"
                >
                    ${escaparHTML(
                        produto.title
                    )}
                </h3>


                <div
                    class="rodape-produto"
                >

                    <strong
                        class="preco-produto"
                    >
                        ${formatarMoeda(
                            produto.price
                        )}
                    </strong>


                    <button

                        class="btn-adicionar"

                        type="button"

                        data-id="${
                            Number(produto.id)
                        }"

                        aria-label="
                            Adicionar produto
                        "
                    >
                        +
                    </button>

                </div>

            </div>

        </article>

    `;
}


/* =====================================================
   RENDERIZAR PRODUTOS
===================================================== */

function renderizarProdutos() {

    const filtrados =
        ordenarProdutos(
            produtosAtuais.filter(
                produtoFiltrado
            )
        );


    resultadoBusca.textContent =
        termoBusca
            ? `${filtrados.length} produto(s) encontrado(s).`
            : "";


    if (!filtrados.length) {

        produtosContainer.innerHTML = "";

        vazio.hidden = false;

        return;
    }


    vazio.hidden = true;


    /*

        Cada categoria vira
        um carrossel separado.

    */

    const grupos =
        new Map();


    filtrados.forEach(
        produto => {

            const categoria =
                produto.category ||
                "Outros";


            if (
                !grupos.has(
                    categoria
                )
            ) {

                grupos.set(
                    categoria,
                    []
                );
            }


            grupos
                .get(categoria)
                .push(produto);
        }
    );


    produtosContainer.innerHTML =
        [...grupos.entries()]
            .map(
                (
                    [
                        categoria,
                        produtos
                    ]
                ) => `

                    <section
                        class="secao-produtos"
                    >

                        <h2>
                            ${escaparHTML(
                                traduzirCategoria(
                                    categoria
                                )
                            )}
                        </h2>


                        <div
                            class="area-carrossel"
                        >


                            <button
                                class="
                                    seta-carrossel
                                    esquerda
                                "

                                type="button"

                                aria-label="
                                    Produtos anteriores
                                "
                            >
                                ‹
                            </button>


                            <div
                                class="
                                    lista-produtos
                                "
                            >

                                ${
                                    produtos
                                        .map(
                                            criarCard
                                        )
                                        .join("")
                                }

                            </div>


                            <button
                                class="
                                    seta-carrossel
                                    direita
                                "

                                type="button"

                                aria-label="
                                    Próximos produtos
                                "
                            >
                                ›
                            </button>


                        </div>

                    </section>

                `
            )
            .join("");


    /* =================================================
       CONFIGURAR CADA CARROSSEL
    ================================================= */

    produtosContainer
        .querySelectorAll(
            ".secao-produtos"
        )
        .forEach(secao => {

            const lista =
                secao.querySelector(
                    ".lista-produtos"
                );


            const esquerda =
                secao.querySelector(
                    ".esquerda"
                );


            const direita =
                secao.querySelector(
                    ".direita"
                );


            function atualizarSetas() {

                esquerda.disabled =
                    lista.scrollLeft <= 5;


                direita.disabled =
                    lista.scrollLeft +
                    lista.clientWidth >=
                    lista.scrollWidth - 5;
            }


            esquerda.addEventListener(
                "click",
                () => {

                    lista.scrollBy({

                        left:
                            -lista.clientWidth *
                            .8,

                        behavior:
                            "smooth"
                    });
                }
            );


            direita.addEventListener(
                "click",
                () => {

                    lista.scrollBy({

                        left:
                            lista.clientWidth *
                            .8,

                        behavior:
                            "smooth"
                    });
                }
            );


            lista.addEventListener(
                "scroll",
                atualizarSetas
            );


            atualizarSetas();

        });


    /* =================================================
       BOTÕES DE ADICIONAR
    ================================================= */

    produtosContainer
        .querySelectorAll(
            ".btn-adicionar"
        )
        .forEach(botao => {

            botao.addEventListener(
                "click",
                () => {

                    adicionarAoCarrinho(
                        Number(
                            botao.dataset.id
                        )
                    );

                }
            );

        });
}


/* =====================================================
   ADICIONAR AO CARRINHO
===================================================== */

function adicionarAoCarrinho(id) {

    const produto =
        produtosAtuais.find(
            item =>
                Number(item.id) === id
        );


    if (!produto)
        return;


    const item =
        carrinho.find(
            produtoCarrinho =>
                Number(
                    produtoCarrinho.id
                ) === id
        );


    if (item) {

        item.quantidade += 1;

    } else {

        carrinho.push({

            ...produto,

            quantidade: 1

        });

    }


    atualizarCarrinho();

    mostrarToast(
        "Produto adicionado ao carrinho."
    );
}


/* =====================================================
   ALTERAR QUANTIDADE
===================================================== */

function alterarQuantidade(
    id,
    quantidade
) {

    const item =
        carrinho.find(
            produto =>
                Number(produto.id) === id
        );


    if (!item)
        return;


    item.quantidade += quantidade;


    if (item.quantidade <= 0) {

        carrinho =
            carrinho.filter(
                produto =>
                    Number(produto.id) !== id
            );
    }


    atualizarCarrinho();
}


/* =====================================================
   REMOVER
===================================================== */

function removerItem(id) {

    carrinho =
        carrinho.filter(
            produto =>
                Number(produto.id) !== id
        );


    atualizarCarrinho();
}


/* =====================================================
   ATUALIZAR CARRINHO
===================================================== */

function atualizarCarrinho() {

    const quantidade =
        carrinho.reduce(
            (total, item) =>
                total +
                Number(
                    item.quantidade
                ),
            0
        );


    const subtotal =
        carrinho.reduce(
            (total, item) =>
                total +
                (
                    Number(item.price) *
                    Number(item.quantidade)
                ),
            0
        );


    const desconto =
        cupomAtivo
            ? subtotal * .10
            : 0;


    const total =
        subtotal - desconto;


    contadorCarrinho.textContent =
        quantidade;


    subtotalCarrinho.textContent =
        formatarMoeda(
            subtotal
        );


    totalCarrinho.textContent =
        formatarMoeda(
            total
        );


    /* =========================
       CARRINHO VAZIO
    ========================== */

    if (!carrinho.length) {

        itensCarrinhoContainer.innerHTML = `

            <div
                class="carrinho-vazio"
            >

                <div>

                    <strong>
                        SEU CARRINHO ESTÁ VAZIO
                    </strong>

                    <span>
                        Adicione produtos para
                        começar sua compra.
                    </span>

                </div>

            </div>

        `;

    }


    /* =========================
       PRODUTOS
    ========================== */

    else {

        itensCarrinhoContainer.innerHTML =

            carrinho
                .map(
                    item => `

                        <div
                            class="
                                item-carrinho
                            "
                        >

                            <img

                                src="${
                                    escaparHTML(
                                        normalizarImagem(
                                            item.image
                                        )
                                    )
                                }"

                                alt="${escaparHTML(
                                    item.title
                                )}"

                                onerror="
                                    this.onerror=null;
                                    this.src='/img/placeholder.svg';
                                "
                            >


                            <div>

                                <div
                                    class="
                                        item-titulo
                                    "
                                >
                                    ${escaparHTML(
                                        item.title
                                    )}
                                </div>


                                <div
                                    class="
                                        item-preco
                                    "
                                >
                                    ${formatarMoeda(
                                        item.price
                                    )}
                                </div>


                                <div
                                    class="
                                        controle-quantidade
                                    "
                                >

                                    <button
                                        data-acao="menos"
                                        data-id="${
                                            Number(item.id)
                                        }"
                                    >
                                        −
                                    </button>


                                    <span>
                                        ${
                                            Number(
                                                item.quantidade
                                            )
                                        }
                                    </span>


                                    <button
                                        data-acao="mais"
                                        data-id="${
                                            Number(item.id)
                                        }"
                                    >
                                        +
                                    </button>

                                </div>

                            </div>


                            <button

                                class="
                                    remover-item
                                "

                                data-acao="remover"

                                data-id="${
                                    Number(item.id)
                                }"

                                aria-label="
                                    Remover produto
                                "
                            >
                                ×
                            </button>

                        </div>

                    `
                )
                .join("");


        /* BOTÕES */

        itensCarrinhoContainer
            .querySelectorAll(
                "[data-acao]"
            )
            .forEach(botao => {

                const id =
                    Number(
                        botao.dataset.id
                    );


                if (
                    botao.dataset.acao ===
                    "mais"
                ) {

                    botao.addEventListener(
                        "click",
                        () =>
                            alterarQuantidade(
                                id,
                                1
                            )
                    );
                }


                if (
                    botao.dataset.acao ===
                    "menos"
                ) {

                    botao.addEventListener(
                        "click",
                        () =>
                            alterarQuantidade(
                                id,
                                -1
                            )
                    );
                }


                if (
                    botao.dataset.acao ===
                    "remover"
                ) {

                    botao.addEventListener(
                        "click",
                        () =>
                            removerItem(id)
                    );
                }

            });

    }


    /* SALVAR */

    localStorage.setItem(

        "carrinhoFakeStore",

        JSON.stringify(
            carrinho
        )
    );
}


/* =====================================================
   ABRIR CARRINHO
===================================================== */

function abrirCarrinho() {

    painelCarrinho
        .classList
        .add("aberto");


    overlay
        .classList
        .add("aberto");


    document.body.style.overflow =
        "hidden";
}


/* =====================================================
   FECHAR CARRINHO
===================================================== */

function fecharPainelCarrinho() {

    painelCarrinho
        .classList
        .remove("aberto");


    overlay
        .classList
        .remove("aberto");


    document.body.style.overflow =
        "";
}


/* =====================================================
   TOAST
===================================================== */

function mostrarToast(mensagem) {

    const toast =
        document.querySelector(
            "#toast"
        );


    toast.textContent =
        mensagem;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        mostrarToast.timer
    );


    mostrarToast.timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            1800
        );
}


/* =====================================================
   CARREGAR PRODUTOS
===================================================== */

async function carregarProdutos() {

    statusLoja.textContent =
        "Carregando produtos...";


    try {

        /*
            ESTA É A PARTE QUE
            CONTINUA USANDO SUA API.
        */

        const resposta =
            await fetch(
                "/api/products"
            );


        if (!resposta.ok) {

            throw new Error(
                "Falha ao carregar produtos."
            );
        }


        produtosAtuais =
            await resposta.json();


        construirCategorias();

        renderizarProdutos();


        statusLoja.textContent =
            `${produtosAtuais.length}
             produto(s) carregado(s).`;

    }


    catch (erro) {

        console.error(
            erro
        );


        statusLoja.textContent =
            "Não foi possível carregar os produtos.";

    }
}


/* =====================================================
   CADASTRAR PRODUTO
===================================================== */

formProduto?.addEventListener(
    "submit",
    async evento => {

        evento.preventDefault();


        const dados = {

            title:
                document.querySelector(
                    "#novo-titulo"
                ).value.trim(),

            price:
                Number(
                    document.querySelector(
                        "#novo-preco"
                    ).value
                ),

            category:
                document.querySelector(
                    "#novo-categoria"
                ).value.trim(),

            image:
                document.querySelector(
                    "#novo-imagem"
                ).value.trim(),

            description:
                "Produto cadastrado na GeekVerse."

        };


        try {

            /*
                ESTA PARTE CONTINUA
                USANDO SUA API POST.
            */

            const resposta =
                await fetch(
                    "/api/products",
                    {

                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                dados
                            )
                    }
                );


            const produto =
                await resposta.json();


            if (!resposta.ok) {

                throw new Error(
                    produto.erro ||
                    "Falha ao cadastrar produto."
                );
            }


            formProduto.reset();


            await carregarProdutos();


            mostrarToast(
                "Produto cadastrado com sucesso."
            );

        }


        catch (erro) {

            console.error(
                erro
            );

            mostrarToast(
                erro.message
            );
        }

    }
);


/* =====================================================
   EVENTOS
===================================================== */

btnCarrinho?.addEventListener(
    "click",
    abrirCarrinho
);


fecharCarrinho?.addEventListener(
    "click",
    fecharPainelCarrinho
);


overlay?.addEventListener(
    "click",
    fecharPainelCarrinho
);


document.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key === "Escape"
        ) {

            fecharPainelCarrinho();

        }

    }
);


/* =====================================================
   PESQUISA
===================================================== */

busca?.addEventListener(
    "input",
    () => {

        termoBusca =
            busca.value.trim();


        limparBusca.style.display =
            termoBusca
                ? "block"
                : "none";


        renderizarProdutos();

    }
);


limparBusca?.addEventListener(
    "click",
    () => {

        busca.value = "";

        termoBusca = "";

        limparBusca.style.display =
            "none";

        renderizarProdutos();

        busca.focus();

    }
);


/* =====================================================
   ORDENAÇÃO
===================================================== */

ordenacao?.addEventListener(
    "change",
    renderizarProdutos
);


/* =====================================================
   FILTRO DE PREÇO
===================================================== */

document
    .querySelectorAll(
        'input[name="preco"]'
    )
    .forEach(input => {

        input.addEventListener(
            "change",
            () => {

                faixaPreco =
                    input.value;

                renderizarProdutos();

            }
        );

    });


/* =====================================================
   CUPOM
===================================================== */

document
    .querySelector(
        "#aplicarCupom"
    )
    ?.addEventListener(
        "click",
        () => {

            const cupom =
                document.querySelector(
                    "#cupom"
                ).value
                .trim()
                .toUpperCase();


            if (
                cupom ===
                "GEEK10"
            ) {

                cupomAtivo =
                    true;


                atualizarCarrinho();


                mostrarToast(
                    "Cupom aplicado: 10% de desconto."
                );

            }

            else {

                cupomAtivo =
                    false;


                atualizarCarrinho();


                mostrarToast(
                    "Cupom inválido."
                );
            }

        }
    );


/* =====================================================
   LIMPAR CARRINHO
===================================================== */

limparCarrinhoBtn?.addEventListener(
    "click",
    () => {

        carrinho = [];

        cupomAtivo = false;

        atualizarCarrinho();

        mostrarToast(
            "Carrinho limpo."
        );

    }
);


/* =====================================================
   FINALIZAR COMPRA
===================================================== */

finalizarCompraBtn?.addEventListener(
    "click",
    () => {

        if (!carrinho.length) {

            mostrarToast(
                "Seu carrinho está vazio."
            );

            return;
        }


        /*
            CHECKOUT DEMONSTRATIVO.
            Não realiza pagamento real.
        */

        mostrarToast(
            "Compra finalizada!"
        );


        carrinho = [];

        cupomAtivo = false;

        atualizarCarrinho();

    }
);


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

atualizarCarrinho();

carregarProdutos();