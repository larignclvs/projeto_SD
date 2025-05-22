let meuRelogioFisico = Date.now(); // Berkeley
let meuRelogico = 0;               // Lamport

function calcularMediaRelogios(relogios) {
    const soma = relogios.reduce((acc, r) => acc + r, 0);
    return Math.round(soma / relogios.length);
}

function iniciarSincronizacao(relogiosRecebidos) {
    console.log("Iniciando sincronização Berkeley...");
    const media = calcularMediaRelogios([meuRelogioFisico, ...relogiosRecebidos]);
    const diferenca = media - meuRelogioFisico;
    meuRelogioFisico += diferenca;
    console.log(`Relógio físico ajustado em ${diferenca}ms`);
    return diferenca;
}

// Relógio lógico (incrementar ao enviar, atualizar ao receber)
function incrementarLogico() {
    meuRelogico++;
    return meuRelogico;
}

function atualizarLogico(recebido) {
    meuRelogico = Math.max(meuRelogico, recebido) + 1;
    return meuRelogico;
}

module.exports = {
    getRelogioFisico: () => meuRelogioFisico,
    getRelogioLogico: () => meuRelogico,
    iniciarSincronizacao,
    incrementarLogico,
    atualizarLogico
};
