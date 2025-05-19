/*
*/
// Variables to manage the state
let pokemonSet = new Set();  // To track the listed Pokémon
let resultsCount = 0;
let fileContent = '';        // Variable to store the content of PCGmons.txt

const fileInput = document.getElementById('file-input');
const searchButton = document.getElementById('search-btn');
const clearButton = document.getElementById('clear-btn');

// Disable the search button by default
searchButton.disabled = true;

// Enable search button when a file is selected
fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
        searchButton.disabled = false;
        loadFile(fileInput.files[0]);
    } else {
        searchButton.disabled = true;
    }
});

// Function to load file content
function loadFile(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        fileContent = event.target.result;
        console.log('File loaded successfully'); // Log file loaded message
        alert('File loaded successfully!');
    };
    reader.onerror = function (event) {
        console.error('Error reading file', event);
        alert('Error reading file, please try again!');
    };
    reader.readAsText(file); // Read the file as text
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

// Function to clear the list of Pokémon
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
        // Pokémon found in the file
        addResultToList(pokemonData, pokemonName, false);
    } else {
        // Pokémon not found, prompt for input
        addResultToList('!pokemon ' + pokemonName, pokemonName, true);
    }
}

// Function to search the loaded PCGmons.txt content
function searchPokemonInFile(pokemonName) {
    if (!fileContent) {
        console.error('No file content loaded');
        alert('No file content loaded. Please load a PCGmons.txt file.');
        return null;
    }

    const regex = new RegExp(`Pokemon: ${pokemonName} - Tier:.*`, 'i');
    const match = fileContent.match(regex);
    return match ? match[0] : null;
}

// Function to add a result to the list
function addResultToList(result, pokemonName, notFound = false) {
    const resultsList = document.getElementById('results-list');

    // Check if the Pokémon is already listed
    if (pokemonSet.has(pokemonName)) {
        flashExistingPokemon(pokemonName);
        return;
    }

    const listItem = document.createElement('li');
    const types = extractTypes(result);

    listItem.classList.add("results-list-item"); // Add the class here

    listItem.innerHTML = `<pre>${result}</pre>`;
    listItem.setAttribute('data-pokemon-name', pokemonName);  // Add an attribute to identify the Pokémon
    applyTypeBackground(listItem, types);

    // Only show the copy button and input field for Pokémon that are not found
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
    
    // Add the Pokémon name to the set and increment count
    pokemonSet.add(pokemonName);
    resultsCount++;
}

// Function to flash an existing Pokémon if already listed
function flashExistingPokemon(pokemonName) {
    const resultsListItems = document.querySelectorAll('[data-pokemon-name]');
    resultsListItems.forEach((item) => {
        if (item.getAttribute('data-pokemon-name') === pokemonName) {
            item.classList.add('flash');
            setTimeout(() => item.classList.remove('flash'), 1000);
        }
    });
}

// Function to extract the types from the result string
function extractTypes(result) {
    const typesMatch = result.match(/Type: (\w+)(?:\/(\w+))?/);
    if (typesMatch) {
        return typesMatch.slice(1).filter(Boolean);  // Return array of types
    }
    return [];
}

// Function to apply background based on Pokémon types
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

// Function to show a data entry input after copying a not-found Pokémon
function showDataEntryInput(pokemonName) {
    const dataEntry = document.getElementById('data-entry');
    dataEntry.style.display = 'block';

    document.getElementById('result-data').addEventListener('change', function() {
        const inputData = this.value.trim();
        if (inputData) {
            // Parse and store the data, then hide the input and copy button
            parsePokemonData(inputData);
            document.querySelector(`[data-pokemon-name="${pokemonName}"]`).innerHTML = `<pre>${inputData}</pre>`;
            dataEntry.style.display = 'none';
        }
    });
}

// Function to parse manually entered Pokémon data
function parsePokemonData(data) {
    // Process the data (e.g., validate and store in a format if needed)
    console.log('Parsed Pokémon Data: ', data);
}

// Function to focus on a text box
function focusTextBox(textBoxID) {
    document.getElementById(textBoxID).focus();
}

