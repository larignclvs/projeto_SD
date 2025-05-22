let meuRelogio = Date.now();

function calcularMediaRelogios(relogios) {
    const soma = relogios.reduce((acc, r) => acc + r, 0);
    return Math.round(soma / relogios.length);
}

function iniciarSincronizacao(relogiosRecebidos) {
    console.log("Iniciando sincronização Berkeley...");
    const media = calcularMediaRelogios([meuRelogio, ...relogiosRecebidos]);
    const diferenca = media - meuRelogio;
    meuRelogio += diferenca;
    console.log(`Relógio ajustado em ${diferenca}ms`);
    return diferenca;
}

module.exports = { meuRelogio, iniciarSincronizacao };
