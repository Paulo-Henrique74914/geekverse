const menuToggle = document.getElementById('menu-toggle');
const siteNav = document.getElementById('site-nav');
const gridJogos = document.getElementById('grid-jogos');
const statusApi = document.getElementById('status-api');
const inputData = document.getElementById('data-jogo');
const btnBuscar = document.getElementById('btn-buscar');

function buscarJogos(dataEscolhida) {
    statusApi.innerText = "⏳ Carregando jogos...";
    statusApi.style.color = "#FFA000";
    gridJogos.innerHTML = "";
    const urlLocal = `/api/partidas?data=${dataEscolhida}`;
    fetch(urlLocal)
        .then(resposta => resposta.json())
        .then(listaDeJogos => {
            statusApi.innerText = "🟢 Conectado ao Servidor";
            statusApi.style.color = "#00E676";
            console.log("JSON LIDO:", listaDeJogos);
            if (listaDeJogos.erro) {
                gridJogos.innerHTML = `<p style="color: #FF1744;">Erro do Servidor: ${listaDeJogos.erro}. Olhe o terminal do Node!</p>`;
                return;
            }
            if (!Array.isArray(listaDeJogos)) {
                gridJogos.innerHTML = `<p style="color: #FFA000;">A API retornou dados num formato inesperado.</p>`;
                return;
            }
            if (listaDeJogos.length === 0) {
                gridJogos.innerHTML = "<p>Nenhum jogo encontrado para esta data.</p>";
                return;
            }
            listaDeJogos.forEach(jogo => {
                const timeCasa = jogo.homeTeam?.name || "Time Casa";
                const timeFora = jogo.awayTeam?.name || "Time Fora";
                const placarCasa = jogo.homeScore?.current || 0;
                const placarFora = jogo.awayScore?.current || 0;
                const campeonato = jogo.tournament?.name || "Campeonato";
                const statusJogo = jogo.status?.description || "Finalizado";
                
                const cartaoHTML = `
                    <div class="cartao-jogo">
                        <div class="campeonato">${campeonato}</div>
                        <div class="placar">
                            <span class="time">${timeCasa}</span>
                            <span class="gols">${placarCasa} - ${placarFora}</span>
                            <span class="time">${timeFora}</span>
                        </div>
                        <div class="tempo">${statusJogo}</div>
                    </div>
                `;
                gridJogos.innerHTML += cartaoHTML;
            });
        })
        .catch(erro => {
            console.error("Erro no Front-End:", erro);
            statusApi.innerText = "🔴 Erro ao buscar jogos.";
            statusApi.style.color = "#FF1744";
        });
}

btnBuscar.addEventListener('click', () => {
    const dataSelecionada = inputData.value;
    if(dataSelecionada) {
        buscarJogos(dataSelecionada);
    } else {
        alert("Por favor, selecione uma data.");
    }
});

window.addEventListener('load', () => {
    const hoje = new Date().toISOString().split('T')[0];
    inputData.value = hoje;
    buscarJogos(hoje);
});

if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
        const aberto = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', String(!aberto));
        siteNav.classList.toggle('active');
    });

    siteNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                menuToggle.setAttribute('aria-expanded', 'false');
                siteNav.classList.remove('active');
            }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && siteNav.classList.contains('active')) {
            menuToggle.setAttribute('aria-expanded', 'false');
            siteNav.classList.remove('active');
        }
    });
}
