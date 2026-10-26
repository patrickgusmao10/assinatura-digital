# Plano de Testes — Módulo de Assinatura Digital

**Disciplina:** Segurança da Informação — N2  
**Professor:** Claudinei Dias (Ney)  
**Projeto:** Assinatura Digital — Relatórios de Despesa  
**Equipe:** Patrick Gusmão, Lucas Moreira, Bruno Costa e Enzo Oliveira  
**Versão do documento:** 1.0 | **Data:** 26/10/2026  
**Repositório:** https://github.com/patrickgusmao10/assinatura-digital

## 1. Objetivo

Este plano organiza os testes funcionais, de integração, segurança e implantação do módulo de assinatura digital de relatórios de despesas. O foco principal é verificar se um funcionário consegue submeter uma despesa com recibos, se o gerente consegue validá-la e assiná-la, e se a aplicação consegue detectar alterações posteriores no documento. Também são contemplados o controle de acesso, a autenticação, as notificações por e-mail e o funcionamento dos serviços em ambiente local e publicado.

O documento foi elaborado com base no enunciado da N2, no código e README do projeto fornecido e nas 14 capturas de tela da entrega. **Uma captura demonstra somente o comportamento visível nela**: casos adicionais descritos neste plano não devem ser interpretados automaticamente como executados.

## 2. Escopo e abordagem

Serão considerados quatro níveis de verificação: testes funcionais das telas e do fluxo de despesas; testes de integração entre frontend, API, banco e serviço de e-mail; testes de segurança e criptografia; e verificações de implantação. O cenário prioritário é o percurso completo `pending → validated → signed → verify`, incluindo o cenário negativo de adulteração de dados.

**Fora do escopo desta entrega:** auditoria independente de segurança, teste de carga em larga escala, certificação ICP-Brasil, validação jurídica definitiva de não repúdio e garantia de persistência de arquivos no armazenamento efêmero do Render.

### 2.1 Ambiente de referência

| Componente | Tecnologia / ambiente | Verificação prevista |
|---|---|---|
| Frontend | Next.js 14, React, Material-UI, Tailwind | Interface local em `http://localhost:3000` e GitHub Pages por HTTPS |
| Backend | Node.js 20, Express | API local em `http://localhost:4000/api` e Render |
| Banco de dados | MongoDB local/Atlas | Persistência de usuários, despesas e auditoria |
| Contêineres | Docker Compose | Inicialização e isolamento dos serviços |
| E-mail de teste | Nodemailer e MailHog | Recebimento local em `http://localhost:8025` |
| Criptografia | Web Cryptography API, RSA-PSS 3072, SHA-256 | Assinatura, hash e verificação |

### 2.2 Pré-condições e dados de teste

- Docker Desktop ativo, serviços iniciados e variáveis de ambiente configuradas sem exposição de segredos.
- Usuário gerente e usuário funcionário distintos, com permissões apropriadas.
- Despesa de referência: **“Almoço com cliente”**, no valor de **R$ 85,50**, com recibo válido. Os valores correspondem ao cenário documentado nos prints.
- Para testar adulteração, utilizar **somente banco/registro de teste**, preservar o valor original e restaurá-lo ao final.
- Recibos de teste em PDF, PNG ou JPG, e arquivos inválidos preparados separadamente.
- Sessão de navegador normal e sessão anônima para os cenários de autenticação.

## 3. Critérios de entrada, saída e classificação

**Entrada:** aplicação iniciada, banco acessível, usuários de teste disponíveis e fluxo básico de cadastro operacional. **Saída:** todos os casos críticos executados e registrados; nenhuma falha crítica aberta em assinatura, integridade ou autorização; eventuais restrições documentadas.

| Resultado | Significado |
|---|---|
| Aprovado | Resultado esperado observado e registrado |
| Reprovado | Resultado observado diverge do esperado |
| Bloqueado | Dependência impede execução |
| Não executado | Caso previsto, ainda sem execução comprovada |
| Evidência parcial | Print ou README sustenta parte do caso, mas não toda a validação |

**Prioridade:** P0 = segurança/integridade crítica; P1 = fluxo essencial; P2 = funcionalidade complementar/infraestrutura.

## 4. Casos de teste

### 4.1 Autenticação, autorização e funcionários

| ID | Prioridade | Procedimento resumido | Resultado esperado | Evidência / situação documental |
|---|---|---|---|---|
| CT-01 | P1 | Autenticar gerente com credenciais válidas | Acesso ao dashboard e identificação do perfil | Prints 1 e 2; evidência visual do acesso |
| CT-02 | P1 | Informar senha incorreta | Autenticação recusada sem revelar credenciais | Previsto; sem print específico |
| CT-03 | P0 | Repetir tentativas inválidas até o limite | Bloqueio temporário com mensagem adequada | Print 13; bloqueio de 15 minutos observado |
| CT-04 | P0 | Abrir página administrativa como funcionário | Operação bloqueada no frontend **e** na API | Descrito no README; sem print específico |
| CT-05 | P0 | Acessar recurso protegido sem sessão/JWT válido | Acesso negado | Previsto; sem print específico |
| CT-06 | P1 | Criar, listar, editar e excluir funcionário | CRUD consistente; exclusão lógica quando aplicável | Descrito no README; sem print específico |
| CT-07 | P0 | Enviar requisição mutável sem token CSRF válido | API recusa alteração | Previsto com base no mecanismo descrito no README |

### 4.2 Despesas, validação e assinatura

| ID | Prioridade | Procedimento resumido | Resultado esperado | Evidência / situação documental |
|---|---|---|---|---|
| CT-08 | P1 | Cadastrar despesa com recibo permitido | Documento salvo com status `pending` | Fluxo descrito no README; dashboard no print 2 |
| CT-09 | P1 | Validar despesa como gerente | Status passa a `validated` | Notificação “Despesa validada” no print 4 |
| CT-10 | P1 | Rejeitar despesa e registrar observação | Status `rejected` e registro da decisão | Descrito no README; sem print específico |
| CT-11 | P0 | Tentar validar/assinar despesa enviada pelo próprio gerente | Segregação de funções impede a ação | Regra descrita no README; sem print específico |
| CT-12 | P0 | Assinar despesa validada com senha correta | Status `signed`, assinatura RSA-PSS e metadados persistidos | Prints 2, 3 e 5; notificação no print 4 |
| CT-13 | P0 | Tentar assinar com senha incorreta | Chave privada não é liberada e assinatura não ocorre | Previsto; sem print específico |
| CT-14 | P1 | Consultar lista de assinados e abrir verificação | Documento e informações de assinatura exibidos | Prints 2, 3 e 5 |

### 4.3 Criptografia, autenticidade e integridade

| ID | Prioridade | Procedimento resumido | Resultado esperado | Evidência / situação documental |
|---|---|---|---|---|
| CT-15 | P0 | Verificar despesa assinada sem alterações | Autenticidade, dados, recibos e vínculo da chave aprovados | Prints 3 e 5 |
| CT-16 | P0 | Alterar `amount` de 85,50 para 9999 diretamente no banco de teste e verificar | Verificação geral **inválida**; dados do documento apontam inconsistência | Print 6; comando e retorno visíveis |
| CT-17 | P0 | Restaurar `amount` para 85,50 e verificar novamente | Verificação geral volta a ser **válida** | Print 7; restauração e resultado visíveis |
| CT-18 | P0 | Alterar os bytes de um recibo após a assinatura | Hash SHA-256 diverge e integridade do recibo falha | Previsto; sem print específico |
| CT-19 | P0 | Substituir assinatura Base64 por valor inválido | Verificação criptográfica falha | Previsto; sem print específico |
| CT-20 | P0 | Tentar verificar assinatura com chave pública diferente | Autenticidade falha | Previsto; sem print específico |
| CT-21 | P0 | Inspecionar armazenamento da chave privada | Chave privada não deve aparecer em texto puro; deve estar cifrada | Implementação descrita no README; teste manual não evidenciado |

**Observação técnica do CT-16:** no print, a assinatura RSA-PSS continua sendo exibida como matematicamente válida para o conteúdo originalmente assinado, enquanto a comparação com os dados atuais falha. Portanto, a conclusão correta é que **a verificação global do documento é inválida**, e não que a assinatura original tenha necessariamente sido corrompida.

### 4.4 Upload, notificações e auditoria

| ID | Prioridade | Procedimento resumido | Resultado esperado | Evidência / situação documental |
|---|---|---|---|---|
| CT-22 | P1 | Enviar PDF/PNG/JPG dentro do limite | Arquivo aceito e vinculado à despesa | Descrito no README; sem print específico |
| CT-23 | P0 | Enviar formato proibido ou extensão disfarçada | Upload rejeitado por tipo/magic bytes | Teste informado no README; sem print específico |
| CT-24 | P1 | Enviar arquivo maior que 5 MB ou mais de cinco anexos | Upload rejeitado | Previsto com base nas regras descritas |
| CT-25 | P1 | Executar recebimento, validação e assinatura | Notificações correspondentes chegam ao MailHog | Print 4: quatro mensagens visíveis |
| CT-26 | P1 | Abrir notificação de assinatura | Conteúdo identifica despesa e signatário | Print 5 (MailHog) |
| CT-27 | P1 | Consultar trilha de auditoria após ações relevantes | Eventos persistidos com informações de rastreabilidade | Coleção `auditlogs` visível no print 9; eventos não inspecionados no print |

### 4.5 Infraestrutura e publicação

| ID | Prioridade | Procedimento resumido | Resultado esperado | Evidência / situação documental |
|---|---|---|---|---|
| CT-28 | P1 | Inicializar `docker compose up --build` | Contêineres da aplicação iniciam corretamente | Print 14 mostra stack ativa; não comprova todos os healthchecks |
| CT-29 | P1 | Consultar cluster MongoDB Atlas | Cluster disponível | Print 8 |
| CT-30 | P1 | Inspecionar coleções da aplicação no Atlas | `users`, `expenses` e `auditlogs` presentes | Print 9; existência comprovada, conteúdo de todas não |
| CT-31 | P0 | Revisar IP Access List do Atlas | Acesso de rede conforme necessidade e política de segurança | Print 10 mostra configuração `0.0.0.0/0` proposta; **não comprova restrição segura** |
| CT-32 | P1 | Consultar logs de implantação no Render | API publicada e serviço inicializado | Print 11 mostra deploy concluído e serviço ativo |
| CT-33 | P1 | Abrir frontend no GitHub Pages por HTTPS | Página acessível com conexão TLS válida | Print 12 |
| CT-34 | P1 | Fazer login e executar operação completa na versão publicada | Frontend, API e Atlas funcionam integrados | Previsto; prints não comprovam fluxo ponta a ponta na produção |
| CT-35 | P0 | Conferir políticas de contêiner, Helmet, cookies e CORS | Configurações restritivas efetivas | Configurações descritas no README; execução/auditoria não evidenciada |

## 5. Roteiros detalhados dos testes críticos

### RT-01 — Assinatura íntegra

**Pré-condição:** funcionário cadastrou despesa e gerente a validou.  
**Passos:** (1) acessar documentos pendentes; (2) abrir documento validado; (3) confirmar assinatura com a senha do gerente; (4) acessar assinados; (5) selecionar “Verificar assinatura digital”.  
**Resultado esperado:** assinatura RSA-PSS validada pela chave pública; dados da despesa idênticos aos dados assinados; recibos com hashes correspondentes; chave vinculada ao signatário; resultado geral válido.  
**Evidências:** prints 2, 3 e 5. **Situação:** evidenciado visualmente.

### RT-02 — Detecção de adulteração

**Pré-condição:** despesa assinada e íntegra; backup do valor original.  
**Passos:** (1) no banco de testes, alterar o campo `amount` da despesa de `85.5` para `9999`; (2) recarregar a verificação da assinatura; (3) observar separadamente a verificação criptográfica e a integridade dos dados.  
**Resultado esperado:** a interface indica “Assinatura INVÁLIDA: há inconsistências”; a seção “Dados do documento íntegros” apresenta falha; verificações não afetadas pela mudança podem continuar aprovadas.  
**Evidência:** print 6. **Situação:** evidenciado visualmente.

### RT-03 — Restauração do dado

**Pré-condição:** RT-02 concluído.  
**Passos:** (1) restaurar `amount` para `85.5`; (2) verificar novamente; (3) confirmar os quatro controles aprovados.  
**Resultado esperado:** a verificação global volta a indicar documento autêntico e íntegro, desde que nenhum outro dado tenha sido alterado.  
**Evidência:** print 7. **Situação:** evidenciado visualmente.

### RT-04 — Limitação de tentativas de login

**Pré-condição:** usuário de teste sem bloqueio prévio.  
**Passos:** (1) repetir autenticações inválidas até ultrapassar o limite configurado; (2) tentar novo login; (3) observar a mensagem.  
**Resultado esperado:** bloqueio temporário, sem criação de sessão autenticada; mensagem de espera. O README indica limite de 10 tentativas por 15 minutos.  
**Evidência:** print 13. **Situação:** bloqueio observado; contagem exata de tentativas não demonstrada no print.

## 6. Matriz de rastreabilidade — enunciado N2

| Exigência | Casos relacionados | Evidências principais |
|---|---|---|
| Docker e políticas de segurança | CT-28, CT-35 | 14 |
| Banco MongoDB e uso de nuvem | CT-29, CT-30, CT-31 | 8, 9, 10 |
| Interface React/Next.js, MUI e Tailwind | CT-01, CT-08, CT-14, CT-33 | 1, 2, 12 |
| Backend Node/Express e JWT | CT-01 a CT-07, CT-34 | 1, 2, 13 |
| Criptografia, assinatura e verificação | CT-12, CT-15 a CT-21 | 3, 6, 7 |
| Proteções XSS, CSRF, injeção, Helmet e HTTPS | CT-03, CT-07, CT-23, CT-33, CT-35 | 12, 13 |
| Login, dashboard e CRUD de funcionários | CT-01, CT-06 | 1, 2 |
| Envio, validação, assinatura e consulta de despesas | CT-08 a CT-14 | 2, 3, 4 |
| Notificações com Nodemailer | CT-25, CT-26 | 4, 5 |
| Verificação de autenticidade e integridade | CT-15 a CT-20 | 3, 6, 7 |

## 7. Catálogo das evidências fornecidas

| Print | Arquivo original | O que demonstra |
|---|---|---|
| 1 | `1- tela inicial.png` | Login da aplicação |
| 2 | `2- painel geral.png` | Dashboard e despesa assinada |
| 3 | `3- assinatura validada.png` | Verificação global positiva |
| 4 | `4- mailhog.png` | Caixa com notificações de etapas do fluxo |
| 5 | `5- detalhes validação.png` | E-mail aberto com confirmação de assinatura |
| 6 | `6- inconsistência na assinatura.png` | Alteração do valor e verificação negativa |
| 7 | `7- inconsistência desfeita via banco CMD.png` | Restauração do valor e verificação positiva |
| 8 | `8- atls db online.png` | Cluster Atlas ativo |
| 9 | `9- banco online.png` | Coleções MongoDB Atlas |
| 10 | `10- ip access list.png` | Tela de configuração de acesso por IP |
| 11 | `11- api live.png` | Serviço da API ativo no Render |
| 12 | `12- conexão segura.png` | Frontend no GitHub Pages com HTTPS |
| 13 | `13- muitas tentativas senha.png` | Bloqueio temporário de login |
| 14 | `14- painel do docker.png` | Ambiente Docker Desktop |

> Os nomes dos prints foram preservados para facilitar a correspondência com o relatório de entrega. Para exibir as imagens no Markdown do repositório, é necessário copiá-las para uma pasta versionada e ajustar os caminhos relativos; este arquivo não pressupõe que elas já estejam no GitHub.

## 8. Riscos, ressalvas e ações recomendadas

1. **Exposição de rede do Atlas:** o print 10 mostra a preparação de uma entrada `0.0.0.0/0`, que permitiria conexões de qualquer IPv4. A captura não comprova que essa regra foi efetivamente aplicada. Caso seja necessária no Render, compensar com autenticação forte, menor privilégio e monitoramento; preferir restrição de origem quando possível.
2. **Persistência de anexos em produção:** o README informa que o disco gratuito do Render é temporário. Testar reinício/redeploy com recibos anexados e considerar armazenamento persistente para uso real.
3. **E-mails em produção:** sem SMTP configurado, o README informa que a API registra notificações em log, mas não necessariamente as entrega. Não confundir a evidência local do MailHog com entrega de e-mail no ambiente publicado.
4. **Natureza jurídica da assinatura:** o projeto utiliza chaves próprias e não demonstra certificação ICP-Brasil; não classificar a implementação como assinatura qualificada.
5. **Segurança complementar:** executar testes negativos de CSRF, XSS, upload, controle de acesso e manipulação de recibos antes de declarar cobertura de segurança completa.

## 9. Registro de execução sugerido

Preencher esta tabela durante a execução ou anexar a uma issue/PR de testes.

| Caso | Data | Ambiente | Executor | Resultado | Evidência / observação |
|---|---|---|---|---|---|
| CT-__ | AAAA-MM-DD | Local / Produção | — | Não executado | — |
| CT-__ | AAAA-MM-DD | Local / Produção | — | Não executado | — |

## 10. Conclusão

As evidências apresentadas sustentam o funcionamento do fluxo principal de assinatura e verificação, especialmente o teste de adulteração do valor da despesa e sua reversão. Também há demonstrações visuais de autenticação, bloqueio por tentativas excessivas, notificações locais, infraestrutura Docker, banco MongoDB Atlas e publicação HTTPS. A cobertura documental não equivale à execução integral de todos os casos aqui planejados: os testes negativos adicionais, as verificações de autorização e a operação ponta a ponta na implantação pública permanecem como pontos recomendados para uma validação formal completa.

**Fontes de referência:** enunciado `N2-Criptografia.pdf`; projeto fornecido em `assinatura-digital.zip`; capturas de tela 1 a 14; README e código-fonte do repositório indicado no cabeçalho.