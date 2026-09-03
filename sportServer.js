const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const productsFile = path.join(__dirname, 'produtos.json');

axios.defaults.timeout = 8000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/public', express.static(path.join(__dirname, 'public')));

async function readProducts() {
  const content = await fs.promises.readFile(productsFile, 'utf8');
  return JSON.parse(content);
}

async function writeProducts(products) {
  await fs.promises.writeFile(productsFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
}

function resolveImagesDir() {
  const candidates = [path.join(__dirname, 'img'), path.join(__dirname, 'public', 'img')];
  return candidates.find((directory) => {
    try {
      return fs.existsSync(directory) && fs.statSync(directory).isDirectory();
    } catch {
      return false;
    }
  }) || null;
}

const apiHeaders = {
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
};

async function buscarEventosRapidApi(dataFiltro) {
  const baseUrl = `https://${process.env.RAPIDAPI_HOST}/api/v1/sport/football`;
  try {
    const resposta = await axios.get(`${baseUrl}/scheduled-events/${dataFiltro}`, { headers: apiHeaders });
    return resposta.data.events || [];
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    console.warn('Endpoint scheduled-events indisponível; usando eventos ao vivo.');
    const resposta = await axios.get(`${baseUrl}/events/live`, { headers: apiHeaders });
    return resposta.data.events || [];
  }
}

app.get('/', (req, res) => res.redirect('/sports.html'));
app.get('/public/sports.html', (req, res) => res.redirect('/sports.html'));
app.get('/health', (req, res) => res.status(200).send('ok'));

app.get('/api/partidas', async (req, res) => {
  try {
    const dataFiltro = req.query.data || new Date().toISOString().split('T')[0];
    if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_HOST) {
      return res.status(500).json({ erro: 'Configure RAPIDAPI_KEY e RAPIDAPI_HOST no ambiente do servidor.' });
    }
    res.json(await buscarEventosRapidApi(dataFiltro));
  } catch (error) {
    const status = error.response?.status;
    console.error('Erro ao buscar partidas:', status || error.message);
    res.status(502).json({
      erro: status === 401 || status === 403
        ? 'A chave da RapidAPI não está autorizada para este serviço.'
        : 'Falha ao buscar os jogos na RapidAPI.'
    });
  }
});

app.get('/api/jpartida/:id/jogadores', async (req, res) => {
  try {
    const url = `https://${process.env.RAPIDAPI_HOST}/api/v1/sport/football/event/${req.params.id}/lineups`;
    const response = await axios.get(url, { headers: apiHeaders });
    res.json(response.data);
  } catch (error) {
    console.error(`Erro ao buscar jogadores para partida ${req.params.id}:`, error.message);
    res.status(502).json({ erro: 'Falha ao buscar a escalação.' });
  }
});

app.get('/imagens', async (req, res) => {
  try {
    const imagesPath = resolveImagesDir();
    if (!imagesPath) return res.status(200).send('<p>Nenhuma imagem encontrada.</p>');
    const files = await fs.promises.readdir(imagesPath);
    const imageFiles = files.filter((file) => /\.(jpe?g|png|gif|webp|svg)$/i.test(file));
    const items = imageFiles.map((file) => `
        <li class="image-item">
          <figure>
            <img src="/img/${encodeURI(file)}" alt="${file}" loading="lazy">
            <figcaption>${file}</figcaption>
          </figure>
        </li>`).join('');
    res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Galeria de Imagens</title></head><body><a href="/sports.html">Voltar para Esportes</a><h1>Galeria de imagens</h1><p>Mostrando ${imageFiles.length} imagem(ns) carregadas do servidor.</p><ul>${items}</ul></body></html>`);
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    res.status(500).send('Erro interno ao listar imagens.');
  }
});

app.get('/api/imagens', async (req, res) => {
  try {
    const imagesPath = resolveImagesDir();
    if (!imagesPath) return res.json({ count: 0, images: [] });
    const files = await fs.promises.readdir(imagesPath);
    const images = files.filter((file) => /\.(jpe?g|png|gif|webp|svg)$/i.test(file)).map((file) => `/img/${encodeURIComponent(file)}`);
    res.json({ count: images.length, images });
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    res.status(500).json({ erro: 'Erro interno ao listar imagens.' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    res.json(await readProducts());
  } catch (error) {
    console.error('Erro ao buscar produtos:', error.message);
    res.status(500).json({ erro: 'Não foi possível carregar os produtos.' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { title, price, category, image = '', description = '' } = req.body;
    const numericPrice = Number(price);
    if (!title?.trim() || !category?.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ erro: 'Informe nome, preço válido e categoria.' });
    }

    const products = await readProducts();
    const product = {
      id: products.length ? Math.max(...products.map((item) => Number(item.id) || 0)) + 1 : 1,
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
    console.error('Erro ao cadastrar produto:', error.message);
    res.status(500).json({ erro: 'Não foi possível cadastrar o produto.' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const products = await readProducts();
    res.json([...new Set(products.map((product) => product.category))]);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error.message);
    res.status(500).json({ erro: 'Não foi possível carregar as categorias.' });
  }
});

app.get('/api/products/category/:category', async (req, res) => {
  try {
    const products = await readProducts();
    const category = req.params.category.toLowerCase();
    res.json(products.filter((product) => product.category.toLowerCase() === category));
  } catch (error) {
    console.error('Erro ao buscar categoria:', error.message);
    res.status(500).json({ erro: 'Não foi possível carregar os produtos desta categoria.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = (await readProducts()).find((item) => String(item.id) === req.params.id);
    if (!product) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error.message);
    res.status(500).json({ erro: 'Não foi possível carregar este produto.' });
  }
});

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GeekVerse rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
