# Jeremias Barbosa e Julio Vicente
# Parecer geral:
Além dos pareceres de cada padrão de resiliência trazemos também o parecer geral abaixo:

Os padrões demonstrados podem ser aplicados isoladamente, mas uma abordagem onde eles são aplicados em conjunto é muito mais interessante.

Por exemplo podemos definir um timeout para que chamadas não fiquem aguardando muito tempo, e caso estejam demorando demais aplicar o circuit breaker.

Outra possibilidade seria aplicar o rate limit juntamente com o limite de chamadas concorrentes.

Um cenário fictício (também utilizado no exemplo de circuit breaker) onde poderíamos aplicar timeout, rate limit, circuit breaker e bulkhead (delimitando o número de chamadas concorrentes) seria o seguinte:

Uma loja virtual com 2 serviços:

1 - Serviço de detalhe do produto que retorna o produto e suas características.

2 - Serviço de comentários de usuários sobre o produto.

Poderíamos definir um timeout condizente com o tempo de resposta viável do ponto de vista de experiência do usuário.

Caso o tempo de resposta do serviço 2 passasse a ser alto ou ultrapassar o limite definido poderíamos aplicar o circuit breaker e não retornar os comentários, ou até mesmo retornar os comentários guardados em cache.

Também poderia ser aplicado um rate limit parametrizado de acordo com o número normal esperado de um usuário de loja virtual. Não faz sentido um usuário de loja virtual fazer diversas chamadas em um curto intervalo de tempo.

O número de chamadas concorrentes também poderia ser ajustado de acordo com o esperado.

Também poderia ser atrelado ao rate limit para que um volume grande de requisições em um curto intervalo de tempo fosse bloqueado e impedisse várias chamadas simultâneas.

O inverso também poderia ser aplicado, mesmo com um grande volume de requisições limitaríamos o número de requisições simultâneas.

Imaginando que o rate limit fosse estourado no serviço 1 poderia aplicar um circuit breaker com o fallback onde seria retornada uma mensagem informando uma indisponibilidade momentanêa ou informando que o limite de requisições foi excedido.

Outra possibilidade de circuit breaker poderia ser aplicado no momento de finalizar a compra e processar o pagamento.

Caso o volume seja muito alto podemos aplicar o fallback de enviar para uma fila para ser processado assíncronicamente.

Obviamente não existe solução padrão que se aplique a todos os cenários, então cada uma dessas abordagens (e seus parâmetros) devem ser estudadas e aplicadas para cada caso.

Além disso o acompanhamento da performance do sistema e do resultado retornado pela implementação dessas abordagens deve ser continuamente avaliado, trazendo assim possíveis ajustes a serem aplicados. 

# Exemplos Práticos de Resiliência em Aplicações Node.js
Este material contempla exemplos práticos de uso de técnicas essenciais em aplicações, afim de garantir a confiabilidade, resiliência, escalabilidade e alta disponibilidade.

Dentre os temas tratados, são apresentados os seguintes itens chave:
- **Timeout**
- **Rate Limit**
- **Bulkhead**
- **Circuit Breaker**
- **Health Check**

Para demonstração foram utilizadas as Bibliotecas e Frameworks:

- `express`: Framework web para Node.js que facilita a criação de servidores e APIs. Usado para criar o servidor HTTP e rotas. Link: https://expressjs.com/

- `cockatiel`: Biblioteca que implementa padrões de resiliência, como timeout e bulkhead, para chamadas assíncronas. Link: https://www.npmjs.com/package/cockatiel
      
- `express-rate-limit`: Middleware para Express que limita o número de requisições de um IP específico em um determinado período. Usado para implementar rate limiting. Link: https://www.npmjs.com/package/express-rate-limit

- `opossum`: Biblioteca que implementa o padrão de Circuit Breaker, que ajuda a evitar chamadas a serviços que estão falhando. Permite definir limites de tempo, porcentagens de falhas e intervalos de reset. Link: https://github.com/nodeshift/opossum

## 1. Criar o Projeto Node.js

**1.1 Criar um diretório para o projeto e inicializar um novo projeto Node.js:**

 ```sh
 mkdir sre-samples-node
 cd sre-samples-node
 npm init -y
```
**1.2 Instalar as dependências necessárias:**

```
npm install express cockatiel express-rate-limit opossum
```

## 2. Exemplos de Código

### 2.1 Timeout
O papel principal das configurações de Timeout são definir um limite de tempo para a execução de operações, evitando erros inesperados e um tratamento adequado de serviços que tendem a demorar por conta de eventos não esperados. Este tipo de tratamento evita erros indesejados impactando a experiência do cliente.

Crie um arquivo chamado **`server-timeout.js`**:

```javascript
const express = require('express');

const app = express();
const port = 8080;

// Função para criar uma Promise que simula um timeout
function timeoutPromise(ms, promise) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Tempo limite excedido!'));
        }, ms);

        promise
            .then((result) => {
                clearTimeout(timeout);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

// Função simulando chamada externa
async function externalService() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('Resposta da chamada externa');
        }, 5000); 
    });
}

// Rota de health check
app.get('/api/health', (req, res) => {
    res.send('OK');
});

// Rota que faz a chamada simulada com timeout
app.get('/api/timeout', async (req, res) => {
    try {
        const result = await timeoutPromise(3000, externalService());
        res.send(result);
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
```

**Utilize o comando para executar a aplicação**
```javascript
node server-timeout.js
```
 
**Utilize o comando pra realizar a chamada do endpoint**
```javascript
curl localhost:8080/api/timeout
```

#### 2.1.2 Desafio - Timeout
Ajustar configurações de timeout e corrigir erro de timeout execedido ao invocar o serviço

![Screen Shot 2024-09-13 at 21 42 04](https://github.com/user-attachments/assets/a451d1a1-ef3f-4116-8ab0-246d6548b7a3)

```
// INSIRA SUA ANÁLISE OU PARECER ABAIXO
Ocorria timeout porque o serviço simulava um tempo de resposta de 5 segundos enquanto o timeout estava definido com 3 segundos.
Uma possível abordagem seria aumentar o timeout, mas não é o ideal nem o recomendado.
A abordagem num cenário real seria melhorar a performance da aplicação e ajustar o timeout para um valor viável.
Fizemos as alterações abaixo:
1-Melhoramos a performance da aplicação para que ela responda em 200 ms ou menos, pois um tempo de 5000 ms para retornar a chamada não é viável em termos computacionais nem de negócio.
2-Ajustamos o timeout para um valor mais aceitável (300 ms), pois um tempo de 3000 ms de timeout também não é viável em termos computacionais e de negócio.
Código alterado adicionado ao repositório.
```


---
### 2.2 Rate Limit
O Rate Limiting possibilita controlar a quantidade de requisições permitidas dentro de um período de tempo, evitando cargas massivas de requisições mal intensionadas, por exemplo.

Crie um arquivo chamado **`server-ratelimit.js`**:

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();
const port = 8080;

// Middleware de rate limiting (Limite de 5 requisições por minuto)
const limiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minuto
    max: 5,  // Limite de 5 requisições
    message: 'Você excedeu o limite de requisições, tente novamente mais tarde.',
});

// Aplica o rate limiter para todas as rotas
app.use(limiter);

// Função simulando chamada externa
async function externalService() {
    return 'Resposta da chamada externa';
}

// Rota que faz a chamada simulada
app.get('/api/ratelimit', async (req, res) => {
    try {
        const result = await externalService();
        res.send(result);
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

```

**Utilize o comando para executar a aplicação**
```javascript
node server-ratelimit.js
```
 
**Utilize o comando pra realizar a chamada do endpoint**
```javascript
curl localhost:8080/api/ratelimit
```
#### 2.1.2 Desafio - Rate Limit
Alterar limite de requisições permitidas para 100 num intervalo de 1 minuto e escrever uma função para simular o erro de Rate Limit.
![Screen Shot 2024-09-13 at 22 51 23](https://github.com/user-attachments/assets/6407456d-9bb5-41bb-ba17-9cc4a5272d29)


```
// INSIRA SUA ANÁLISE OU PARECER ABAIXO
O rate limit é utilizado para impedir que a aplicação receba um número maior do que o projetado e para que um usuário/recurso não exaura todos os recursos do servidor.
Outro ponto é impedir chamadas maliciosas com o intuito de onerar e/ou derrubar aplicação, ou até mesmo ficar chamando um serviço para coletar/roubar dados.
Por exemplo, caso não exista solução de segurança, é possível ficar chamando um serviço de uma loja virtual para coletar dados de produtos.
Em arquiteturas que possuam autoscaling esse é um mecanismo importante para evitar que chamadas maliciosas faça com que mais recursos sejam alocados e por consequência aumente o custo da aplicação.
Importante salientar que existem várias formas de aplicar o rate limit, por exemplo por IP, região geográfica.
Dessa forma o rate limit pode bloquear requisições de um usuário/recurso e permitir que outro usuário/recurso acesse o serviço normalmente.
Para fazer mais de 100 chamadas no serviço utilizamos o comando abaixo no bash:
while true; do curl -s localhost:8080/api/ratelimit; echo; sleep 0.1; done
Código alterado adicionado ao repositório.
```


---
### 2.3 Bulkhead
As configurações de Bulkhead permitem limitar o número de chamadas simultâneas a um serviço, de modo que a aplicação sempre esteja preparada para cenários adversos.

Crie um arquivo chamado **`server-bulkhead.js`**:

```javascript
const express = require('express');
const { bulkhead } = require('cockatiel');

const app = express();
const port = 8080;

// Configurando bulkhead com cockatiel (Máximo de 2 requisições simultâneas)
const bulkheadPolicy = bulkhead(2);

// Função simulando chamada externa
async function externalService() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('Resposta da chamada externa');
        }, 2000);  // Simula uma chamada que demora 2 segundos
    });
}

// Rota que faz a chamada simulada
app.get('/api/bulkhead', async (req, res) => {
    try {
        const result = await bulkheadPolicy.execute(() => externalService());
        res.send(result);
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

```

**Utilize o comando para executar a aplicação**
```javascript
node server-bulkhead.js
```
 
**Utilize o comando pra realizar a chamada do endpoint**
```javascript
curl localhost:8080/api/bulkhead
```

#### 2.3.2 Desafio - Bulkhead
Aumentar quantidade de chamadas simultâneas e avaliar o comportamento.
![Screen Shot 2024-09-13 at 22 36 17](https://github.com/user-attachments/assets/e379b022-fe78-41bf-9e4b-e4eb21781294)

**BÔNUS**: implementar método que utilizando threads para realizar as chamadas e logar na tela 


```
// INSIRA SUA ANÁLISE OU PARECER ABAIXO
Bulkhead é um padrão de resiliência que possui o nome retirado da engenharia naval onde os navios são divididos em compartimentos.
A inundação de um compartimento do navio não o afundará pois o navio possui diversos compartimentos que podem ser isolados.
No nosso caso esse padrão está barrando o número de chamadas simultâneas para impedir que o sistema sofra uma sobrecarga.
Alteramos o código para responder em 100 ms e agilizar os testes.
Para efetuarmos várias chamadas em paralelo utilizamos o apache bench e executamos o comando abaixo:
ab -n 100 -c 2 localhost:8080/api/bulkhead
O parâmetro n define o número de requisições e o parâmetro c define a concorrência, isto é, o número de chamadas a serem executadas ao mesmo tempo.
Com o comando ab -n 100 -c 2 localhost:8080/api/bulkhead o retorno foi:
Concurrency Level:      2
Time taken for tests:   5.553 seconds
Complete requests:      100
Failed requests:        0
Total transferred:      22700 bytes
HTML transferred:       2700 bytes
Requests per second:    18.01 [#/sec] (mean)
Time per request:       111.063 [ms] (mean)
Time per request:       55.531 [ms] (mean, across all concurrent requests)
Transfer rate:          3.99 [Kbytes/sec] received
O que nos mostra que não houve falhas.
Porém ao manter o número de requisições simultâneas e executar o comando ab -n 100 -c 4 localhost:8080/api/bulkhead (100 requisições, 4 simultaneamente) o resultado foi:
Concurrency Level:      4
Time taken for tests:   0.225 seconds
Complete requests:      100
Failed requests:        97
   (Connect: 0, Receive: 0, Length: 97, Exceptions: 0)
Non-2xx responses:      97
Total transferred:      28617 bytes
HTML transferred:       6774 bytes
Requests per second:    443.67 [#/sec] (mean)
Time per request:       9.016 [ms] (mean)
Time per request:       2.254 [ms] (mean, across all concurrent requests)
Transfer rate:          123.99 [Kbytes/sec] received
O que nos mostra que houve 97 falhas pois o servidor não foi capaz de atender requisições simultâneas.
Executando o mesmo comando mas com o parâmetro -v 2 (ab -n 100 -c 4 -v 2 localhost:8080/api/bulkhead) temos nos logs o seguinte:
Erro: Bulkhead capacity exceeded (0/2 execution slots, 0/0 available)
WARNING: Response code not 2xx (500)
LOG: header received:
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 27
ETag: W/"1b-VUa+qkoedkdRrxq2n13erXmsF1s"
Date: Sun, 29 Sep 2024 15:05:45 GMT
Connection: close
Mostrando que excedemos o limite de chamadas concorrentes definidos.
Alterando o código para permitir 4 chamadas concorrentes e executando novamente o comando anterior temos o seguinte resultado:
Concurrency Level:      4
Time taken for tests:   2.854 seconds
Complete requests:      100
Failed requests:        0
Total transferred:      22700 bytes
HTML transferred:       2700 bytes
Requests per second:    35.04 [#/sec] (mean)
Time per request:       114.160 [ms] (mean)
Time per request:       28.540 [ms] (mean, across all concurrent requests)
Transfer rate:          7.77 [Kbytes/sec] received
O que nos mostra que o servidor foi capaz de lidar com a concorrência de 4 chamadas por vez.
```


---
### 2.4 Circuit Breaker
O Circuit Breaker ajuda a proteger a aplicação contra falhas em cascata, evitando chamadas excessivas para serviços que estão falhando.

Crie um arquivo chamado **`server-circuit-breaker.js`**:

```javascript
const express = require('express');
const CircuitBreaker = require('opossum');

const app = express();
const port = 8080;

// Função simulando chamada externa com 50% de falhas
async function externalService() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const shouldFail = Math.random() > 0.8;  // Simula o percentual de falhas
            if (shouldFail) {
                reject(new Error('Falha na chamada externa'));
            } else {
                resolve('Resposta da chamada externa');
            }
        }, 2000);  // Simula uma chamada que demora 2 segundos
    });
}

// Configuração do Circuit Breaker
const breaker = new CircuitBreaker(externalService, {
    timeout: 3000,  // Tempo limite de 3 segundos para a chamada
    errorThresholdPercentage: 50,  // Abre o circuito se 50% das requisições falharem
    resetTimeout: 10000  // Tenta fechar o circuito após 10 segundos
});

// Lidando com sucesso e falhas do Circuit Breaker
breaker.fallback(() => 'Resposta do fallback...');
breaker.on('open', () => console.log('Circuito aberto!'));
breaker.on('halfOpen', () => console.log('Circuito meio aberto, testando...'));
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
```

**Utilize o comando para executar a aplicação**
```javascript
node server-circuit-breaker.js
```
 
**Utilize o comando pra realizar a chamada do endpoint**
```javascript
curl localhost:8080/api/circuitbreaker
```

#### 2.4.1 Desafio - Circuit Breaker
Ajustar o o percentual de falhas para que o circuit breaker obtenha sucesso ao receber as requisições após sua abertura.
Observar comportamento do circuito no console.

```
// INSIRA SUA ANÁLISE OU PARECER ABAIXO
O circuit breaker é bastante importante na resiliência de aplicações pois com esse padrão
pode-se criar uma alternativa caso haja erro em algum ponto da aplicação.
Um exemplo seria uma loja virtual com 2 serviços:
1 - Serviço de detalhe do produto que retorna o produto e suas características.
2 - Serviço de comentários de usuários sobre o produto.
O comportamento normal seria chamar o serviço 1 para retornar o produto e suas características e este chamar o serviço 2 para retornar os comentários dos usuários sobre aquele produto.
O serviço mais importante é o 1, enquanto o serviço 2 é secundário.
Caso estejamos tendo problema no serviço 2 podemos deixar de chamá-lo para que não impacte no serviço 1. Nesse caso o produto e suas características continuariam sendo retornados porém sem os comentários.
O circuit breaker possui 3 estados descritos abaixo:
Closed: O comportamento padrão da aplicação, o fluxo não sofre nenhum desvio.
No nosso exemplo o serviço 1 é chamado que chama o serviço 2 e retorna as características do produto e os comentários dos usuários sobre o mesmo.
Open: O comportamento em caso de falha, também conhecido como fallback.
No nosso exemplo o serviço demora muito para retornar ou não retorna, fazendo com que o circuito seja aberto.
O nosso fallback seria parar de chamar o serviço 2 e não retornar os comentários. Dessa forma a funcionalida mais importante continuaria funcionando normalmente.
HalfOpen: O comportamento que faz com que algumas requisicões sigam o fluxo normal e outras sigam o fallback.
No nosso exemplo passariam pelo fluxo padrão para verificar se o serviço 2 voltou a performar normalmente.
Em caso de sucesso o circuito seria fechado, em caso de falha o serviço circuito voltaria para aberto
Importante citar que em alguns frameworks podemos configurar o circuit breaker através de parâmetros, por exemplo no resilience4j:
failureRateThreshold: O limite da taxa de falha em porcentagem, quando a taxa de falha é igual ou maior que o limite, o circuit breaker faz a transição para aberto.
slowCallDurationThreshold: o limite de duração acima do qual as chamadas são consideradas lentas.
slowCallRateThreshold: O limite da taxa de chamada lenta, quando a taxa de chamada lenta é igual ou maior que o limite, o circuit breaker faz a transição para aberto.
minimumNumberOfCalls: O número mínimo de chamadas que são necessárias antes que o circuit breaker possa calcular a taxa de erro ou taxa de chamada lenta.
waitDurationInOpenState: O tempo que o circuit breaker deve esperar antes de passar de aberto para semiaberto
Para verificar o comportamento do circuit breaker utilizamos seguinte comando:
while true; do curl -s localhost:8080/api/circuitbreaker; echo; sleep 1; done
Alteramos o timeout para 1 segundo e o tempo de retorno da chamada para 200 milissegundos para agilizar os testes.
Além disso alteramos a lógica para definir a porcentagem de sucesso e o parâmetro de sucesso para 60% (portanto 40% de falha).
Para forçar sucesso no estado HalfOpen alteramos o percentual de sucesso para 100% quando estivermos nesse estado.
Caso o percentual de sucesso tenha sido alterado para forçar sucesso voltamos ele ao padrão.
Código alterado adicionado ao repositório.
```

---
### 2.5 Health Check
Health check é uma prática comum para monitorar o status de uma aplicação e garantir que esteja funcionando corretamente.

- **Liveness Probe**: Verifica se a aplicação está rodando. Geralmente usado para verificar se a aplicação está ativa e não travada.
- **Readiness Probe**: Verifica se a aplicação está pronta para aceitar requisições. Isso é útil para garantir que o serviço está pronto para receber tráfego.

Crie um arquivo chamado **`server-health-check.js`**:

```javascript
const express = require('express');
const app = express();
const port = 8080;

// Simulando o estado da aplicação para o Readiness Check
let isReady = false;

// Endpoint Liveness Check - verifica se o servidor está rodando
app.get('/health/liveness', (req, res) => {
    res.status(200).send('Liveness check passed');
});

// Endpoint Readiness Check - verifica se a aplicação está pronta para receber requisições
app.get('/health/readiness', (req, res) => {
    if (isReady) {
        res.status(200).send('Readiness check passed');
    } else {
        res.status(503).send('Service is not ready yet');
    }
});

// Endpoint para simular a aplicação ficando pronta
app.get('/make-ready', (req, res) => {
    isReady = true;
    res.send('Application is now ready to accept requests');
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

```

**Utilize o comando para executar a aplicação**
```javascript
node server-health-check.js
```

**Definição endpoints criados**
- Liveness (`/health/liveness`): Este endpoint sempre retorna um status HTTP 200 para indicar que o serviço está vivo e em execução.
- Readiness (`/health/readiness`): Este endpoint retorna um status HTTP 200 apenas se a variável isReady estiver definida como true. Caso contrário, retorna um status HTTP 503 para indicar que o serviço não está pronto para receber tráfego.
- Simulação de Readiness (`/make-ready`): Esse endpoint permite que a aplicação altere seu estado para "pronta", configurando o isReady como true.
 
Em seguida, para entendimento detalhado, execute os comandos abaixo em ordem:

**1. Liveness**
```sh
curl http://localhost:8080/health/liveness
```

**2. Liveness output**
```sh
Liveness check passed
```

**3. Readiness**
```sh
curl http://localhost:8080/health/readiness
```

**4. Readiness output**
```sh
Service is not ready yet
```

**5. Simulação de Readiness**
```sh
curl http://localhost:8080/make-ready
```
**6. Readiness**
```sh
curl http://localhost:8080/health/readiness
```
**7. Readiness output**
```sh
Readiness check passed
```
#### 2.5.1 Exemplo de configuração de Probes no Kubernetes (Opcional)
Para utilizar esses endpoints como probes no Kubernetes, você pode configurar o `deployment.yaml` da seguinte maneira:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: node-app
  template:
    metadata:
      labels:
        app: node-app
    spec:
      containers:
      - name: node-app
        image: your-node-app-image
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 8080
          initialDelaySeconds: 3
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10

```
**Probes no Kubernetes:**
- **livenessProbe**: O Kubernetes faz uma requisição GET para o endpoint `/health/liveness`. Se retornar um código de status 200, o container é considerado vivo. Se falhar repetidamente, o container será reiniciado.
- **readinessProbe**: O Kubernetes faz uma requisição GET para o endpoint `/health/readiness`. O container é considerado pronto se retornar 200. Se falhar, o container será removido das rotas de serviço até que esteja pronto novamente.

**Propriedades das Probes**
- `httpGet`: Realiza uma requisição HTTP.
- `path`: O caminho do endpoint HTTP que será verificado (por exemplo, /health/liveness).
- `port`: A porta do container onde a requisição será feita.
- `initialDelaySeconds`: O tempo de espera antes do primeiro check ser executado.
- `periodSeconds`: A frequência de execução do check.
- `failureThreshold`: Quantas falhas consecutivas são necessárias para reiniciar o container.
- `successThreshold`: Número de sucessos consecutivos necessários para marcar o container como pronto.
- `timeoutSeconds`: Tempo máximo de espera antes de considerar o check como falha.

Para saber mais, acesse:
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
