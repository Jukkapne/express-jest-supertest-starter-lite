import pkg from "pg"; // Tuodaan koko 'pg' (node-postgres) kirjasto. Tämä on suosittu Node.js-kirjasto PostgreSQL-tietokantojen käsittelyyn.
import dotenv from "dotenv"; // Tuodaan 'dotenv'-kirjasto. Sitä käytetään ympäristömuuttujien lataamiseen .env-tiedostosta.

dotenv.config(); // Kutsutaan dotenv.config() -funktiota. Tämä lukee .env-tiedoston avain-arvo-parit ja lisää ne 'process.env'-objektiin.
// Tämän ansiosta salaiset tiedot (kuten tietokannan tunnus ja salasana) voidaan pitää erillään koodista.

const { Pool } = pkg; // Destrukturoidaan 'Pool'-luokka 'pg'-paketista. Pool-objektia käytetään hallinnoimaan useita yhteyksiä tietokantaan tehokkaasti.
// Yhteyspooli on suositeltava tapa hallita tietokantayhteyksiä tuotantosovelluksissa, "lainataan vapaa yhteys".

// Määritellään ympäristö, jossa sovellus parhaillaan toimii.
// Oletuksena käytetään "development" (kehitysympäristö), ellei NODE_ENV ole asetettu toisin (esim. "test" tai "production").
const env = process.env.NODE_ENV || "development";

/**
 * Tietokantayhteyspooli (pool).
 * Pool luodaan ja viedään (export), jotta sitä voidaan käyttää suorittamaan SQL-kyselyjä muissa tiedostoissa.
 */
export const pool = new Pool({
  // Käyttäjätunnus tietokantaan. Haetaan ympäristömuuttujasta.
  user: process.env.DB_USER,

  // Tietokantapalvelimen osoite (esim. localhost tai IP-osoite). Haetaan ympäristömuuttujasta.
  host: process.env.DB_HOST,

  // Valitaan tietokannan nimi ympäristön perusteella:
  // Jos sovellus on testitilassa (env === "test"), käytetään testitietokantaa (TEST_DB_NAME).
  // Muussa tapauksessa (esim. development tai production) käytetään normaalia tietokantaa (DB_NAME).
  database: env === "test" ? process.env.TEST_DB_NAME : process.env.DB_NAME,

  // Salasana tietokantaan. Haetaan ympäristömuuttujasta.
  password: process.env.DB_PASSWORD,

  // Porttinumero, jota tietokantapalvelin kuuntelee.
  // Käytetään ympäristömuuttujan arvoa tai oletuksena PostgreSQL:n standardia porttia 5432.
  port: Number(process.env.DB_PORT || 5432)
});