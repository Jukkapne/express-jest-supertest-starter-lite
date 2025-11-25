import jwt from "jsonwebtoken"; // Tuodaan jsonwebtoken-kirjasto, jota käytetään JWT-tunnusten (JSON Web Token) luomiseen, allekirjoittamiseen ja todentamiseen.

/**
 * Autentikointi-middleware-funktio (auth).
 *
 * Tätä funktiota käytetään suojaamaan API-reittejä. Se suoritetaan ennen varsinaista reitinkäsittelijää
 * ja tarkistaa, onko pyynnön mukana toimitettu kelvollinen JWT-tunnus.
 *
 * @param {object} req - Express-pyyntöobjekti (Request). Sisältää tiedot saapuvasta pyynnöstä.
 * @param {object} res - Express-vastausobjekti (Response). Käytetään vastausten lähettämiseen.
 * @param {function} next - Funktio, jolla siirrytään seuraavaan middlewareen tai reitinkäsittelijään.
 */
export const auth = (req, res, next) => {
  // 1. Haetaan tunnusta HTTP-otsakkeista
  // JWT-tunnus toimitetaan yleensä 'Authorization'-otsakkeessa (header), usein muodossa "Bearer <token>".
  // Tästä koodista puuttuu "Bearer "-etuliitteen käsittely, mutta oletetaan, että se sisältää vain itse tokenin.
  const token = req.headers["authorization"];

  // 2. Tarkistetaan, onko tunnusta ylipäätään olemassa
  if (!token) {
    // Jos 'Authorization'-otsaketta ei löydy, palautetaan heti vastaus 401 Unauthorized (Luvaton).
    return res.status(401).json({ message: "No token provided" });
  }

  // 3. Todennetaan tunnus
  // jwt.verify() yrittää purkaa ja vahvistaa tokenin.
  // Se tarvitsee tokenin, salaisen avaimen (JWT_SECRET) ja callback-funktion.
  jwt.verify(token, process.env.JWT_SECRET, (err) => {
    // process.env.JWT_SECRET on salainen avain, joka on tallennettu ympäristömuuttujaan
    // (tärkeää turvallisuuden kannalta: älä koskaan kovakoodaa salaista avainta koodiin!).

    // 4. Virheen käsittely
    if (err) {
      // Jos token on virheellinen (esim. vanhentunut, muokattu tai salattu väärällä avaimella),
      // palautetaan jälleen 401 Unauthorized (Luvaton) ja virhesanoma.
      return res.status(401).json({ message: "Failed to authenticate token" });
    }

    // 5. Jatka eteenpäin
    // Jos token on kelvollinen ja todennus onnistui, kutsutaan next().
    // Tämä siirtää suorituksen seuraavaan funtkioon reitillä, eli varsinaiseen API-käsittelijään.
    // Tässä vaiheessa tiedetään, että käyttäjä on todennettu.
    next();
  });
};

// Viedään auth-funktio, jotta sitä voidaan käyttää reiteissä, kuten edellisessä tiedostossa:
// router.post("/create", auth, async (req, res, next) => { ... });