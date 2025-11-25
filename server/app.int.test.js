import request from "supertest"; // Tuodaan Supertest-kirjasto. Sitä käytetään HTTP-pyyntöjen tekemiseen Express-sovellukseen ilman varsinaista palvelimen käynnistämistä (ns. end-to-end-testaus).
import dotenv from "dotenv"; // Tuodaan dotenv ympäristömuuttujien lataamista varten.
dotenv.config(); // Ladataan ympäristömuuttujat .env-tiedostosta (tarvitaan JWT-salaisuutta varten).
import app from "./app.js"; // Tuodaan Express-sovellusinstanssi ('app'), jota testataan.
import { pool } from "./helper/db.js"; // Tuodaan tietokantayhteyspooli (pool) tietokantayhteyden sulkemiseksi testien jälkeen.
import jwt from "jsonwebtoken"; // Tuodaan jsonwebtoken tokenien luomista varten testeissä.

/**
 * Apuohjelmafunktio: Luo kelvollinen JWT-tunnus testausta varten.
 * Käytetään simuloimaan onnistuneesti sisäänkirjautunutta käyttäjää.
 * @param {string} email - Käyttäjän sähköposti, joka lisätään tokenin payloadiin.
 * @returns {string} - Kelvollinen JWT-tunnus.
 */
const getToken = (email = "student@example.com") =>
  jwt.sign({ email }, process.env.JWT_SECRET);
// jwt.sign luo tokenin käyttäen salaista avainta (JWT_SECRET) ympäristömuuttujista.

// --- Testien siivous ---

// afterAll on Jest/Mocha-testauskehyksen funktio, joka suoritetaan sen jälkeen, kun KAIKKI testit tässä tiedostossa ovat valmiit.
afterAll(async () => {
  // Suljetaan tietokantayhteyspooli, jotta Node.js-prosessi voi sammua siististi testien päätyttyä.
  await pool.end();
});

// --- Testitapaukset ---

/**
 * Testi 1: Testataan GET / (Hae kaikki tehtävät) -päätepistettä.
 * Tavoite: Varmistaa, että päätepiste palauttaa HTTP 200 -tilakoodin ja vastauksena JSON-taulukon.
 */
test("1) GET / palauttaa listan (200 + array)", async () => {
  // Tehdään GET-pyyntö juuripolkuun (/). request(app) ohjaa pyynnön suoraan Express-sovellukseen.
  const res = await request(app).get("/");
  // Odotetaan, että vastauksen HTTP-tilakoodi on 200 (OK).
  expect(res.status).toBe(200);
  // Odotetaan, että vastauksen runko (res.body) on JavaScript-taulukko.
  expect(Array.isArray(res.body)).toBe(true);
});

/**
 * Testi 2: Testataan POST /create (Luo tehtävä) -päätepistettä ilman todennusta.
 * Tavoite: Varmistaa, että päätepiste on suojattu ja palauttaa 401 Unauthorized (Luvaton) ilman JWT-tunnusta.
 */
test("2) POST /create ilman tokenia → 401", async () => {
  const res = await request(app)
    .post("/create") // Tehdään POST-pyyntö
    .send({ task: { description: "X" } }); // Lähetetään tarvittava data pyynnön rungossa (body).
  // Odotetaan 401, koska 'auth'-middleware (kts. aiempi tiedosto) estää pääsyn.
  expect(res.status).toBe(401);
});

/**
 * Testi 3: Testataan POST /create (Luo tehtävä) -päätepistettä kelvollisella todennuksella.
 * Tavoite: Varmistaa, että tehtävän luonti onnistuu ja palauttaa 201 Created sekä luodun tehtävän tiedot (id).
 */
test("3) POST /create tokenilla → 201 + id", async () => {
  const token = getToken(); // Luodaan kelvollinen testimielessä oleva JWT-tunnus.
  const res = await request(app)
    .post("/create")
    // Asetetaan Authorization-otsake (header) luodulla tokenilla. Tämä ohittaa 'auth'-middlewaren.
    .set("Authorization", token)
    .send({ task: { description: "Test task" } });
  // Odotetaan 201, joka ilmaisee resurssin onnistuneen luomisen.
  expect(res.status).toBe(201);
  // Odotetaan, että vastauksena palautetulla objektilla on 'id'-ominaisuus (tarkoittaa, että se on lisätty DB:hen).
  expect(res.body).toHaveProperty("id");
});

/**
 * Testi 4: Testataan POST /create (Luo tehtävä) -päätepistettä puutteellisella syötteellä.
 * Tavoite: Varmistaa, että palvelin hylkää pyynnön, jos vaadittu data puuttuu, palauttaen 400 Bad Request.
 */
test("4) POST /create puutteellisella syötteellä → 400", async () => {
  const token = getToken(); // Tarvitaan token, jotta testataan nimenomaan syötteen validointia, eikä todennusta.
  const res = await request(app)
    .post("/create")
    .set("Authorization", token)
    .send({ task: null }); // Lähetetään virheellinen tai puutteellinen data.
  // Odotetaan 400, koska validointilogiikka (kts. reititin) hylkää pyynnön.
  expect(res.status).toBe(400);
  // Odotetaan, että virhevastauksessa on 'error'-ominaisuus.
  expect(res.body).toHaveProperty("error");
});