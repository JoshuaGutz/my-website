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

let last_pokedex_id = 0;
let pokedex_id;
let next_spawn;
let order;
// console.log(`DEBUG1 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);

function update_image() {
    // console.log(`DEBUG2 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
    fetch(backend_url + 'info/events/last_spawn/').then(function (response) {
        return response.json();
    }).then(function (data) {
        // console.log("Raw JSON fetched:", data);
        next_spawn = data.next_spawn
        pokedex_id = data.pokedex_id
        order = data.order
        // console.log(`DEBUG3 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);

        if (next_spawn > (13 * 60) + 30) {
            // console.log(`DEBUG4 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
            if ((next_spawn == 900 && last_pokedex_id == 0) || last_pokedex_id === pokedex_id) {
                // console.log(`DEBUG5 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
                setTimeout(function () {
                    update_image();
                }, 500);
                // console.log(`DEBUG6 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
                return;
            } else {
                // console.log(`DEBUG7 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
                last_pokedex_id = pokedex_id
                // console.log(`DEBUG8 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
            }

            // update and return if the pokedex id didn't update
            // console.log(`DEBUG9 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
            sprite.src = image_url + "static/pokedex/sprites/front/" + pokedex_id + ".gif";
            let tier = getColumnByPokedexId(pokedex_id, 2);
            let name = getColumnByPokedexId(pokedex_id, 5);
            let gen = getColumnByPokedexId(pokedex_id, 4);
            spawnedPokemonIdElement.textContent = `${name}\nTier:${tier} Gen:${gen} ID:${pokedex_id}`; // ex Furfrou-heart Tier:B Gen:6 ID:10344

            // bild nach den 90 sekunden verstecken
            var hide_picture_seconds = next_spawn - 810
            if (hide_picture_seconds <= 0) {
                hide_picture_seconds = 1
            }

            // refresh image in 810 seconds
            setTimeout(function () {
                display_questionmark();
                // refresh image when new pokemon spawns
                setTimeout(function () {
                    update_image();
                }, (next_spawn - hide_picture_seconds) * 1000);
            }, hide_picture_seconds * 1000);

        } else {
            display_questionmark();
            setTimeout(function () {
                update_image();
            }, next_spawn * 500);
        }
    }).catch(function (error) {
        display_questionmark();

        // fetch again in 10 seconds if fail
        setTimeout(function () {
            // console.log(`DEBUG10 last_pokedex_id=${last_pokedex_id ?? 'na'} pokedex_id=${pokedex_id ?? 'na'} next_spawn=${next_spawn ?? 'na'}`);
            update_image();
        }, 500);
    });
}

window.addEventListener('load', async () => {
  await loadCSV();
  update_image();
});
