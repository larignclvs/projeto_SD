const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();


app.use(cors());
app.use(bodyParser.json());

// Altere esses valores conforme o servidor (3001, 3002 ou 3003)
const PORT = 3002;
const meuId = 2;

const outrosServidores = [
  { url: 'http://localhost:3001', id: 1 },
  { url: 'http://localhost:3003', id: 3 }
];

let postagens = []
let mensagens = []; // Armazena mensagens recebidas
let coordenador = null;
let meuRelogio = Date.now();

const net = require('net'); // já está no topo

function replicarParaServidorC(dado) {
  const socket = new net.Socket();
  const mensagem = `timestamp:${Date.now()}|${JSON.stringify(dado)}`;

  socket.connect(8081, '127.0.0.1', () => {
    socket.write(mensagem);
    socket.end();
  });

  socket.on('error', (err) => {
    console.error('Erro ao conectar com servidor C:', err.message);
  });
}

// Rota para receber mensagem privada
app.post('/enviar', async (req, res) => {
  const { de, para, texto } = req.body;
  const timestamp = Date.now();
  const msg = { tipo: 'mensagem', de, para, texto, timestamp };

  mensagens.push(msg);
  console.log(`[Mensagem] ${de} -> ${para}: ${texto}`);

  for (let s of outrosServidores) {
    try {
      await fetch(s.url + '/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ de, para, texto })
      });
    } catch (e) {
      console.log(`Erro replicando para ${s.url}:`, e.message);
    }
  }

  replicarParaServidorC(msg);

  res.json({ status: 'Mensagem replicada', servidor: PORT });
});



app.post('/postar', async (req, res) => {
  const { nome, texto } = req.body;
  const timestamp = Date.now();
  const postagem = { tipo: 'postagem', nome, texto, timestamp };

  postagens.push(postagem);
  console.log(`[Postagem] ${nome}: ${texto}`);

  // Replicar para os outros servidores via /replicar
  for (let s of outrosServidores) {
    try {
      await fetch(s.url + '/replicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postagem)
      });
    } catch (e) {
      console.log(`Erro replicando para ${s.url}:`, e.message);
    }
  }

  replicarParaServidorC(postagem);

  res.json({ status: 'Postagem replicada', servidor: PORT });
});


app.get('/postagens', (req, res) => {
  return res.json(postagens);
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
      let r = await fetch(s.url + '/vivo');
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
  try {
    const r1 = await fetch('http://localhost:3001/postagens');
    const r2 = await fetch('http://localhost:3001/mensagens');
    postagens = await r1.json();
    mensagens = await r2.json();
    console.log('✅ Sincronização concluída com servidor1.');
  } catch (e) {
    console.error('❌ Falha na sincronização:', e.message);
  }
}

app.listen(PORT, () => {
  console.log(`Servidor ${meuId} rodando na porta ${PORT}`);
  sincronizarComServidorPrincipal(); // chamada automática ao iniciar
});

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
});
