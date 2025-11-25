// jest.config.mjs

// Viedään (export) konfiguraatio-objekti, jonka Jest lukee käynnistyessään.
export default {
  // testEnvironment: "node"
  // Määrittelee, mikä ympäristö suorittaa testit.
  // "node" tarkoittaa, että testit suoritetaan Node.js-ympäristössä.
  // Tämä sopii API-testaukseen ja palvelinpuolen logiikkaan, jossa ei tarvita selainominaisuuksia (kuten DOM:ia).
  // Jos testattaisiin frontend-koodia, tässä käytettäisiin yleensä "jsdom".
  testEnvironment: "node",

  // transform: {}
  // Määrittelee, miten lähdetiedostot muunnetaan ennen testien suoritusta.
  // Tyhjä objekti ({}) tarkoittaa, että muunnos (esim. Babelin käyttö modernin JavaScriptin muuntamiseen vanhempaan) on **poissa käytöstä**.
  // Koska käytät .mjs-tiedostoja ja Node.js tukee natiivisti ES-moduuleja (import/export), et välttämättä tarvitse tätä monimutkaista muunnosta.
  // Tämä nopeuttaa testien suoritusta.
  transform: {},

  // testMatch: ["**/*.test.js"]
  // Määrittelee ne tiedostot, jotka Jestin tulee löytää ja suorittaa testeinä.
  // "**/*.test.js" tarkoittaa:
  // - ** : Etsi kaikista alikansioista.
  // - * : Kaikki tiedostonimet.
  // - .test.js: Tiedostonimen täytyy päättyä tähän päätteeseen (esim. 'todoRouter.test.js').
  testMatch: ["**/*.test.js"]
};