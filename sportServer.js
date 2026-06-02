const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/imagens', async (req, res) => {
  try {
    const imagesPath = path.join(__dirname, 'img');
    const files = await fs.promises.readdir(imagesPath);
    const imageFiles = files.filter(file => /\.(jpe?g|png|gif|webp|svg)$/i.test(file));
    const items = imageFiles.map(file => {
      const encodedSrc = encodeURI(`/img/${file}`);
      return `
        <li class="image-item">
          <figure>
            <img src="${encodedSrc}" alt="${file}" loading="lazy">
            <figcaption>${file}</figcaption>
          </figure>
        </li>`;
    }).join('');

    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Galeria de Imagens</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f1f5f9; color: #1f2937; margin: 0; padding: 20px; }
    h1 { margin-bottom: 16px; }
    .gallery-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; list-style: none; padding: 0; margin: 0; }
    .image-item { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); }
    figure { margin: 0; }
    img { width: 100%; height: 220px; object-fit: cover; display: block; }
    figcaption { padding: 12px; font-size: 14px; text-align: center; background: #f8fafc; }
    .back-link { display: inline-block; margin-bottom: 20px; color: #0f766e; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <a href="/sports.html" class="back-link">← Voltar para Esportes</a>
  <h1>Galeria de imagens</h1>
  <p>Mostrando ${imageFiles.length} imagem(ns) carregadas do servidor.</p>
  <ul class="gallery-list">${items}</ul>
</body>
</html>`);
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    res.status(500).send('Erro interno ao listar imagens.');
  }
});

app.get('/', (req, res) => {
  res.redirect('/sports.html');
});

app.get('/public/sports.html', (req, res) => {
  res.redirect('/sports.html');
});

const apiHeaders = {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
};

app.get('/api/partidas', async (req, res) => {
  try {
    const dataFiltro = req.query.data || new Date().toISOString().split('T')[0];
    const url = `https://sportapi7.p.rapidapi.com/api/v1/sport/football/scheduled-events/${dataFiltro}`;
    const response = await axios.get(url, { headers: apiHeaders });
    const data = response.data;
    res.json(data.events || []);
  } catch (error) {
    console.error('⚠️ ERRO NO SERVIDOR:', error.response ? error.response.data : error.message);
    res.status(500).json({ erro: 'Falha ao buscar os jogos na RapidAPI.' });
  }
});

app.get('/api/jpartida/:id/jogadores', async (req, res) => {
  try {
    const eventId = req.params.id;
    const url = `https://sportapi7.p.rapidapi.com/api/v1/sport/football/event/${eventId}/lineups`;
    const response = await axios.get(url, { headers: apiHeaders });
    res.json(response.data);
  } catch (error) {
    console.error(`! Erro ao buscar jogadores para partida ${req.params.id}:`, error.message);
    res.status(500).json({ erro: 'Falha ao buscar a escalação.' });
  }
});

app.listen(PORT, () => {
  console.log(`⚽ Sport360 rodando em http://localhost:${PORT}`);
});

// Rota que retorna a lista de imagens em JSON
app.get('/api/imagens', async (req, res) => {
  try {
    const imagesPath = path.join(__dirname, 'img');
    const files = await fs.promises.readdir(imagesPath);
    const imageFiles = files.filter(file => /\.(jpe?g|png|gif|webp|svg)$/i.test(file));
    const urls = imageFiles.map(file => `/img/${encodeURIComponent(file)}`);
    res.json({ count: urls.length, images: urls });
  } catch (error) {
    console.error('Erro ao listar imagens (API):', error);
    res.status(500).json({ erro: 'Erro interno ao listar imagens.' });
  }
});