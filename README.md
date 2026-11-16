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
