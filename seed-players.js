const players = [
  "Jukka",
  "Dani",
  "Härski",
  "Nikke",
  "Eelis",
  "Dingo",
  "Peso",
  "Eero",
  "Miika",
  "Aleksi",
  "Antti",
  "Ossi",
  "Alepa",
  "Eemil",
  "Bremu",
  "Roope",
  "Joonas V",
  "Enzo",
  "Jesse",
  "Joonas L",
  "Kanki",
  "Jaska",
  "Räihä",
  "Jasu",
  "Viti",
  "Victor",
  "Teemu",
];

async function seedPlayers() {
  const response = await fetch("http://localhost:3000/api/seed-players", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ players }),
  });

  const result = await response.json();

  console.log(result);
}

seedPlayers();