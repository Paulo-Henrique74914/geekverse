const inputCidade = document.getElementById('input-cidade');
const btnBuscar = document.getElementById('btn-buscar');
const nomeCidade = document.getElementById('nome-cidade');
const valorTemp = document.getElementById('valor-temp');
const descricaoClima = document.getElementById('descricao-clima');
const valorUmidade = document.getElementById('valor-umidade');
const valorVento = document.getElementById('valor-vento');
const iconeClima = document.getElementById('icone-clima');
const apiKey = '62dccea98e551525c831c6dcec5d1346';

function buscarClima(cidade) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${apiKey}&units=metric&lang=pt`;
    nomeCidade.innerHTML ="Procurando a cidade...";
    
    fetch(url)
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error('Cidade não encontrada');
            }
            return resposta.json();
        })
        .then(dados => {
            mostrarNaTela(dados);
        })
        .catch(erro => {
            console.error(erro);
            nomeCidade.innerText = "Cidade não encontrada 😥";
            valorTemp.innerText = "--";
            descricaoClima.innerText = "Tente digitar novamente.";
        });
}

function mostrarNaTela(dados) {
    nomeCidade.innerText = dados.name;
    valorTemp.innerText = Math.round(dados.main.temp);
    descricaoClima.innerText = dados.weather[0].description;
    valorUmidade.innerText = `${dados.main.humidity}%`;
    let ventoKmH = Math.round(dados.wind.speed * 3.6);
    valorVento.innerText = `${ventoKmH} km/h`;
    
    const estado = dados.weather[0].main.toLowerCase();
    if(estado === 'clear'){
        iconeClima.innerText = '☀️';
    } else if(estado === 'clouds'){
        iconeClima.innerText = '☁️';
    } else if(estado === 'rain' || estado === 'drizzle'){
        iconeClima.innerText = '🌧️';
    } else if (estado === 'thunderstorm'){
        iconeClima.innerText = '⛈️';
    } else if (estado === 'snow'){
        iconeClima.innerText = '❄️';
    } else {
        iconeClima.innerText = '🌈';
    }
}

btnBuscar.addEventListener('click', () => {
    const cidadeDigitada = inputCidade.value;
    if (cidadeDigitada.trim() !== '') {
        buscarClima(cidadeDigitada);
    }
});

inputCidade.addEventListener('keypress', (evento) => {   
    if (evento.key === 'Enter') {
        const cidadeDigitada = inputCidade.value;
        if (cidadeDigitada.trim() !== '') {
            buscarClima(cidadeDigitada);
        }
    }
});