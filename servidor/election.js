// election.js
let servidores = [
    { id: 1, url: "http://localhost:3001" },
    { id: 2, url: "http://localhost:3002" },
    { id: 3, url: "http://localhost:3003" },
];

let meuId = 1; // ajustar por servidor
let coordenadorId = null;

function iniciarEleicao() {
    console.log(`[${meuId}] Iniciando eleição...`);
    let candidatos = servidores.filter(s => s.id > meuId);

    if (candidatos.length === 0) {
        coordenadorId = meuId;
        console.log(`[${meuId}] Eu sou o novo coordenador.`);
    } else {
        candidatos.forEach(c => {
            fetch(`${c.url}/eleicao`, { method: 'POST' })
                .then(() => console.log(`[${meuId}] ${c.id} respondeu.`))
                .catch(() => {
                    console.log(`[${meuId}] ${c.id} não respondeu. Prosseguindo...`);
                    coordenadorId = meuId;
                });
        });
    }
}

function receberEleicao(req, res) {
    console.log(`[${meuId}] Recebi solicitação de eleição.`);
    res.status(200).send('OK');
    iniciarEleicao(); // responder e iniciar própria eleição se ID maior
}

module.exports = { iniciarEleicao, receberEleicao, meuId, coordenadorId };
