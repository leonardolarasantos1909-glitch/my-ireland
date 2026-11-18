# My Ireland
Aplicativo pessoal para organização do meu intercâmbio na Irlanda.
# My Ireland — Atualização das configurações iniciais

Atualize o projeto My Ireland com as seguintes configurações oficiais.

## 1. Dados iniciais

- Meta financeira: **R$ 60.000,00**
- Poupança mensal planejada: **R$ 300,00**
- Data de embarque: **não definida**
- Cidade de destino na Irlanda: **não definida**
- Moeda principal: BRL
- Moeda secundária: EUR
- Idioma da interface: pt-BR
- Fuso horário inicial: America/Sao_Paulo

Esses valores devem ser persistidos no banco de dados e editáveis no painel de configurações.

## 2. Regras obrigatórias

**Data de embarque**
- Armazenar como `null`.
- Mostrar "Data de embarque não definida".
- Não calcular contagem regressiva enquanto não existir uma data válida.
- Não inserir datas fictícias nem utilizar a data atual como substituição.
- Ativar a contagem regressiva automaticamente quando uma data for cadastrada.

**Cidade de destino**
- Armazenar como `null`.
- Mostrar "Cidade ainda não escolhida".
- Permitir comparar Dublin, Cork, Galway e outras cidades.
- Não selecionar uma cidade automaticamente.
- Não assumir custos específicos de uma cidade sem dados verificados.

**Finanças**
- Meta inicial: 60000.00 BRL.
- Economia mensal planejada: 300.00 BRL.
- Saldo disponível: desconhecido até o primeiro cadastro.
- Não confundir a meta de poupança com dinheiro já economizado.
- Não presumir saldo inicial de R$ 0 como fato.
- Manter saldo desconhecido distinto de saldo confirmado igual a zero.
- Não registrar transações fictícias.
- Exibir exemplos de projeções apenas com identificação explícita das hipóteses.

## 3. Dashboard financeiro

Exibir:
- Meta financeira: R$ 60.000,00.
- Economia mensal planejada: R$ 300,00.
- Total economizado: "Ainda não informado".
- Valor restante: "Aguardando saldo inicial".
- Progresso: "Ainda não calculado".
- Previsão para atingir a meta: somente após informar saldo inicial e premissas necessárias.

Caso o usuário solicite uma simulação começando do zero, calcular separadamente e indicar que se trata de um cenário hipotético.

## 4. Assistente My Ireland AI

O assistente deverá:
- Conhecer a meta e a poupança mensal cadastradas.
- Reconhecer que data e cidade não foram definidas.
- Não inventar saldos, despesas, passagens ou reservas.
- Perguntar pelos dados faltantes somente quando forem necessários.
- Diferenciar dados confirmados, estimativas e hipóteses.
- Consultar o banco antes de responder sobre o planejamento pessoal.
- Utilizar funções determinísticas para cálculos financeiros.
- Propor estratégias realistas para atingir a meta financeira.
- Nunca alterar metas ou valores sem confirmação explícita.

## 5. Implementação técnica

- Criar migrations ou seeds idempotentes para as configurações iniciais.
- Armazenar valores monetários em centavos inteiros ou representação decimal exata.
- Não utilizar ponto flutuante binário para operações monetárias.
- Não sobrescrever configurações que já tenham sido modificadas pelo usuário.
- Validar valores financeiros não negativos e datas válidas.
- Criar testes para valores nulos, cálculos e persistência.
- Atualizar o dashboard, as configurações e o contexto autorizado da IA.
- Manter compatibilidade com as demais funcionalidades do projeto.

Implemente essas configurações no código existente, execute os testes pertinentes e apresente os arquivos modificados e os resultados.

Não substitua valores desconhecidos por dados inventados.

---

## Versão atual

O aplicativo usa Vite e IndexedDB. Novas instalações começam com Dublin como destino e saldo inicial zero nas duas metas. A atualização do banco preserva as configurações cadastradas, incluindo saldos desconhecidos e cidades editadas. Os R$ 300 de poupança mensal existentes servem à simulação opcional. O registro de depósitos é livre.

As movimentações são armazenadas em centavos inteiros e contabilizadas na moeda da meta escolhida. A referência pessoal de R$ 60 mil e a reserva da ELI Schools são independentes. O gráfico de câmbio consulta Frankfurter no navegador. As taxas de referência são publicadas em dias úteis e podem ser diferentes da taxa cobrada para comprar euros.

Movimentações, doadores, checklists e documentos ficam no navegador e na origem do site. Em Configurações, exporte o backup JSON completo com os anexos e restaure-o em um navegador sem planejamento cadastrado. O backup contém dados pessoais e deve ser guardado em um local privado. Não há sincronização automática nem armazenamento de documentos no Worker.

### Desenvolvimento e validação

Use Node.js 24 LTS e npm:

```sh
npm ci
npm run dev
npm test
npm run build
npx wrangler deploy --dry-run
```

O build gera `dist/`. Os testes cobrem valores exatos, saldo desconhecido versus zero, datas, cálculos, seed idempotente e persistência. Para testar o resultado compilado, execute `npm run preview`.

### Cloudflare Workers — publicação de arquivos estáticos

No painel **Workers Builds**, conecte este repositório e use:

| Configuração | Valor |
| --- | --- |
| Branch de produção | `main` |
| Diretório raiz | raiz do repositório (`/`) |
| Comando de build | Nenhum (o Wrangler executa `npm run build` automaticamente) |
| Comando de deploy | `npx wrangler deploy` |
| Nome do Worker | `my-ireland` |
| Node.js | `24` (variável de build `NODE_VERSION`, se necessário) |

O Wrangler lê `wrangler.jsonc`, publica `./dist` usando Workers Static Assets e executa `worker/index.js` antes de servir os arquivos ou a rota `/api/assistant`. Configure `APP_ACCESS_TOKEN` no Worker para liberar o acesso privado às páginas. O navegador solicitará o usuário `my-ireland` e o código pessoal como senha. Configure o projeto em Workers. As rotas da interface usam fragmentos, como `#settings`.

Para publicar pelo terminal com autenticação Cloudflare já configurada:

```sh
npm run deploy
```

Tanto `npm run deploy` quanto `npx wrangler deploy` executam `npm run build` automaticamente pelo campo `build.command` do Wrangler, antes de publicar. A pasta `dist` não precisa existir previamente. Se o painel já tiver um comando de build configurado, ele pode ficar vazio para evitar compilação duplicada. A publicação real requer autenticação e acesso à conta Cloudflare; um dry run não publica o site.

### Endereço público do aplicativo

`workers_dev: true` habilita a URL pública `workers.dev` no próximo deploy. Se o painel mostrar “Nenhuma URL habilitada”, abra **Configurações → Domínios e rotas** (ou a aba **Domínios**) e habilite o endereço **workers.dev**. Use a URL completa exibida pelo Cloudflare; o subdomínio depende da conta. A alteração no GitHub só chega ao Worker após um deploy bem-sucedido.


### Assistente opcional

A IA fica desativada enquanto os segredos do Worker estiverem ausentes. A API da OpenAI pode gerar custos por requisição. Depois de revisar o custo e as políticas de dados do provedor, configure os segredos no painel do Worker ou via Wrangler autenticado:

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put APP_ACCESS_TOKEN
```

Gere um código pessoal aleatório de 32 a 256 caracteres ASCII imprimíveis sem espaços para `APP_ACCESS_TOKEN` e informe-o na tela do assistente quando for usá-lo. A chave da OpenAI permanece no backend. `OPENAI_MODEL` é uma variável opcional do Worker, com valor padrão `gpt-4.1-mini`. O Worker usa a Responses API com armazenamento da resposta desabilitado. Consulte os termos de retenção do provedor antes de compartilhar informações pessoais.

`npm run dev` serve a interface. Para testar o endpoint local, execute `npx wrangler dev` com credenciais de teste em um arquivo `.dev.vars` ignorado pelo Git. O assistente só recebe a pergunta, os dados escolhidos para a solicitação e o contexto agregado quando você marca essa opção. Ele não altera registros nem envia mensagens. Para links do YouTube sem texto, o Worker pode consultar título e autoria; para analisar conteúdo, informe descrição, resumo ou transcrição autorizada. Instagram e outros sites usam o texto fornecido pelo usuário.
