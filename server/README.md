# express-jest-supertest-starter (LITE)

Minimi integraatiotestaus (4 testiä): GET 200, POST 401, POST 201, POST 400.

## Käyttö
1) Docker Desktop + Postgres (compose mukana: `docker compose up -d`).
2) Luo `server/.env` kopioimalla `.env.example`.
3) Aja `db.sql` dev- ja testikantaan (tai vähintään testikantaan).
4) `npm i && npm test` (server-kansiossa).

## Git (valinnainen)
Suorita `git-lite-init.ps1` (Windows) tai `git-lite-init.sh` (macOS/Linux) luodaksesi `lite`-branchn.
