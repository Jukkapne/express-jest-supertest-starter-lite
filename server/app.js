import express from "express"; // Tuodaan Express-moduuli. Express on suosittu Node.js-kehys, jota käytetään web-sovellusten ja API:en rakentamiseen.
import cors from "cors"; // Tuodaan CORS-moduuli. CORS (Cross-Origin Resource Sharing) on mekanismi, joka sallii selaimen tehdä pyyntöjä toisessa osoitteessa/portissa sijaitsevaan palvelimeen.
import { router as todoRouter } from "./routes/todoRouter.js"; // Tuodaan reititin moduulista './routes/todoRouter.js'. Tämä reititin sisältää TODO-sovelluksen API-päätepisteet (esim. tehtävien lisääminen, hakeminen).

// --- Express-sovelluksen alustus ja Middleware-asetukset ---

const app = express(); // Luodaan Express-sovellusinstanssi. Koko API-logiikka rakennetaan tämän 'app'-objektin ympärille.

// Otetaan käyttöön middleware-toiminnot, jotka suoritetaan ennen varsinaisia reitinkäsittelijöitä.

// Käytetään CORS-middlewarea. Oletuksena sallii pyynnöt mistä tahansa alkuperästä.
app.use(cors());

// Käytetään Expressin sisäänrakennettua middlewarea, joka jäsentää saapuvat JSON-muotoiset pyyntöjen rungot (request bodies).
// Tämä mahdollistaa esim. POST- tai PUT-pyyntöjen mukana lähetettyjen tietojen lukemisen 'req.body'-objektista.
app.use(express.json());

// --- Reititys ---

// Liitetään TODO-sovelluksen reititin Express-sovellukseen.
// Kaikki pyynnöt, jotka alkavat juuripolulla ("/") ohjataan 'todoRouterin' käsiteltäväksi.
// Esim. pyyntö osoitteeseen http://localhost:3000/todos ohjautuu tähän reitittimeen.
app.use("/", todoRouter);

// --- Virheenkäsittelijä-middleware ---

// Tämä on Expressin erityinen virheenkäsittelijä-middleware.
// Se tunnistaa virheenkäsittelijän neljän argumentin perusteella: (err, req, res, next).
// Jos jossakin yllä olevassa reitissä tai middleware-käsittelijässä kutsutaan next(error),
// suoritus siirtyy tähän funktioon.
app.use((err, req, res, next) => {
  // Määritellään HTTP-tilakoodi. Jos virheobjektissa (err) on 'status'-kenttä (esim. 404), sitä käytetään.
  // Muuten käytetään oletuksena 500 (Internal Server Error - Sisäinen palvelinvirhe).
  const status = err?.status || 500;

  // Lähetetään virhevastaus takaisin asiakkaalle (selaimelle/sovellukselle).
  // Asetetaan HTTP-tilakoodi ja lähetetään JSON-objekti, joka sisältää virhesanoman ja tilakoodin.
  res.status(status).json({ error: { message: err.message, status } });
});

// --- Moduulin vienti ---

export default app; // Viedään konfiguroitu Express-sovellusinstanssi, jotta se voidaan tuoda toiseen tiedostoon (esim. 'index.js' tai 'server.js') ja käynnistää palvelin.