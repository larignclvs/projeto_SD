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
const {
  getRelogioFisico,
  getRelogioLogico,
  iniciarSincronizacao,
  incrementarLogico,
  atualizarLogico
} = require('./sync.js'); // ajuste caminho conforme sua estrutura


let postagens = [];
let mensagens = []; // Armazena mensagens recebidas
let seguidores = [];
const seguidoresProcessados = new Set();
const mensagensProcessadas = new Set();
let coordenador = null;
let meuRelogio = Date.now();

const net = require('net');


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
  const { id, de, para, texto, timestamp: timestampRecebido } = req.body;
  

  if (!id) {
    return res.status(400).json({ error: 'Mensagem sem ID' });
  }

  if (mensagensProcessadas.has(id)) {
    // Mensagem já processada, ignorar para evitar loop
    return res.json({ status: 'Mensagem já processada, ignorando' });
  }

  mensagensProcessadas.add(id);
  const timestamp = timestampRecebido !== undefined
    ? atualizarLogico(timestampRecebido)
    : incrementarLogico();

  const msg = { id, tipo: 'mensagem', de, para, texto, timestamp };
  mensagens.push(msg);
  console.log(`[Mensagem] ${de} -> ${para}: ${texto} (t=${timestamp})`);

  for (let s of outrosServidores) {
    try {
      await fetchComRetry(s.url + '/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, de, para, texto, timestamp }),
      });
    } catch (e) {
      console.log(`Erro replicando para ${s.url}: ${e.message}`);
    }
  }

  res.json({ status: 'Mensagem replicada', servidor: PORT, timestamp });
});

const postagensRecebidas = new Set();

app.post('/postar', (req, res) => {
  const { id, nome, texto, timestamp: timestampRecebido } = req.body;

  if (postagensRecebidas.has(id)) {
    return res.json({ status: 'Postagem já recebida, ignorando para evitar replicação.' });
  }

  postagensRecebidas.add(id);

  const timestamp = timestampRecebido !== undefined
    ? atualizarLogico(timestampRecebido)
    : incrementarLogico();

  postagens.push({ id, nome, texto, timestamp });
  console.log(`[POSTAGEM] ${nome}: ${texto} (t=${timestamp})`);

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

  res.json({ status: 'Postagem replicada', servidor: PORT, timestamp });
});


app.get('/postagens', (req, res) => {
  const ordenadas = postagens.slice().sort((a, b) => a.timestamp - b.timestamp);
  res.json(ordenadas);
});

app.get('/mensagens', (req, res) => {
  const ordenadas = mensagens.slice().sort((a, b) => a.timestamp - b.timestamp);
  res.json(ordenadas);
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
app.post('/seguir', async (req, res) => {
  const { id, de, para, timestamp: timestampRecebido } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Ação de seguir sem ID' });
  }

  if (seguidoresProcessados.has(id)) {
    return res.json({ status: 'Ação de seguir já processada, ignorando' });
  }

  seguidoresProcessados.add(id);

  const timestamp = timestampRecebido !== undefined
    ? atualizarLogico(timestampRecebido)
    : incrementarLogico();

  const seguir = { id, de, para, timestamp };
  seguidores.push(seguir);
  console.log(`[SEGUIR] ${de} seguiu ${para} (t=${timestamp})`);

  for (let s of outrosServidores) {
    try {
      await fetchComRetry(s.url + '/seguir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, de, para, timestamp })
      });
    } catch (e) {
      console.log(`Erro replicando seguir para ${s.url}: ${e.message}`);
    }
  }

  res.json({ status: 'Seguir replicado', servidor: PORT, timestamp });
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

app.get('/historico', (req, res) => {
  res.json({ mensagens, postagens });
});

async function recuperarHistorico() {
  for (let s of outrosServidores) {
    try {
      const res = await fetchComRetry(s.url + '/historico');
      const data = await res.json();

      let novasMsgs = 0, novasPosts = 0, novosSeguidores = 0;

      // Recuperar mensagens
      for (let m of data.mensagens || []) {
        if (!mensagensProcessadas.has(m.id)) {
          mensagens.push(m);
          mensagensProcessadas.add(m.id);
          novasMsgs++;
          console.log(`[RECUPERADO] ${m.de} -> ${m.para}: ${m.texto}`);
        }
      }

      // Recuperar postagens
      for (let p of data.postagens || []) {
        if (!postagensRecebidas.has(p.id)) {
          postagens.push(p);
          postagensRecebidas.add(p.id);
          novasPosts++;
          console.log(`[RECUPERADO POSTAGEM] ${p.nome}: ${p.texto}`);
        }
      }

      console.log(`Recuperado de ${s.url}: ${novasMsgs} mensagens, ${novasPosts} postagens`);
      break; // só precisa de um que esteja online
    } catch (e) {
      console.log(`Erro ao recuperar histórico de ${s.url}: ${e.message}`);
    }
  }
}


app.listen(PORT, async () => {
  console.log(`Servidor ${meuId} rodando na porta ${PORT}`);
  await sincronizarComServidorPrincipal(); // sincroniza relógio
  await recuperarHistorico(); // tenta recuperar mensagens/postagens perdidas
});

