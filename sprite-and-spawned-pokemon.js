let csvData = [];

async function loadCSV() {
  const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQGDH_-fnudK5_paOFc0mvl061ZyxOR2nXZ7GAJ4GGnyV0xVNn46sItanxBSziuQgNAqAwJFKYo9tUJ/pub?gid=651047664&single=true&output=csv');
  const text = await response.text();

  const lines = text.trim().split('\n');
  for (let i = 1; i < lines.length; i++) { // Skip header row
    csvData.push(lines[i].split(','));
  }
}

function getColumnByPokedexId(pokedexId, columnIndex) {
  const row = csvData.find(r => r[0] === pokedexId.toString());
  return row ? row[columnIndex] : null;
}

// Wait for the CSV to load first
window.onload = async () => {
  await loadCSV();

  // Example: Get Tier (column 2) for Pokedex ID 3
  const tier = getColumnByPokedexId(3, 2);
  console.log("Tier:", tier);

  // Example: Get Pretty Name (column 5) for Pokedex ID 3
  const name = getColumnByPokedexId(3, 5);
  console.log("Name:", name);
};

const backend_url = "https://poketwitch.bframework.de/";
const image_url = "https://dev.bframework.de/";
var sprite = document.getElementById("sprite-image")
var spawnedPokemonIdElement = document.getElementById("spawned-pokemon-id")

function display_questionmark() {
    let question_url = "static/pokedex/sprites/question.png"
    sprite.style["display"] = "block";
    sprite.src = image_url + question_url;
    spawnedPokemonIdElement.textContent = `No current spawn`;
    // sprite.src = image_url + "static/pokedex/sprites/front/" + "1" + ".gif";
}

var last_pokedex_id = 0;

function update_image() {
    // fetch image
    fetch(backend_url + 'info/events/last_spawn/').then(function (response) {
        return response.json();
    }).then(function (data) {
        var next_spawn = data.next_spawn
        var pokedex_id = data.pokedex_id
        var order = data.order

        if (next_spawn > (13 * 60) + 30) {
            if (last_pokedex_id === pokedex_id) {
                setTimeout(function () {
                    update_image();
                }, 3000);
                return;
            } else {
                last_pokedex_id = pokedex_id
            }

            // update and return if the pokedex id didn't update
            sprite.src = image_url + "static/pokedex/sprites/front/" + pokedex_id + ".gif";
            let tier = getColumnByPokedexId(pokedex_id, 2);
            let name = getColumnByPokedexId(pokedex_id, 5);
            spawnedPokemonIdElement.textContent = `Name:${name} ID:${pokedex_id} Tier:${tier}`;

            // bild nach den 90 sekunden verstecken
            var hide_picture_seconds = next_spawn - 810
            if (hide_picture_seconds <= 0) {
                hide_picture_seconds = 1
            }

            // refresh image in 810 seconds
            setTimeout(function () {
                // bild auf fragezeichen
                display_questionmark();
                // refresh image when new pokemon spawns
                setTimeout(function () {
                    update_image();
                }, (next_spawn - hide_picture_seconds) * 1000);
            }, hide_picture_seconds * 1000);

            // too late
        } else {
            // bild auf fragezeichen
            display_questionmark();


            // warte solange wie der nächste spawn braucht und update dann das image
            setTimeout(function () {
                update_image();
            }, next_spawn * 1000);
        }
    }).catch(function (error) {
        // bild auf fragezeichen
        display_questionmark();

        // fetch again in 10 seconds if fail
        setTimeout(function () {
            update_image();
        }, 10000);
    });

}

// startup script on load
update_image();

