const express = require('express');
const CircuitBreaker = require('opossum');

const app = express();
const port = 8080;
const successThresholdDefault = 0.6;
successThreshold = successThresholdDefault;

// Função simulando chamada externa com 60% de sucesso
async function externalService() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const random = Math.random();
            const success = random <= successThreshold;
            const shouldFail = !success;
            if(successThreshold == 1){
                //Caso tenha forçado sucesso a taxa de sucesso volta ao padrão
                successThreshold = successThresholdDefault;
            }
            if (shouldFail) {
                reject(new Error('Falha na chamada externa'));
            } else {
                resolve('Resposta da chamada externa');
            }
        }, 200);  // Simula uma chamada que demora 1 ms
    });
}

// Configuração do Circuit Breaker
const breaker = new CircuitBreaker(externalService, {
    timeout: 1000,  // Tempo limite de 1 segundo para a chamada
    errorThresholdPercentage: 50,  // Abre o circuito se 50% das requisições falharem
    resetTimeout: 10000  // Tenta fechar o circuito após 10 segundos
});

// Lidando com sucesso e falhas do Circuit Breaker
breaker.fallback(() => 'Resposta do fallback...');
breaker.on('open', () => console.log('Circuito aberto!'));
breaker.on('halfOpen', () => {
    console.log('Circuito meio aberto, testando...');
    console.log('Alterando parâmetro para forçar sucesso');
    successThreshold = 1;
});
breaker.on('close', () => console.log('Circuito fechado novamente'));
breaker.on('reject', () => console.log('Requisição rejeitada pelo Circuit Breaker'));
breaker.on('failure', () => console.log('Falha registrada pelo Circuit Breaker'));
breaker.on('success', () => console.log('Sucesso registrado pelo Circuit Breaker'));

// Rota que faz a chamada simulada com o Circuit Breaker
app.get('/api/circuitbreaker', async (req, res) => {
    try {
        const result = await breaker.fire();
        res.send(result);
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
