/*
*/
// Variables to manage the state
let pokemonSet = new Set();  // To track the listed Pokemon
let resultsCount = 0;
let pokemonList = [];
let pokemonByName = new Map();

const searchButton = document.getElementById('search-btn');
const clearButton = document.getElementById('clear-btn');
const pokemonDataUrl = new URL('PCGmons-NEW [2025-05-28].txt', window.location.href);

// Disable the search button until the bundled data is loaded.
searchButton.disabled = true;

loadPokemonData();

// Function to load bundled PCGmons data
async function loadPokemonData() {
    try {
        const response = await fetch(pokemonDataUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const fileContent = await response.text();
        pokemonList = parsePokemonFile(fileContent);
        pokemonByName = buildPokemonIndex(pokemonList);

        if (pokemonList.length === 0) {
            throw new Error('No valid Pokemon rows were parsed.');
        }

        searchButton.disabled = false;
        console.log(`Loaded ${pokemonList.length} Pokemon rows.`);
    } catch (error) {
        searchButton.disabled = true;
        console.error('Unable to load bundled PCGmons data', error);
        alert('Unable to load PCGmons-NEW data automatically. Please make sure the page is being served from the hosted site and the text file is available.');
    }
}

// Function to parse PCGmons-NEW rows into Pokemon objects
function parsePokemonFile(fileContent) {
    return fileContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parsePokemonRow)
        .filter(Boolean);
}

function parsePokemonRow(rawLine) {
    const rowPattern = /^(?:Pokemon|Pok\u00e9mon):\s*(.*?)\s*-\s*Tier:\s*(.*?)\s*-\s*Type:\s*(.*?)\s*-\s*Gen:\s*(\d+)\s*-\s*Weight:\s*([\d.]+)\s*kg\s*-\s*Base:\s*(\d+)\s*-\s*Speed:\s*(\d+)\s*-\s*HP:\s*(\d+)\s*-\s*Attack:\s*(\d+)\s*-\s*Defense:\s*(\d+)\s*-\s*Sp\.\s*Atk:\s*(\d+)\s*-\s*Sp\.\s*Def:\s*(\d+)\s*-\s*Type effectiveness:\s*(.*)$/i;
    const match = rawLine.match(rowPattern);

    if (!match) {
        console.warn('Skipping invalid Pokemon row:', rawLine);
        return null;
    }

    return {
        rawLine,
        name: match[1].trim(),
        tier: match[2].trim(),
        types: match[3].split('/').map((type) => type.trim().toLowerCase()).filter(Boolean),
        generation: Number(match[4]),
        weightKg: Number(match[5]),
        base: Number(match[6]),
        speed: Number(match[7]),
        hp: Number(match[8]),
        attack: Number(match[9]),
        defense: Number(match[10]),
        specialAttack: Number(match[11]),
        specialDefense: Number(match[12]),
        typeEffectiveness: match[13].split('|').map((entry) => entry.trim()).filter(Boolean)
    };
}

function buildPokemonIndex(pokemonRows) {
    const index = new Map();
    pokemonRows.forEach((pokemon) => {
        const key = normalizePokemonName(pokemon.name);
        if (!index.has(key)) {
            index.set(key, pokemon);
        }
    });
    return index;
}

function normalizePokemonName(pokemonName) {
    return pokemonName.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Add event listener for the Enter key
document.getElementById("pokemon-name").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission if in a form
        const pokemonName = document.getElementById('pokemon-name').value.trim();
        if (pokemonName) {
            handleSearch(pokemonName);
        }
    }
});

// Function to handle the search
document.getElementById('search-btn').addEventListener('click', function () {
    const pokemonName = document.getElementById("pokemon-name").value.trim();
    if (pokemonName) {
        handleSearch(pokemonName);
    }
});

// Function to clear the list of Pokemon
clearButton.addEventListener('click', function () {
    pokemonSet.clear();
    document.getElementById("pokemon-name").value = "";
    document.getElementById('results-list').innerHTML = '';
    const dataEntry = document.getElementById('data-entry');
    dataEntry.style.display = 'none';
    resultsCount = 0;
});

// Function to handle the search operation
function handleSearch(pokemonName) {
    document.getElementById("pokemon-name").value = "";
    const pokemonData = searchPokemonInFile(pokemonName);

    if (pokemonData) {
        // Pokemon found in the file
        addResultToList(pokemonData.rawLine, pokemonData.name, false, pokemonData.types);
    } else {
        // Pokemon not found, prompt for input
        addResultToList('!pokemon ' + pokemonName, pokemonName, true);
    }
}

// Function to search the loaded PCGmons data
function searchPokemonInFile(pokemonName) {
    if (pokemonByName.size === 0) {
        console.error('No Pokemon data loaded');
        alert('PCGmons data is still loading or failed to load. Please refresh the page and try again.');
        return null;
    }

    return pokemonByName.get(normalizePokemonName(pokemonName)) || null;
}

// Function to add a result to the list
function addResultToList(result, pokemonName, notFound = false, types = []) {
    const resultsList = document.getElementById('results-list');
    const pokemonKey = normalizePokemonName(pokemonName);

    // Check if the Pokemon is already listed
    if (pokemonSet.has(pokemonKey)) {
        flashExistingPokemon(pokemonKey);
        return;
    }

    const listItem = document.createElement('li');

    listItem.classList.add("results-list-item"); // Add the class here

    listItem.innerHTML = `<pre>${result}</pre>`;
    listItem.setAttribute('data-pokemon-name', pokemonKey);  // Add an attribute to identify the Pokemon
    applyTypeBackground(listItem, types);

    // Only show the copy button and input field for Pokemon that are not found
    if (notFound) {
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy !pokemon ' + pokemonName;
        copyButton.onclick = function () {
            navigator.clipboard.writeText('!pokemon ' + pokemonName).then(() => {
                alert('Copied to clipboard!');
                showDataEntryInput(pokemonName);
            });
        };
        listItem.appendChild(copyButton);

        const dataEntry = document.getElementById('data-entry');
        dataEntry.style.display = 'block'; // Show the input box
        const resultDataInput = document.getElementById('result-data');
        resultDataInput.value = ''; // Clear previous input
    }

    resultsList.appendChild(listItem);
    
    // Add the Pokemon name to the set and increment count
    pokemonSet.add(pokemonKey);
    resultsCount++;
}

// Function to flash an existing Pokemon if already listed
function flashExistingPokemon(pokemonKey) {
    const resultsListItems = document.querySelectorAll('[data-pokemon-name]');
    resultsListItems.forEach((item) => {
        if (item.getAttribute('data-pokemon-name') === pokemonKey) {
            item.classList.add('flash');
            setTimeout(() => item.classList.remove('flash'), 1000);
        }
    });
}

// Function to apply background based on Pokemon types
function applyTypeBackground(element, types) {
    const typeColors = {
        fire: 'red',
        water: 'blue',
        grass: 'green',
        electric: 'yellow',
        psychic: 'purple',
        dark: '#4f4f4f', // Dark grey instead of black
        ghost: 'indigo',
        fairy: 'pink',
        dragon: 'orange',
        ice: 'lightblue',
        fighting: 'brown',
        flying: 'skyblue',
        rock: 'darkgoldenrod',
        ground: 'saddlebrown',
        bug: 'limegreen',
        steel: 'gray',
        poison: 'violet',
        normal: 'beige'
    };

    let bgColor;
    
    if (types.length === 1) {
        bgColor = typeColors[types[0]] || 'white';
        element.style.backgroundColor = bgColor;
        adjustTextColor(element); // Adjust text color based on single background color
    } else if (types.length === 2) {
        // Split background for dual types
        bgColor = `linear-gradient(to right, ${typeColors[types[0]] || 'white'}, ${typeColors[types[1]] || 'white'})`;
        element.style.background = bgColor;
        element.style.color = 'black'; // Use black text for dual-type gradient backgrounds
    }
}

// Helper function to adjust text color based on background
function adjustTextColor(element) {
    const color = getComputedStyle(element).backgroundColor;
    if (!color || !color.includes('rgb')) {
        element.style.color = 'black'; // Default to black text if color can't be determined
        return;
    }

    const rgb = color.match(/\d+/g);  // Get RGB values from the background color
    const brightness = Math.round(((parseInt(rgb[0]) * 299) +
                                   (parseInt(rgb[1]) * 587) +
                                   (parseInt(rgb[2]) * 114)) / 1000); // Calculate brightness

    if (brightness > 150) {
        element.style.color = 'black'; // Use dark text on light backgrounds
    } else {
        element.style.color = 'white'; // Use light text on dark backgrounds
    }
}

// Function to show a data entry input after copying a not-found Pokemon
function showDataEntryInput(pokemonName) {
    const dataEntry = document.getElementById('data-entry');
    dataEntry.style.display = 'block';

    document.getElementById('result-data').addEventListener('change', function() {
        const inputData = this.value.trim();
        if (inputData) {
            // Parse and store the data, then hide the input and copy button
            parsePokemonData(inputData);
            document.querySelector(`[data-pokemon-name="${normalizePokemonName(pokemonName)}"]`).innerHTML = `<pre>${inputData}</pre>`;
            dataEntry.style.display = 'none';
        }
    });
}

// Function to parse manually entered Pokemon data
function parsePokemonData(data) {
    // Process the data (e.g., validate and store in a format if needed)
    console.log('Parsed Pokemon Data: ', data);
}

// Function to focus on a text box
function focusTextBox(textBoxID) {
    document.getElementById(textBoxID).focus();
}
