# express-jest-supertest-starter (LITE)

Minimi integraatiotestaus (4 testiä): GET 200, POST 401, POST 201, POST 400.

## Käyttö
1) Docker Desktop + Postgres (compose mukana: `docker compose up -d`).
2) Luo `server/.env` kopioimalla `.env.example`.
3) Aja `db.sql` dev- ja testikantaan (tai vähintään testikantaan).
4) `npm i && npm test` (server-kansiossa).

`npm test` ajaa komennon  
`"test": "cross-env NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --runInBand"`  

Tämä käynnistää Jestin, joka lataa Jest-kirjaston ja tekee testausfunktioista
(`test`, `expect`, `describe` jne.) globaaleja, joten niitä voi käyttää testitiedostoissa
ilman erillistä importia.
Lisäksi `cross-env` asettaa ympäristömuuttujan `NODE_ENV` arvoksi `test`,
joka kertoo sovellukselle, että se toimii testausympäristössä.