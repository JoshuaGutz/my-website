/*
*/
// State
let pokemonSet = new Set();
let resultsCount = 0;
let pokemonList = [];
let pokemonByName = new Map();
let typeEffectivenessByCombo = new Map();
let suggestionMatches = [];
let activeSuggestionIndex = -1;

const searchButton = document.getElementById('search-btn');
const clearButton = document.getElementById('clear-btn');
const searchInput = document.getElementById('pokemon-name');
const resultsList = document.getElementById('results-list');
const dataEntry = document.getElementById('data-entry');
const resultDataInput = document.getElementById('result-data');
const suggestionsList = document.getElementById('pokemon-suggestions');
const searchWrap = document.getElementById('pokemon-search-wrap');
const pokemonDataUrl = new URL('PCGmons-NEW [2025-05-28].txt', window.location.href);

const typeColors = {
    fire: '#f97316',
    water: '#3b82f6',
    grass: '#22c55e',
    electric: '#facc15',
    psychic: '#a855f7',
    dark: '#374151',
    ghost: '#6366f1',
    fairy: '#ec4899',
    dragon: '#fb923c',
    ice: '#7dd3fc',
    fighting: '#b45309',
    flying: '#38bdf8',
    rock: '#a16207',
    ground: '#92400e',
    bug: '#84cc16',
    steel: '#9ca3af',
    poison: '#d946ef',
    normal: '#f5f5dc'
};

searchButton.disabled = true;
loadPokemonData();
bindEvents();

async function loadPokemonData() {
    try {
        const response = await fetch(pokemonDataUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const fileContent = await response.text();
        pokemonList = parsePokemonFile(fileContent);
        pokemonByName = buildPokemonIndex(pokemonList);
        typeEffectivenessByCombo = buildTypeEffectivenessIndex(pokemonList);

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

function bindEvents() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);

    searchButton.addEventListener('click', function () {
        submitSearchFromInput();
    });

    clearButton.addEventListener('click', function () {
        clearAllResults();
    });

    document.addEventListener('click', function (event) {
        if (!searchWrap.contains(event.target)) {
            hideSuggestions();
        }
    });

    resultDataInput.addEventListener('change', handleManualDataEntry);
}

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

    const types = match[3]
        .split('/')
        .map((type) => normalizeTypeName(type))
        .filter(Boolean);

    const typeComboKey = [...types].sort(compareStrings).join('+');
    const effectivenessByMultiplier = parseEffectivenessSummary(match[13]);

    return {
        rawLine,
        name: match[1].trim(),
        tier: match[2].trim(),
        types,
        typeComboKey,
        displayTypes: [...types].map(formatDisplayName).sort(compareStrings),
        generation: Number(match[4]),
        weightKg: Number(match[5]),
        base: Number(match[6]),
        speed: Number(match[7]),
        hp: Number(match[8]),
        attack: Number(match[9]),
        defense: Number(match[10]),
        specialAttack: Number(match[11]),
        specialDefense: Number(match[12]),
        typeEffectivenessRaw: match[13].trim(),
        effectivenessByMultiplier
    };
}

function parseEffectivenessSummary(effectivenessText) {
    const summary = {
        '0': [],
        '1/4': [],
        '1/2': [],
        '2': [],
        '4': []
    };

    effectivenessText
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((entry) => {
            const match = entry.match(/^(\d(?:\/4|\/2)?)\s+(.+)$/);
            if (!match) {
                return;
            }

            const multiplier = match[1];
            const targetType = formatDisplayName(match[2].trim());
            if (!summary[multiplier]) {
                summary[multiplier] = [];
            }
            summary[multiplier].push(targetType);
        });

    Object.keys(summary).forEach((multiplier) => {
        summary[multiplier] = [...new Set(summary[multiplier])].sort(compareStrings);
    });

    return summary;
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

function buildTypeEffectivenessIndex(pokemonRows) {
    const index = new Map();

    pokemonRows.forEach((pokemon) => {
        if (!index.has(pokemon.typeComboKey)) {
            index.set(pokemon.typeComboKey, pokemon.effectivenessByMultiplier);
        }
    });

    return index;
}

function normalizePokemonName(pokemonName) {
    return normalizeText(pokemonName).replace(/\s+/g, ' ').trim();
}

function normalizeTypeName(typeName) {
    return normalizeText(typeName).replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function compareStrings(left, right) {
    return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function formatDisplayName(value) {
    const text = String(value).trim();
    if (!text) {
        return text;
    }

    return text
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function formatTypeList(types) {
    return [...types].map(formatDisplayName).sort(compareStrings).join(' / ');
}

function formatStatLine(label, value) {
    return `${label}: ${value}`;
}

function getPokemonDisplayEffectiveness(pokemon) {
    const summary = typeEffectivenessByCombo.get(pokemon.typeComboKey) || pokemon.effectivenessByMultiplier;
    const order = ['0', '1/4', '1/2', '2', '4'];

    return order
        .filter((multiplier) => summary[multiplier] && summary[multiplier].length > 0)
        .map((multiplier) => `${multiplier}: ${summary[multiplier].join(', ')}`);
}

function handleSearchInput() {
    updateSuggestions(searchInput.value);
}

function handleSearchKeydown(event) {
    if (event.key === 'ArrowDown') {
        if (suggestionMatches.length > 0) {
            event.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestionMatches.length;
            renderSuggestions();
        }
        return;
    }

    if (event.key === 'ArrowUp') {
        if (suggestionMatches.length > 0) {
            event.preventDefault();
            activeSuggestionIndex = activeSuggestionIndex <= 0 ? suggestionMatches.length - 1 : activeSuggestionIndex - 1;
            renderSuggestions();
        }
        return;
    }

    if (event.key === 'Escape') {
        hideSuggestions();
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        submitSearchFromInput();
    }
}

function submitSearchFromInput() {
    const query = searchInput.value.trim();
    if (!query) {
        return;
    }

    const choice = getChosenSuggestion(query);
    hideSuggestions();
    searchInput.value = '';
    handleSearch(choice || query);
}

function getChosenSuggestion(query) {
    if (suggestionMatches.length > 0) {
        const activeMatch = suggestionMatches[activeSuggestionIndex] || suggestionMatches[0];
        return activeMatch.name;
    }

    const exact = pokemonByName.get(normalizePokemonName(query));
    return exact ? exact.name : null;
}

function updateSuggestions(query) {
    const normalizedQuery = normalizePokemonName(query);
    if (!normalizedQuery) {
        suggestionMatches = [];
        activeSuggestionIndex = -1;
        hideSuggestions();
        return;
    }

    suggestionMatches = pokemonList
        .filter((pokemon) => normalizePokemonName(pokemon.name).includes(normalizedQuery))
        .slice()
        .sort(compareSuggestionRows(normalizedQuery))
        .slice(0, 10);

    activeSuggestionIndex = suggestionMatches.length > 0 ? 0 : -1;
    renderSuggestions();
}

function compareSuggestionRows(normalizedQuery) {
    return function (left, right) {
        const leftRank = getSuggestionRank(normalizePokemonName(left.name), normalizedQuery);
        const rightRank = getSuggestionRank(normalizePokemonName(right.name), normalizedQuery);

        if (leftRank !== rightRank) {
            return leftRank - rightRank;
        }

        return compareStrings(left.name, right.name);
    };
}

function getSuggestionRank(normalizedName, normalizedQuery) {
    if (normalizedName === normalizedQuery) {
        return 0;
    }

    if (normalizedName.startsWith(normalizedQuery)) {
        return 1;
    }

    return 2;
}

function renderSuggestions() {
    suggestionsList.innerHTML = '';

    if (suggestionMatches.length === 0) {
        hideSuggestions();
        return;
    }

    suggestionMatches.forEach((pokemon, index) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pokemon-suggestion';
        button.textContent = pokemon.name;
        button.setAttribute('aria-selected', String(index === activeSuggestionIndex));
        if (index === activeSuggestionIndex) {
            button.classList.add('is-active');
        }
        button.addEventListener('mousedown', function (event) {
            event.preventDefault();
            chooseSuggestion(pokemon.name);
        });
        item.appendChild(button);
        suggestionsList.appendChild(item);
    });

    suggestionsList.hidden = false;
}

function chooseSuggestion(pokemonName) {
    hideSuggestions();
    searchInput.value = '';
    handleSearch(pokemonName);
}

function hideSuggestions() {
    suggestionsList.innerHTML = '';
    suggestionsList.hidden = true;
}

function handleSearch(pokemonName) {
    const pokemonData = searchPokemonInFile(pokemonName);

    if (pokemonData) {
        addPokemonResult(pokemonData);
    } else {
        addMissingPokemonResult(pokemonName);
    }
}

function searchPokemonInFile(pokemonName) {
    if (pokemonByName.size === 0) {
        console.error('No Pokemon data loaded');
        alert('PCGmons data is still loading or failed to load. Please refresh the page and try again.');
        return null;
    }

    return pokemonByName.get(normalizePokemonName(pokemonName)) || null;
}

function addPokemonResult(pokemon) {
    const pokemonKey = normalizePokemonName(pokemon.name);

    if (pokemonSet.has(pokemonKey)) {
        flashExistingPokemon(pokemonKey);
        return;
    }

    const listItem = document.createElement('li');
    listItem.classList.add('results-list-item');
    listItem.dataset.pokemonName = pokemonKey;
    listItem.dataset.resultKind = 'pokemon';

    const card = createPokemonCard(pokemon, pokemonKey);
    listItem.appendChild(card);
    resultsList.appendChild(listItem);

    pokemonSet.add(pokemonKey);
    resultsCount++;
}

function addMissingPokemonResult(pokemonName) {
    const pokemonKey = normalizePokemonName(pokemonName);

    if (pokemonSet.has(pokemonKey)) {
        flashExistingPokemon(pokemonKey);
        return;
    }

    const listItem = document.createElement('li');
    listItem.classList.add('results-list-item');
    listItem.dataset.pokemonName = pokemonKey;
    listItem.dataset.resultKind = 'missing';

    const card = document.createElement('article');
    card.className = 'pokemon-card pokemon-card--missing';
    card.dataset.pokemonName = pokemonKey;
    card.appendChild(createRemoveButton(pokemonKey));

    const content = document.createElement('div');
    content.className = 'pokemon-card__content';

    const lineOne = document.createElement('div');
    lineOne.className = 'pokemon-card__line pokemon-card__line--primary';
    const raw = document.createElement('pre');
    raw.className = 'pokemon-card__raw';
    raw.textContent = `!pokemon ${pokemonName}`;
    lineOne.appendChild(raw);

    content.appendChild(lineOne);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'pokemon-card__copy';
    copyButton.textContent = `Copy !pokemon ${pokemonName}`;
    copyButton.addEventListener('click', function () {
        navigator.clipboard.writeText(`!pokemon ${pokemonName}`).then(() => {
            alert('Copied to clipboard!');
            showDataEntryInput(pokemonName);
        });
    });

    card.appendChild(content);
    card.appendChild(copyButton);
    listItem.appendChild(card);
    resultsList.appendChild(listItem);

    pokemonSet.add(pokemonKey);
    resultsCount++;
    dataEntry.style.display = 'block';
    dataEntry.dataset.targetPokemonName = pokemonKey;
    resultDataInput.value = '';
}

function createPokemonCard(pokemon, pokemonKey) {
    const card = document.createElement('article');
    card.className = 'pokemon-card';
    card.dataset.pokemonName = pokemonKey;

    applyTypeBackground(card, pokemon.types);
    card.appendChild(createRemoveButton(pokemonKey));

    const content = document.createElement('div');
    content.className = 'pokemon-card__content';

    const lineOne = document.createElement('div');
    lineOne.className = 'pokemon-card__line pokemon-card__line--primary';
    const lineOneText = document.createElement('span');
    lineOneText.className = 'pokemon-card__line-text';
    lineOneText.textContent = `${pokemon.name} | ${formatTypeList(pokemon.displayTypes)} | Tier ${pokemon.tier} | Gen ${pokemon.generation}`;
    lineOne.appendChild(lineOneText);

    const lineTwo = document.createElement('div');
    lineTwo.className = 'pokemon-card__line';
    lineTwo.textContent = [
        formatStatLine('HP', pokemon.hp),
        formatStatLine('Speed', pokemon.speed),
        formatStatLine('Weight', `${pokemon.weightKg}kg`),
        formatStatLine('Base', pokemon.base)
    ].join(' | ');

    const lineThree = document.createElement('div');
    lineThree.className = 'pokemon-card__line';
    lineThree.textContent = [
        formatStatLine('Attack', pokemon.attack),
        formatStatLine('Defense', pokemon.defense),
        formatStatLine('Special Attack', pokemon.specialAttack),
        formatStatLine('Special Defense', pokemon.specialDefense)
    ].join(' | ');

    const effectivenessBlock = document.createElement('div');
    effectivenessBlock.className = 'pokemon-card__effectiveness';

    const effectivenessLines = getPokemonDisplayEffectiveness(pokemon);
    effectivenessLines.forEach((line) => {
        const row = document.createElement('div');
        row.className = 'pokemon-card__effectiveness-line';
        row.textContent = line;
        effectivenessBlock.appendChild(row);
    });

    content.appendChild(lineOne);
    content.appendChild(lineTwo);
    content.appendChild(lineThree);
    content.appendChild(effectivenessBlock);

    card.appendChild(content);
    return card;
}

function createRemoveButton(pokemonKey) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'pokemon-card__remove';
    removeButton.setAttribute('aria-label', 'Remove Pokemon');
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', function (event) {
        event.stopPropagation();
        removePokemonResult(pokemonKey);
    });
    return removeButton;
}

function removePokemonResult(pokemonKey) {
    const item = findResultItemByKey(pokemonKey);
    if (!item) {
        return;
    }

    item.remove();
    pokemonSet.delete(pokemonKey);
    resultsCount = Math.max(0, resultsCount - 1);
    syncManualEntryVisibility();
}

function findResultItemByKey(pokemonKey) {
    return Array.from(resultsList.querySelectorAll('[data-pokemon-name]')).find(
        (item) => item.dataset.pokemonName === pokemonKey
    ) || null;
}

function flashExistingPokemon(pokemonKey) {
    const item = findResultItemByKey(pokemonKey);
    if (!item) {
        return;
    }

    const card = item.querySelector('.pokemon-card');
    if (!card) {
        return;
    }

    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 1000);
}

function applyTypeBackground(element, types) {
    const lowerTypes = types
        .map((type) => normalizeTypeName(type))
        .sort(compareStrings);

    if (lowerTypes.length === 1) {
        const color = typeColors[lowerTypes[0]] || '#ffffff';
        element.style.background = color;
        element.style.color = getReadableTextColor(lowerTypes);
        return;
    }

    if (lowerTypes.length >= 2) {
        const left = typeColors[lowerTypes[0]] || '#ffffff';
        const right = typeColors[lowerTypes[1]] || '#ffffff';
        element.style.background = `linear-gradient(135deg, ${left}, ${right})`;
        element.style.color = getReadableTextColor(lowerTypes);
        return;
    }

    element.style.background = '#ffffff';
    element.style.color = '#111111';
}

function getReadableTextColor(types) {
    const darkTypes = new Set(['dark', 'ghost', 'fighting', 'ground', 'rock', 'steel', 'poison', 'dragon']);
    return types.some((type) => darkTypes.has(type)) ? '#ffffff' : '#111111';
}

function showDataEntryInput(pokemonName) {
    dataEntry.style.display = 'block';
    dataEntry.dataset.targetPokemonName = normalizePokemonName(pokemonName);
}

function handleManualDataEntry() {
    const inputData = resultDataInput.value.trim();
    if (!inputData) {
        return;
    }

    parsePokemonData(inputData);

    const targetKey = dataEntry.dataset.targetPokemonName;
    const item = targetKey ? findResultItemByKey(targetKey) : null;
    if (item) {
        const raw = item.querySelector('.pokemon-card__raw');
        if (raw) {
            raw.textContent = inputData;
        } else {
            item.innerHTML = `<pre>${inputData}</pre>`;
        }
    }

    dataEntry.style.display = 'none';
}

function parsePokemonData(data) {
    console.log('Parsed Pokemon Data: ', data);
}

function syncManualEntryVisibility() {
    const hasMissingResults = Boolean(resultsList.querySelector('[data-result-kind="missing"]'));
    if (!hasMissingResults) {
        dataEntry.style.display = 'none';
    }
}

function clearAllResults() {
    pokemonSet.clear();
    searchInput.value = '';
    resultsList.innerHTML = '';
    dataEntry.style.display = 'none';
    dataEntry.dataset.targetPokemonName = '';
    resultDataInput.value = '';
    resultsCount = 0;
    hideSuggestions();
}

function focusTextBox(textBoxID) {
    document.getElementById(textBoxID).focus();
}
