# Resumo do modelo de dados de votacoes

## Visao geral

O modulo de votacoes foi modelado para separar o dominio em quatro blocos principais:

1. Cadastro base da disputa eleitoral.
2. Estrutura geografica e territorial da votacao.
3. Cadastro de candidaturas.
4. Apuracao de votos em niveis de secao, zona e municipio.

Esse desenho permite importar dados detalhados por secao e, ao mesmo tempo, manter agregacoes prontas para consultas analiticas por zona e municipio.

## Entidades principais

### 1. Eleicoes

Tabela: `eleicoes`

- Finalidade: representa uma eleicao ou pleito por ano.
- Campos principais:
  - `id`
  - `ano`
  - `descricao`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - `ano` e unico.

### 2. Cargos

Tabela: `cargos`

- Finalidade: define o cargo disputado, como vereador, prefeito, deputado etc.
- Campos principais:
  - `id`
  - `descricao`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - `descricao` e unica.

### 3. Partidos

Tabela: `partidos`

- Finalidade: cadastro dos partidos politicos.
- Campos principais:
  - `id`
  - `sigla`
  - `nome`
  - `numero`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - `sigla` e unica.

### 4. Pessoas

Tabela: `pessoas`

- Finalidade: cadastro base de pessoas, usado principalmente para candidatos.
- Campos principais:
  - `id`
  - `nome`
  - `cpf`
  - `data_nascimento`
  - `titulo_eleitoral`
  - `email`
  - `telefone`
  - `genero`
  - `grau_instrucao`
  - `ocupacao`
  - `naturalidade`
  - `nacionalidade`
  - `foto_url`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - `cpf` e unico quando informado.
  - `titulo_eleitoral` e unico quando informado.
  - indice em `nome`.

### 5. Municipios

Tabela: `municipios`

- Finalidade: representa o municipio onde a eleicao e apurada.
- Campos principais:
  - `id`
  - `nome`
  - `uf`
  - `codigo_ibge`
  - `codigo_tse`
  - `latitude`
  - `longitude`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - `codigo_ibge` e unico quando informado.
  - `codigo_tse` e unico quando informado.
  - indices em `nome` e `uf`.

### 6. Zonas eleitorais

Tabela: `zonas_eleitorais`

- Finalidade: organiza a divisao eleitoral dentro do municipio.
- Campos principais:
  - `id`
  - `municipio_id`
  - `numero`
  - `nome`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - chave unica composta por `municipio_id` + `numero`.
  - relacionamento obrigatorio com `municipios`.

### 7. Locais de votacao

Tabela: `locais_votacao`

- Finalidade: representa o predio ou endereco onde existem secoes eleitorais.
- Campos principais:
  - `id`
  - `municipio_id`
  - `zona_id` nullable
  - `numero`
  - `nome`
  - `endereco`
  - `bairro`
  - `cep`
  - `latitude`
  - `longitude`
  - `created_at` e `updated_at`
- Regras:
  - relacionamento obrigatorio com `municipios`.
  - relacionamento opcional com `zonas_eleitorais`.

Observacao: diferentemente das demais tabelas do fluxo eleitoral, `locais_votacao` nao recebeu o campo `importacao_id` na migration de rastreabilidade por lote.

### 8. Secoes

Tabela: `secoes`

- Finalidade: representa a menor unidade fisica de apuracao.
- Campos principais:
  - `id`
  - `zona_id`
  - `local_votacao_id` nullable
  - `numero`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - chave unica composta por `zona_id` + `numero`.
  - relacionamento obrigatorio com `zonas_eleitorais`.
  - relacionamento opcional com `locais_votacao`.

### 9. Candidaturas

Tabela: `candidaturas`

- Finalidade: vincula uma pessoa a uma eleicao, cargo e partido.
- Campos principais:
  - `id`
  - `pessoa_id`
  - `eleicao_id`
  - `cargo_id`
  - `partido_id`
  - `numero`
  - `situacao`
  - `nome_urna`
  - `numero_processo`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - chave unica composta por `pessoa_id` + `eleicao_id` + `cargo_id`.
  - indices em `eleicao_id`, `cargo_id`, `partido_id` e `numero`.

## Tabelas de apuracao de votos

O sistema trabalha com tres niveis de consolidacao.

### 10. Votos por municipio

Tabela: `votos_municipio`

- Finalidade: total consolidado da candidatura dentro do municipio.
- Campos principais:
  - `id`
  - `candidatura_id`
  - `municipio_id`
  - `eleicao_id`
  - `cargo_id`
  - `total_votos`
  - `total_aptos`
  - `total_comparecimento`
  - `total_abstencoes`
  - `total_secoes`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - chave unica composta por `candidatura_id` + `municipio_id`.

### 11. Votos por zona

Tabela: `votos_zona`

- Finalidade: total consolidado da candidatura dentro da zona eleitoral.
- Campos principais:
  - `id`
  - `candidatura_id`
  - `zona_id`
  - `eleicao_id`
  - `cargo_id`
  - `total_votos`
  - `total_aptos`
  - `total_secoes`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - chave unica composta por `candidatura_id` + `zona_id`.

### 12. Votos por secao

Tabela: `votos`

- Finalidade: granularidade maxima da apuracao, registrando o resultado da candidatura por secao.
- Campos principais:
  - `id`
  - `candidatura_id`
  - `secao_id`
  - `zona_id`
  - `municipio_id`
  - `eleicao_id`
  - `cargo_id`
  - `votos`
  - `aptos`
  - `comparecimento`
  - `abstencoes`
  - `importacao_id` nullable
  - `created_at` e `updated_at`
- Regras:
  - chave unica composta por `candidatura_id` + `secao_id`.
  - indices em `eleicao_id`, `municipio_id`, `zona_id` e `secao_id`.

## Rastreabilidade de importacao

Tabela auxiliar: `importacoes`

- Finalidade: registrar os lotes de importacao de arquivos eleitorais.
- Campos principais:
  - `id`
  - `arquivo_nome`
  - `tipo`
  - `status`
  - `total_linhas`
  - `importados`
  - `erros`
  - `mensagem_erro`
  - `created_at` e `updated_at`
- Uso no dominio:
  - permite saber de qual arquivo veio cada registro.
  - permite exclusao por lote importado.
  - esta ligada por `importacao_id` na maior parte das tabelas eleitorais.

## Relacionamentos principais

### Cadeia territorial

- Um `municipio` possui muitas `zonas_eleitorais`.
- Uma `zona_eleitoral` possui muitas `secoes`.
- Um `local_votacao` pertence a um `municipio` e pode estar vinculado a uma `zona_eleitoral`.
- Uma `secao` pertence a uma `zona_eleitoral` e pode pertencer a um `local_votacao`.

### Cadeia de disputa

- Uma `pessoa` pode possuir varias `candidaturas`.
- Uma `candidatura` pertence a uma `pessoa`, uma `eleicao`, um `cargo` e um `partido`.

### Cadeia de apuracao

- Uma `candidatura` pode possuir muitos registros em `votos`, `votos_zona` e `votos_municipio`.
- `votos` representa o detalhe por secao.
- `votos_zona` representa a agregacao por zona.
- `votos_municipio` representa a agregacao por municipio.

## Leitura pratica do modelo

Em termos de negocio, o fluxo esperado e este:

1. Cadastra-se a eleicao, os cargos e os partidos.
2. Cadastram-se as pessoas e suas candidaturas.
3. Cadastra-se a malha territorial: municipio, zona, local de votacao e secao.
4. Importa-se a apuracao por secao em `votos`.
5. Mantem-se visoes consolidadas por `votos_zona` e `votos_municipio` para consulta rapida.

## Pontos de atencao

- A tabela `votos` repete `zona_id`, `municipio_id`, `eleicao_id` e `cargo_id`, mesmo ja sendo possivel chegar a esses dados por outros relacionamentos. Isso melhora consulta e filtro, mas exige consistencia na importacao.
- As tabelas agregadas `votos_zona` e `votos_municipio` tambem repetem `eleicao_id` e `cargo_id` para simplificar leitura analitica.
- `locais_votacao` ficou fora da adicao de `importacao_id`; se o objetivo for exclusao integral por lote, esse ponto merece revisao.
- O modelo favorece leitura e analise de resultado eleitoral, nao apenas cadastro transacional.