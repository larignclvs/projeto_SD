const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const fetch = require('node-fetch');

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3003;
const meuId = parseInt(process.env.MEU_ID || "3");

const todos_servidores = [
  { url: 'http://servidor1:3001', id: 1 },
  { url: 'http://servidor2:3002', id: 2 },
  { url: 'http://servidor3:3003', id: 3 }
];
const outrosServidores = todos_servidores.filter(s => s.id !== meuId);

let postagens = [];
let mensagens = []; // Armazena mensagens recebidas
const mensagensProcessadas = new Set();
let coordenador = null;
let meuRelogio = Date.now();

const net = require('net'); // já está no topo

// Função utilitária fetch com retry limitado e delay progressivo
async function fetchComRetry(url, options = {}, maxTentativas = 5, delayMs = 1000) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      return res;
    } catch (err) {
      console.log(`Erro na tentativa ${tentativa} para ${url}: ${err.message}`);
      if (tentativa < maxTentativas) {
        await new Promise(resolve => setTimeout(resolve, delayMs * tentativa)); // delay progressivo
      } else {
        throw err; // falha definitiva após maxTentativas
      }
    }
  }
}

app.post('/enviar', async (req, res) => {
  const { id, de, para, texto } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Mensagem sem ID' });
  }

  if (mensagensProcessadas.has(id)) {
    // Mensagem já processada, ignorar para evitar loop
    return res.json({ status: 'Mensagem já processada, ignorando' });
  }

  mensagensProcessadas.add(id);

  const timestamp = Date.now();
  const msg = { id, tipo: 'mensagem', de, para, texto, timestamp };

  mensagens.push(msg);
  console.log(`[Mensagem] ${de} -> ${para}: ${texto}`);

  for (let s of outrosServidores) {
    try {
      await fetchComRetry(s.url + '/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, de, para, texto }),
      });
    } catch (e) {
      console.log(`Erro replicando para ${s.url}: ${e.message}`);
    }
  }

  res.json({ status: 'Mensagem replicada', servidor: PORT });
});


const postagensRecebidas = new Set();

app.post('/postar', (req, res) => {
  const { id, nome, texto, timestamp } = req.body;

  if (postagensRecebidas.has(id)) {
    return res.json({ status: 'Postagem já recebida, ignorando para evitar replicação.' });
  }

  postagensRecebidas.add(id);

  // Salve a postagem normalmente, registre no log, etc.
  mensagens.push({ id, nome, texto, timestamp });
  console.log(`[POSTAGEM] ${nome}: ${texto}`);

  // Replicar para outros servidores
  for (let s of outrosServidores) {
    // só envie se s.url não for igual ao servidor que recebeu a postagem
    if (s.url !== `http://localhost:${PORT}`) {
      fetch(s.url + '/postar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nome, texto, timestamp })
      }).catch(e => console.log(`Erro replicando para ${s.url}: ${e.message}`));
    }
  }

  res.json({ status: 'Postagem recebida e replicada com sucesso' });
});


// Rota para ver mensagens (debug)
app.get('/mensagens', (req, res) => {
  return res.json(mensagens);
});

// Eleição: outro servidor chama essa rota para ver se estou ativo
app.get('/vivo', (req, res) => {
  res.json({ id: meuId });
});

app.post('/replicar', (req, res) => {
  const { nome, texto, timestamp } = req.body;
  const postagem = { tipo: 'postagem', nome, texto, timestamp };

  // Evita duplicação
  if (!postagens.find(p => p.nome === nome && p.texto === texto && p.timestamp === timestamp)) {
    postagens.push(postagem);
    //console.log(`[Replica] ${nome}: ${texto}`);
  }

  res.json({ status: 'Postagem replicada localmente' });
});

// Endpoint para iniciar a eleição
app.post('/iniciar-eleicao', async (req, res) => {
  console.log('Iniciando eleição...');
  let maiores = outrosServidores.filter(s => s.id > meuId);
  let recebeuResposta = false;

  for (let s of maiores) {
    try {
      let r = await fetchComRetry(s.url + '/vivo');
      if (r.ok) {
        console.log(`${s.url} respondeu. Abandonando eleição.`);
        recebeuResposta = true;
        break;
      }
    } catch (e) {
      console.log(` ${s.url} não respondeu.`);
    }
  }

  if (!recebeuResposta) {
    coordenador = meuId;
    console.log(` Eu (${meuId}) sou o novo coordenador.`);
  }

  res.json({ coordenador });
});

async function sincronizarComServidorPrincipal() {
  const url = 'http://servidor1:3001/sincronizar';
  try {
    await fetchComRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novoTempo: meuRelogio }),
    });
    console.log('Sincronização bem-sucedida!');
  } catch (error) {
    console.log(`Falha na sincronização após várias tentativas: ${error.message}`);
  }
}

app.post('/sincronizar', (req, res) => {
  const { novoTempo } = req.body;
  meuRelogio = novoTempo;
  console.log(`Relógio ajustado para ${new Date(meuRelogio).toISOString()}`);
  res.json({ status: 'sincronizado', relogio: meuRelogio });
});

// Exibir status
app.get('/status', (req, res) => {
  res.json({ id: meuId, coordenador, relogio: meuRelogio });
});

app.listen(PORT, () => {
  console.log(`Servidor ${meuId} rodando na porta ${PORT}`);
  sincronizarComServidorPrincipal(); // chamada automática ao iniciar
});
