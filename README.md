# Módulo de Assinatura Digital – Relatórios de Despesa

Trabalho N2 – Segurança da Informação. Fluxo: **Funcionário** envia despesa com recibos → **Gerente** valida → **Gerente** assina digitalmente → **Gerente** verifica a assinatura (autenticidade, integridade, não repúdio).

## Executar localmente
```bash
cp .env.example .env        # ajuste os segredos
docker compose up --build
```
- Frontend: http://localhost:3000 · API: http://localhost:4000/api · E-mails de teste (MailHog): http://localhost:8025
- Login inicial: valores `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD` do `.env`. Cadastre funcionários em **Funcionários**.

## Roteiro de teste
1. Entre como Gerente e cadastre um Funcionário. 2. Saia e entre como Funcionário → **Nova despesa** (anexe PDF/PNG/JPG).
3. Entre como Gerente → **Pendentes** → Validar → Assinar (confirma com a senha). 4. **Assinados** → Verificar.
5. Teste de adulteração: altere um campo da despesa direto no MongoDB (ou um arquivo no volume `uploads`) e verifique de novo: a verificação deve falhar.

## Como cada requisito é atendido
| Requisito do enunciado | Implementação |
|---|---|
| 1. Docker com políticas de segurança | `docker-compose.yml`: `no-new-privileges`, `cap_drop: ALL`, FS somente leitura (backend), usuário não-root, limites de memória/PIDs, rede `internal` isolada para o banco, nginx sem root |
| 2. Banco (MongoDB) em nuvem | Mongoose; `MONGODB_URI` aceita **MongoDB Atlas** (recomendado em produção). Coleções: `users`, `expenses` (com assinatura), `auditlogs` |
| 3. Frontend Next.js + MUI + Tailwind | `frontend/` (Pages Router, Material-UI para componentes, Tailwind para layout/estilo, responsivo) |
| 4. Backend Node/Express + JWT | `backend/src`; JWT HS256 em cookie `httpOnly` de 2 h; papéis Gerente/Funcionário |
| 5. Criptografia (Node Crypto + Web Crypto API) | `backend/src/crypto.js`: par RSA-PSS 3072 gerado com `crypto.subtle`; assinatura/verificação com `subtle.sign/verify`; chave privada cifrada com AES-256-GCM (scrypt a partir da senha); hash SHA-256 dos recibos |
| 6. Segurança | Zod (validação), `express-mongo-sanitize` (injeção NoSQL), sanitização `<>` + CSP (XSS), token CSRF no JWT + `SameSite`, Helmet, rate limit no login, bcrypt (custo 12), upload com whitelist + *magic bytes*, trilha de auditoria. HTTPS: GH Pages (front) + TLS no host da API |
| 7. Páginas mínimas | `login`, `dashboard`, `employees`, `submitExpense`, `pendingExpenses`, `validateExpense`, `signExpense`, `signedExpenses`, `verifySignature` · E-mail: `mailer.js` (Nodemailer) em envio, validação/rejeição e assinatura |

## Assinatura digital (como funciona)
1. Ao criar o usuário é gerado um par de chaves; a pública fica no banco e a privada **só existe cifrada** (AES-256-GCM, chave derivada da senha do usuário).
2. Ao assinar, o Gerente confirma a senha; a chave privada é decifrada apenas em memória e assina o **JSON canônico** (dados da despesa + SHA-256 de cada recibo + validador + signatário + data/hora).
3. A verificação confere: **autenticidade** (assinatura × chave pública), **integridade** (dados atuais e hashes dos arquivos × conteúdo assinado) e **não repúdio** (a chave pertence ao signatário e só ele a destrava). Segregação de funções: ninguém valida/assina o próprio documento.

## Publicação (GH Pages com HTTPS)
- O GitHub Pages hospeda **apenas site estático**: publica-se o frontend (export estático). O workflow `.github/workflows/deploy-pages.yml` faz o build; defina o secret `API_URL` e ative *Settings → Pages → Source: GitHub Actions*.
- A **API precisa ser hospedada em outro serviço com HTTPS** (Render, Railway, Fly.io…) usando MongoDB Atlas. Configure `CORS_ORIGIN=https://SEU-USUARIO.github.io`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`. Obs.: navegadores que bloqueiam cookies de terceiros podem exigir que front e API compartilhem o mesmo domínio raiz (domínio próprio).

## Limitações (para citar no trabalho)
- É assinatura eletrônica **avançada** (Lei 14.063/2020), com chaves próprias. Validade **qualificada** (ICP-Brasil, MP 2.200-2/2001) exigiria certificado A1/A3 e carimbo do tempo (RFC 3161); a data aqui é a do servidor.
- Senha do usuário não pode ser alterada pelo CRUD (ela protege a chave privada); para trocar, recria-se o usuário.
