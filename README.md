# my-ireland
Aplicativo pessoal para organização do meu intercâmbio na Irlanda.
# MY IRELAND — Atualização das configurações iniciais

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

## Primeira versão implementada

Aplicativo estático em JavaScript com Vite, interface responsiva em pt-BR e armazenamento em IndexedDB no navegador. Inclui dashboard financeiro, edição confirmada das configurações, pesquisa comparativa de cidades e simulação hipotética começando do zero.

Os valores monetários são armazenados em centavos inteiros. O seed inicial é idempotente e preserva configurações existentes. Saldo, data e cidade começam desconhecidos (`null`). As projeções usam apenas saldo confirmado e poupança mensal cadastrada, sem presumir rendimentos, inflação ou câmbio.

**Limites desta versão:** não há login, sincronização ou banco remoto. Os dados pertencem ao navegador e à origem do site; limpar o armazenamento ou mudar de domínio não transfere o planejamento. A seção de planejamento fornece orientações determinísticas locais; não há integração com um modelo de IA. Custos das cidades permanecem a pesquisar.

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

O Wrangler lê `wrangler.jsonc`, que publica `./dist` usando Workers Static Assets. Não há um Worker de backend nem campo `main`. Não configure um diretório de Pages: este fluxo usa Workers. As rotas da interface usam fragmentos (`#settings`, por exemplo), sem precisar de fallback de SPA.

Para publicar pelo terminal com autenticação Cloudflare já configurada:

```sh
npm run deploy
```

Tanto `npm run deploy` quanto `npx wrangler deploy` executam `npm run build` automaticamente pelo campo `build.command` do Wrangler, antes de publicar. A pasta `dist` não precisa existir previamente. Se o painel já tiver um comando de build configurado, ele pode ficar vazio para evitar compilação duplicada. A publicação real requer autenticação e acesso à conta Cloudflare; um dry run não publica o site.
