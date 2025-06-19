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

const backend_url = "https://poketwitch.bframework.de/";
const image_url = "https://dev.bframework.de/";
var sprite = document.getElementById("sprite-image")
var spawnedPokemonIdElement = document.getElementById("spawned-pokemon-id")

function display_questionmark() {
    let question_url = "static/pokedex/sprites/question.png"
    sprite.style["display"] = "block";
    sprite.src = image_url + question_url;
    spawnedPokemonIdElement.textContent = `No current spawn`;
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
            let gen = getColumnByPokedexId(pokedex_id, 4);
            spawnedPokemonIdElement.textContent = `${name} Tier:${tier} Gen:${gen} ID:${pokedex_id}`; // Furfrou-heart Tier:B Gen:6 ID:10344

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

window.addEventListener('load', async () => {
  await loadCSV();
  update_image();
});
