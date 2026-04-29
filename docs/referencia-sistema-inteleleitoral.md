# Referencia do Sistema Inteleleitoral

Este documento serve como memoria de produto e arquitetura para orientar novas demandas. Ele deve crescer conforme novas ideias, regras de negocio e decisoes tecnicas forem surgindo.

## 1. Visao do Produto

O **Inteleleitoral** e um sistema SaaS de visualizacao, analise e planejamento politico baseado em dados de eleicoes anteriores.

O objetivo central e permitir que politicos, equipes de campanha e assessorias entendam desempenho eleitoral historico por territorio e transformem esses dados em planejamento operacional.

O cliente compra acesso conforme sua area de atuacao, que pode ser:

- **Municipal**: foco em municipios, zonas, secoes e liderancas locais.
- **Estadual**: analise comparativa entre municipios, regioes, candidatos e bases eleitorais.
- **Federal**: visao ampliada para campanhas proporcionais ou majoritarias de maior abrangencia.

O sistema deve sempre respeitar o contexto SaaS: dados operacionais do cliente, favoritos, contatos, liderancas, relacionamentos e configuracoes devem ser isolados por cliente/usuario/conta.

## 2. Publico e Uso Principal

Usuarios esperados:

- Politico candidato ou mandatário.
- Coordenador de campanha.
- Analista eleitoral.
- Equipe de campo.
- Assessoria politica.
- Liderancas regionais com acesso controlado no futuro.

Principais perguntas que o sistema deve ajudar a responder:

- Onde o candidato teve mais votos?
- Em quais municipios, zonas, secoes e locais de votacao ha maior potencial?
- Quem sao os candidatos concorrentes ou aliados a monitorar?
- Onde ha liderancas, contatos e bases politicas vinculadas?
- Como a rede politica do candidato esta crescendo?
- Quais regioes precisam de acao de campo?

## 3. Modelo Mental do Sistema

O sistema tem dois grandes blocos:

1. **Dados eleitorais historicos**
   - Dados importados de arquivos oficiais ou fontes externas.
   - Base para visualizacao, comparacao e planejamento.
   - Exemplos: candidatos, votos por municipio, zona, secao, local de votacao, partidos, cargos e eleicoes.

2. **Dados operacionais do cliente**
   - Dados criados pela equipe dentro do SaaS.
   - Devem ser isolados por cliente/usuario.
   - Exemplos: candidatos favoritos/monitorados, contatos, liderancas, relacoes politicas, anotacoes, tarefas e planejamento.

## 4. Fluxo de Importacao de Dados

O sistema usa um padrao de importacao em duas fases:

1. **Importar para tabela matriz/raw**
   - O arquivo e espelhado em uma tabela principal bruta.
   - Nenhuma transformacao final deve ser feita nessa etapa.
   - Isso permite auditar, reprocessar e separar responsabilidades.

2. **Gerar dados finais**
   - A partir da tabela raw, o sistema popula as tabelas finais.
   - Essa etapa pode ser executada depois pela tela de geracao.

Tabelas raw atuais:

- `raw_candidatos`: recebe o arquivo base de candidatos/votos por municipio-zona.
- `raw_secoes`: recebe votos por secao e boletim de urna, pois o boletim complementa as secoes.

Tabelas finais importantes:

- `eleicoes`
- `cargos`
- `partidos`
- `pessoas`
- `candidaturas`
- `municipios`
- `zonas_eleitorais`
- `locais_votacao`
- `votos_municipio`
- `votos_zona`
- `votos_secao`

Regra importante: importacao e geracao devem continuar separadas. Ao importar, o sistema apenas grava a matriz. Ao gerar, ele valida e popula as tabelas finais.

## 5. Visualizacoes Eleitorais

O sistema deve permitir visualizar dados eleitorais em diferentes niveis:

- **Por municipio**
  - Total de votos por candidato.
  - Comparacao de desempenho territorial.
  - Mapa por municipio.

- **Por zona eleitoral**
  - Desempenho mais granular dentro do municipio/regiao.
  - Analise de concentracao de votos.

- **Por secao**
  - Detalhamento fino de onde o candidato foi votado.
  - Apoia planejamento de campo e liderancas locais.

- **Por local de votacao**
  - Agrupamento pratico para operacao de campanha.
  - Deve ser associado a coordenadas quando possivel.

Na tela de candidato, o mapa de votacao deve permitir alternar entre:

- Por municipio.
- Por zona.
- Por local de votacao.

## 6. Candidatos Favoritos / Monitoramento

O sistema deve permitir que cada usuario/cliente monitore candidatos importantes.

Finalidade:

- Acompanhar candidatos proprios, aliados, adversarios ou nomes estrategicos.
- Criar uma tela resumida com indicadores principais.
- Evitar que o usuario precise buscar sempre os mesmos candidatos.

Regra SaaS:

- Favoritos/monitorados pertencem ao usuario/cliente.
- Um cliente nao deve ver favoritos de outro cliente.

Indicadores resumidos esperados:

- Total de votos.
- Municipios com votos.
- Zonas com votos.
- Secoes com votos.
- Melhor municipio.
- Link rapido para o perfil completo do candidato.

## 7. Contatos

O sistema devera ter uma area de contatos para uso politico e operacional.

Tipos previstos:

- **Contato vinculado a candidato**
  - Pessoa associada diretamente a um candidato monitorado.
  - Pode representar apoiador, lideranca, assessor, coordenador local, doador, representante comunitario etc.

- **Contato avulso**
  - Pessoa cadastrada sem relacao inicial com um candidato.
  - Pode depois ser vinculada a candidatos, municipios, zonas, locais ou liderancas.

Campos que provavelmente serao uteis:

- Nome.
- Telefone/WhatsApp.
- Email.
- Municipio.
- Bairro/regiao.
- Zona/secao/local de votacao, se conhecido.
- Tipo de contato.
- Observacoes.
- Tags.
- Responsavel interno.
- Status de relacionamento.

## 8. Liderancas e Rede Politica

O sistema deve ter uma secao para criar conexoes entre politicos, liderancas e contatos.

Objetivo:

- Visualizar a rede de apoio do candidato.
- Entender crescimento territorial e relacional.
- Mapear quem influencia quem.
- Planejar expansao de base politica.

Visualizacao desejada:

- Arvore/rede hierarquica.
- Politico/candidato como raiz ou no central.
- Liderancas conectadas por territorio ou influencia.
- Contatos ligados a liderancas.
- Possibilidade futura de filtros por municipio, zona, bairro, cargo, partido ou tipo de lideranca.

Exemplo conceitual:

```text
Candidato
  Lideranca municipal
    Lideranca de bairro
      Contato / apoiador
      Contato / apoiador
  Coordenador regional
    Lideranca comunitaria
```

Essa area deve ajudar a responder:

- Quem esta trazendo novos apoios?
- Em quais regioes a rede esta crescendo?
- Quais liderancas concentram mais contatos?
- Onde ainda ha vazio politico?

## 9. Planejamento e Estrategia

O sistema deve evoluir para apoiar planejamento, nao apenas visualizacao.

Possiveis funcionalidades:

- Metas por municipio, zona, secao ou local de votacao.
- Priorizacao de areas com alto potencial.
- Tarefas para equipe de campo.
- Anotacoes por candidato, territorio, lideranca ou contato.
- Comparacao com eleicoes anteriores.
- Painel de risco/oportunidade.
- Segmentacao de bases eleitorais.

## 10. Principios de Produto

Decisoes futuras devem seguir estes principios:

- **SaaS primeiro**: tudo que for dado operacional deve respeitar isolamento por cliente/usuario.
- **Dado eleitoral auditavel**: manter raw/matriz e dados finais separados.
- **Territorio como eixo central**: municipio, zona, secao e local de votacao sao dimensoes essenciais.
- **Candidato como entidade estrategica**: candidatos podem ser visualizados, comparados, monitorados e conectados a contatos/liderancas.
- **Planejamento pratico**: cada tela deve ajudar a equipe a tomar uma acao.
- **Evolucao incremental**: novas ideias devem ser adicionadas neste documento antes ou durante a implementacao.

## 11. Glossario

- **Matriz/raw**: tabela que espelha o arquivo importado antes da transformacao.
- **Geracao**: processamento da matriz para popular tabelas finais.
- **Candidatura**: participacao de uma pessoa em uma eleicao/cargo/partido.
- **Pessoa**: individuo associado a uma ou mais candidaturas.
- **Favorito/monitorado**: candidato acompanhado por um usuario/cliente.
- **Contato**: pessoa cadastrada no SaaS para relacionamento politico.
- **Lideranca**: contato ou ator politico com capacidade de influencia sobre territorio ou grupo.
- **Rede/arvore politica**: estrutura de conexoes entre candidato, liderancas e contatos.

## 12. Backlog de Ideias

Itens previstos ou desejados para evolucao:

- Cadastro de contatos vinculados a candidato.
- Cadastro de contatos avulsos.
- Tags e filtros para contatos.
- Vinculo de contatos com municipio, zona, secao e local de votacao.
- Tela de rede/arvore de liderancas.
- Indicadores de crescimento da rede politica.
- Favoritar candidato direto pela tela de candidatos e pelo perfil do candidato.
- Comparacao entre candidatos monitorados.
- Metas eleitorais por territorio.
- Observacoes e historico de interacoes com contatos/liderancas.
- Controle de permissoes por equipe dentro do cliente.
- Restricao de acesso por plano/regiao contratada.

## 13. Decisoes Tecnicas Ja Assumidas

- O sistema usa Laravel no backend e Inertia/React no frontend.
- Telas e fluxos web devem usar Inertia. Nao criar telas novas com `react-router-dom`, `useNavigate`, `useSearchParams` ou chamadas diretas de SPA paralela ao roteamento Laravel/Inertia.
- Fluxos de autenticacao, cadastro e compra devem passar pelo Fortify/Inertia sempre que possivel, mantendo validacao e persistencia no backend Laravel.
- Importacao de dados eleitorais deve ser separada em matriz/raw e geracao.
- `raw_candidatos` e `raw_secoes` sao as tabelas de entrada bruta atuais.
- `votos_secao` e a tabela correta para dados detalhados de secao/local no fluxo novo.
- Favoritos/monitoramento devem ser salvos por `user_id`.
- Telas do app eleitoral ficam sob `/app`.
