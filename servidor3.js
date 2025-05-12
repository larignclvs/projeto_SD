const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Altere esses valores conforme o servidor (3001, 3002 ou 3003)
const PORT = 3003;
const meuId = 3;

const outrosServidores = [
  { url: 'http://localhost:3001', id: 1 },
  { url: 'http://localhost:3002', id: 2 }
];

let postagens = [];
let mensagens = []; // Armazena mensagens recebidas
let coordenador = null;
let meuRelogio = Date.now();

// Rota para receber mensagem privada
app.post('/enviar', (req, res) => {
  const { de, para, texto, timestamp } = req.body;
  mensagens.push({ de, para, texto, timestamp });
  console.log(`[Mensagem] ${de} -> ${para}: ${texto}`);
  return res.json({ status: 'Mensagem recebida', servidor: PORT });
});

app.post('/postar', (req, res) => {
  const { nome, texto } = req.body;
  postagens.push({nome, texto});
  console.log(`[Postagem] ${nome}: ${texto}`);
  return res.json({ status: 'Postagem recebida', servidor: PORT });
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
