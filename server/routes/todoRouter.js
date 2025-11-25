import { Router } from "express"; // Tuodaan Expressistä 'Router'-funktio, jota käytetään API-päätepisteiden (reittien) ryhmittelyyn ja määrittelyyn.
import { pool } from "../helper/db.js"; // Tuodaan tietokantayhteys (yleensä PostgreSQL 'pool') 'db.js'-tiedostosta. Tätä käytetään SQL-kyselyjen suorittamiseen.
import { auth } from "../helper/auth.js"; // Tuodaan autentikointi-/todennus-middleware 'auth.js'-tiedostosta. Tätä käytetään suojaamaan päätepisteitä.

const router = Router(); // Luodaan uusi Express-reititin-instanssi. Kaikki reitit liitetään tähän objektiin.

// --- GET / Reitti (Hae kaikki tehtävät) ---

// Käsittelee HTTP GET -pyynnöt polkuun '/'. Esimerkiksi http://localhost:3000/ (kun tämä reititin on liitetty juuripolkuun).
router.get("/", async (req, res, next) => {
  try {
    // Suoritetaan SQL-kysely tietokantaan: Haetaan kaikki rivit 'task'-taulusta ja järjestetään ne ID:n mukaan nousevasti.
    const { rows } = await pool.query("select * from task order by id asc");

    // Jos kysely onnistuu, palautetaan asiakkaalle (client) HTTP-tilakoodi 200 (OK).
    // Lähetetään vastauksena JSON-muodossa haetut rivit, tai tyhjä taulukko ([]), jos rivejä ei löydy.
    res.status(200).json(rows || []);
  } catch (err) {
    // Jos tietokantakyselyssä tapahtuu virhe, siirretään virhe seuraavalle
    // middleware-funktiolle (katso app.js tiedoston virheenkäsittelijä).
    next(err);
  }
});

// --- POST /create Reitti (Luo uusi tehtävä) ---

// Käsittelee HTTP POST -pyynnöt polkuun '/create'.
// Huomaa: 'auth' on tässä **middleware**-funktio, joka suoritetaan ensin.
// Se tarkistaa, onko käyttäjä todennettu ennen kuin sallitaan tehtävän luonti. 
router.post("/create", auth, async (req, res, next) => {
  try {
    // Puretaan (destrukturoidaan) tehtäväobjekti pyynnön rungosta (req.body).
    const { task } = req.body;

    // Tarkistetaan syötteen validiteetti: Onko 'task' olemassa ja onko sillä 'description'-kenttä.
    if (!task || !task.description) {
      // Jos syöte puuttuu, palautetaan heti HTTP-tilakoodi 400 (Bad Request - Virheellinen pyyntö) ja virhesanoma.
      return res.status(400).json({ error: "Task is required" });
    }

    // Suoritetaan SQL-kysely, joka lisää uuden tehtävän (kuvauksen) 'task'-tauluun.
    // Käytetään $1-paikkamerkkiä SQL-injektion estämiseksi.
    // 'returning *' pyytää tietokantaa palauttamaan lisätyn rivin kaikki tiedot (sisältää uuden ID:n).
    const { rows } = await pool.query(
      "insert into task (description) values ($1) returning *",
      [task.description] // $1-paikkamerkki korvataan 'task.description'-arvolla.
    );

    // Jos luonti onnistuu, palautetaan asiakkaalle HTTP-tilakoodi 201 (Created - Luotu).
    // Lähetetään vastauksena luotu rivi (ensimmäinen elementti 'rows'-taulukosta).
    res.status(201).json(rows[0]);
  } catch (err) {
    // Jos tietokantakyselyssä tai muussa käsittelyssä tapahtuu virhe, siirretään se seuraavalle virheenkäsittelijälle.
    next(err);
  }
});

// --- Moduulin vienti ---

export { router }; // Viedään tämä reititin, jotta se voidaan tuoda ja liittää Express-pääsovellukseen (kuten edellisessä tiedostossa nähtiin: app.use("/", todoRouter);).