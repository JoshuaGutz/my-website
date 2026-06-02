/*
*/
// State
let selectedTeam = 'my';
const teamPokemonSets = {
    my: new Set(),
    opponent: new Set()
};
let resultsCount = 0;
let pokemonList = [];
let pokemonByName = new Map();
let typeEffectivenessByCombo = new Map();
let suggestionMatches = [];
let activeSuggestionIndex = -1;

const searchButton = document.getElementById('search-btn');
const clearButton = document.getElementById('clear-btn');
const saveTeamButton = document.getElementById('save-team-btn');
const loadTeamButton = document.getElementById('load-team-btn');
const teamDialog = document.getElementById('team-dialog');
const teamDialogTitle = document.getElementById('team-dialog-title');
const teamDialogSubtitle = document.getElementById('team-dialog-subtitle');
const teamDialogSaveSection = document.getElementById('team-dialog-save');
const teamDialogLoadSection = document.getElementById('team-dialog-load');
const teamSavedList = document.getElementById('team-saved-list');
const teamDialogNicknameInput = document.getElementById('team-save-nickname');
const teamDialogPreview = document.getElementById('team-save-preview');
const teamDialogLoadList = document.getElementById('team-load-list');
const teamDialogPrimaryButton = document.getElementById('team-dialog-primary');
const teamDialogCancelButton = document.getElementById('team-dialog-cancel');
const searchInput = document.getElementById('pokemon-name');
const resultsList = document.getElementById('results-list');
const dataEntry = document.getElementById('data-entry');
const resultDataInput = document.getElementById('result-data');
const suggestionsList = document.getElementById('pokemon-suggestions');
const searchWrap = document.getElementById('pokemon-search-wrap');
const teamSelectorButtons = Array.from(document.querySelectorAll('[data-team-choice]'));
const teamResultsLists = {
    my: document.getElementById('my-team-results'),
    opponent: document.getElementById('opponent-team-results')
};
const pokemonDataUrl = new URL('PCGmons-NEW [2025-05-28].txt', window.location.href);
const teamStorageDbName = 'battle-assistant-team-storage';
const teamStorageStoreName = 'teams';
let teamStorageDbPromise = null;
let teamDialogMode = null;
let teamDialogRecords = [];

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
if (saveTeamButton) {
    saveTeamButton.disabled = true;
}
if (loadTeamButton) {
    loadTeamButton.disabled = true;
}
loadPokemonData();
bindEvents();
setSelectedTeam(selectedTeam);

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
        if (saveTeamButton) {
            saveTeamButton.disabled = false;
        }
        if (loadTeamButton) {
            loadTeamButton.disabled = false;
        }
        console.log(`Loaded ${pokemonList.length} Pokemon rows.`);
    } catch (error) {
        searchButton.disabled = true;
        if (saveTeamButton) {
            saveTeamButton.disabled = true;
        }
        if (loadTeamButton) {
            loadTeamButton.disabled = true;
        }
        console.error('Unable to load bundled PCGmons data', error);
        alert('Unable to load PCGmons-NEW data automatically. Please make sure the page is being served from the hosted site and the text file is available.');
    }
}

function bindEvents() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);

    teamSelectorButtons.forEach((button) => {
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            setSelectedTeam(button.dataset.teamChoice);
        });
    });

    searchButton.addEventListener('click', function () {
        submitSearchFromInput();
    });

    clearButton.addEventListener('click', function () {
        clearAllResults();
    });

    saveTeamButton.addEventListener('click', function () {
        void saveCurrentTeam();
    });

    loadTeamButton.addEventListener('click', function () {
        void loadSavedTeam();
    });

    if (teamDialog) {
        teamDialog.addEventListener('click', function (event) {
            if (event.target && event.target.dataset && event.target.dataset.dialogClose === 'true') {
                closeTeamDialog();
            }
        });
    }

    teamDialogCancelButton.addEventListener('click', closeTeamDialog);
    teamDialogPrimaryButton.addEventListener('click', function () {
        if (teamDialogMode === 'save') {
            void confirmSaveTeam();
        } else if (teamDialogMode === 'load') {
            void confirmLoadTeam();
        }
    });

    teamDialogNicknameInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && teamDialogMode === 'save') {
            event.preventDefault();
            void confirmSaveTeam();
        }
    });

    teamDialogLoadList.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && teamDialogMode === 'load') {
            event.preventDefault();
            void confirmLoadTeam();
        }
    });

    document.addEventListener('click', function (event) {
        if (!searchWrap.contains(event.target)) {
            hideSuggestions();
        }
    });

    resultDataInput.addEventListener('change', handleManualDataEntry);
}

function setSelectedTeam(team) {
    if (!teamPokemonSets[team]) {
        return;
    }

    selectedTeam = team;

    teamSelectorButtons.forEach((button) => {
        const isActive = button.dataset.teamChoice === team;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

async function getTeamStorageDb() {
    if (!teamStorageDbPromise) {
        teamStorageDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(teamStorageDbName, 1);

            request.onupgradeneeded = function (event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(teamStorageStoreName)) {
                    db.createObjectStore(teamStorageStoreName, { keyPath: 'nickname' });
                }
            };

            request.onsuccess = function () {
                resolve(request.result);
            };

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    return teamStorageDbPromise;
}

async function getSavedTeamRecord(nickname) {
    const db = await getTeamStorageDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(teamStorageStoreName, 'readonly');
        const store = tx.objectStore(teamStorageStoreName);
        const request = store.get(nickname);

        request.onsuccess = function () {
            resolve(request.result || null);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

async function getAllSavedTeamRecords() {
    const db = await getTeamStorageDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(teamStorageStoreName, 'readonly');
        const store = tx.objectStore(teamStorageStoreName);

        if (typeof store.getAll !== 'function') {
            const records = [];
            const cursorRequest = store.openCursor();

            cursorRequest.onsuccess = function () {
                const cursor = cursorRequest.result;
                if (!cursor) {
                    resolve(records);
                    return;
                }

                records.push(cursor.value);
                cursor.continue();
            };

            cursorRequest.onerror = function () {
                reject(cursorRequest.error);
            };
            return;
        }

        const request = store.getAll();
        request.onsuccess = function () {
            resolve(request.result || []);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

async function saveTeamRecord(record) {
    const db = await getTeamStorageDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(teamStorageStoreName, 'readwrite');
        const store = tx.objectStore(teamStorageStoreName);
        const request = store.add(record);

        request.onsuccess = function () {
            resolve();
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

async function saveCurrentTeam() {
    openTeamDialog('save');
}

async function loadSavedTeam() {
    try {
        await openTeamDialog('load');
    } catch (error) {
        console.error('Unable to open team loader', error);
        closeTeamDialog();
        alert('Unable to load saved teams in this browser.');
    }
}

function getTeamLabel(team) {
    return team === 'opponent' ? 'Opponents Team' : 'My Team';
}

function getTeamLabelForSide(team) {
    return team === 'opponent' ? 'Opponents Team' : 'My Team';
}

function getTeamPokemonNames(team) {
    const teamList = teamResultsLists[team];
    if (!teamList) {
        return [];
    }

    return Array.from(teamList.querySelectorAll('.results-list-item[data-result-kind="pokemon"]'))
        .map((item) => item.dataset.pokemonName)
        .filter(Boolean)
        .map((name) => {
            const pokemon = pokemonByName.get(name);
            return pokemon ? pokemon.name : name;
        });
}

async function openTeamDialog(mode) {
    teamDialogMode = mode;
    teamDialogRecords = [];
    teamDialog.hidden = false;

    if (mode === 'save') {
        teamDialogTitle.textContent = `Save ${getTeamLabelForSide(selectedTeam)}`;
        teamDialogSubtitle.textContent = '';
        teamDialogSubtitle.hidden = true;
        teamDialogSaveSection.hidden = false;
        teamDialogLoadSection.hidden = true;
        teamSavedList.parentElement.hidden = false;
        teamDialogPrimaryButton.textContent = 'Save';
        teamDialogPrimaryButton.disabled = false;
        teamDialogNicknameInput.value = '';
        teamDialogPreview.textContent = getTeamRosterPreviewText(selectedTeam);
        await renderSavedTeamsForSaveMode();
        teamDialogNicknameInput.focus();
        teamDialogNicknameInput.select();
        return;
    }

    if (mode === 'load') {
        teamDialogTitle.textContent = `Load ${getTeamLabelForSide(selectedTeam)}`;
        teamDialogSubtitle.textContent = '';
        teamDialogSubtitle.hidden = true;
        teamDialogSaveSection.hidden = true;
        teamDialogLoadSection.hidden = false;
        teamSavedList.parentElement.hidden = true;
        teamDialogPrimaryButton.textContent = 'Load';
        await populateSavedTeamList();
        teamDialogLoadList.focus();
        return;
    }

    closeTeamDialog();
}

function closeTeamDialog() {
    teamDialog.hidden = true;
    teamDialogMode = null;
    teamDialogRecords = [];
    teamDialogLoadList.innerHTML = '';
    teamSavedList.innerHTML = '';
    teamDialogSubtitle.hidden = false;
}

function getTeamRosterPreviewText(team) {
    const roster = getTeamPokemonNames(team);
    return roster.join(', ');
}

async function populateSavedTeamList() {
    const teamRecords = await getSavedTeamRecordsForSelectedTeam();

    teamDialogRecords = teamRecords;
    teamDialogLoadList.innerHTML = '';

    if (teamRecords.length === 0) {
        const option = document.createElement('option');
        option.textContent = `No saved teams for ${getTeamLabelForSide(selectedTeam)}`;
        option.disabled = true;
        option.selected = true;
        teamDialogLoadList.appendChild(option);
        teamDialogPrimaryButton.disabled = true;
        return;
    }

    teamDialogPrimaryButton.disabled = false;

    teamRecords.forEach((record, index) => {
        const option = document.createElement('option');
        option.value = record.nickname;
        option.textContent = `${record.nickname} - ${formatStoredRosterForDisplay(record.roster)}`;
        if (index === 0) {
            option.selected = true;
        }
        teamDialogLoadList.appendChild(option);
    });
}

async function renderSavedTeamsForSaveMode() {
    const teamRecords = await getSavedTeamRecordsForSelectedTeam();
    if (!teamSavedList) {
        return;
    }

    teamSavedList.innerHTML = '';

    if (teamRecords.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'team-dialog__saved-empty';
        empty.textContent = `No saved teams for ${getTeamLabelForSide(selectedTeam)}`;
        teamSavedList.appendChild(empty);
        return;
    }

    teamRecords.forEach((record) => {
        const row = document.createElement('div');
        row.className = 'team-dialog__saved-row team-dialog__saved-row--static';
        row.textContent = `${record.nickname} - ${formatStoredRosterForDisplay(record.roster)}`;
        teamSavedList.appendChild(row);
    });
}

function formatStoredRosterForDisplay(rosterText) {
    return String(rosterText || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .join(', ');
}

async function getSavedTeamRecordsForSelectedTeam() {
    const records = await getAllSavedTeamRecords();
    return records
        .map((record) => ({
            nickname: String(record.nickname || '').trim(),
            team: record.team || 'my',
            roster: String(record.roster || '').trim()
        }))
        .filter((record) => record.nickname && record.team === selectedTeam)
        .sort((left, right) => compareStrings(left.nickname, right.nickname));
}

async function confirmSaveTeam() {
    try {
        const nickname = teamDialogNicknameInput.value.trim();
        if (!nickname) {
            alert('Please enter a team nickname.');
            teamDialogNicknameInput.focus();
            return;
        }

        const existing = await getSavedTeamRecord(nickname);
        if (existing) {
            alert(`A saved team named "${nickname}" already exists. Please choose a unique nickname.`);
            teamDialogNicknameInput.focus();
            teamDialogNicknameInput.select();
            return;
        }

        const roster = getTeamPokemonNames(selectedTeam);
        await saveTeamRecord({
            nickname,
            team: selectedTeam,
            roster: roster.join(',')
        });

        closeTeamDialog();
    } catch (error) {
        console.error('Unable to save team', error);
        alert('Unable to save the team in this browser.');
    }
}

async function confirmLoadTeam() {
    try {
        const selectedNickname = teamDialogLoadList.value;
        const record = teamDialogRecords.find((item) => item.nickname === selectedNickname);
        if (!record) {
            alert('Please select a saved team from the list.');
            return;
        }

        const names = String(record.roster || '')
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean);

        const skipped = loadTeamRoster(names, selectedTeam);
        if (skipped.length > 0) {
            alert(`Loaded ${getTeamLabelForSide(selectedTeam)} from "${record.nickname}", but skipped: ${skipped.join(', ')}.`);
        }
        closeTeamDialog();
    } catch (error) {
        console.error('Unable to load team', error);
        alert('Unable to load the team in this browser.');
    }
}

function loadTeamRoster(names, team) {
    clearTeamResults(team);
    const skipped = [];

    names.forEach((name) => {
        const pokemonData = searchPokemonInFile(name);
        if (pokemonData) {
            addPokemonResult(pokemonData, team);
        } else {
            skipped.push(name);
        }
    });

    return skipped;
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
        addPokemonResult(pokemonData, selectedTeam);
    } else {
        addMissingPokemonResult(pokemonName, selectedTeam);
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

function addPokemonResult(pokemon, team) {
    const pokemonKey = normalizePokemonName(pokemon.name);
    const pokemonSet = teamPokemonSets[team];

    if (pokemonSet.has(pokemonKey)) {
        flashExistingPokemon(pokemonKey, team);
        return;
    }

    const listItem = document.createElement('li');
    listItem.classList.add('results-list-item');
    listItem.dataset.pokemonName = pokemonKey;
    listItem.dataset.team = team;
    listItem.dataset.resultKind = 'pokemon';

    const card = createPokemonCard(pokemon, pokemonKey, team);
    listItem.appendChild(card);
    teamResultsLists[team].appendChild(listItem);

    pokemonSet.add(pokemonKey);
    resultsCount++;
    syncTeamCardControlStates(team);
}

function addMissingPokemonResult(pokemonName, team) {
    const pokemonKey = normalizePokemonName(pokemonName);
    const pokemonSet = teamPokemonSets[team];

    if (pokemonSet.has(pokemonKey)) {
        flashExistingPokemon(pokemonKey, team);
        return;
    }

    const listItem = document.createElement('li');
    listItem.classList.add('results-list-item');
    listItem.dataset.pokemonName = pokemonKey;
    listItem.dataset.team = team;
    listItem.dataset.resultKind = 'missing';

    const card = document.createElement('article');
    card.className = 'pokemon-card pokemon-card--missing';
    card.dataset.pokemonName = pokemonKey;
    card.dataset.team = team;
    card.appendChild(createCardControls(pokemonKey, team));

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
            showDataEntryInput(pokemonName, team);
        });
    });

    card.appendChild(content);
    card.appendChild(copyButton);
    listItem.appendChild(card);
    teamResultsLists[team].appendChild(listItem);

    pokemonSet.add(pokemonKey);
    resultsCount++;
    syncTeamCardControlStates(team);
    dataEntry.style.display = 'block';
    dataEntry.dataset.targetPokemonName = pokemonKey;
    dataEntry.dataset.targetTeam = team;
    resultDataInput.value = '';
}

function createPokemonCard(pokemon, pokemonKey, team) {
    const card = document.createElement('article');
    card.className = 'pokemon-card';
    card.dataset.pokemonName = pokemonKey;
    card.dataset.team = team;

    applyTypeBackground(card, pokemon.types);
    card.appendChild(createCardControls(pokemonKey, team));

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

function createMoveUpButton(pokemonKey, team) {
    const moveUpButton = document.createElement('button');
    moveUpButton.type = 'button';
    moveUpButton.className = 'pokemon-card__control pokemon-card__control--move-up';
    moveUpButton.setAttribute('aria-label', 'Move Pokemon up');
    moveUpButton.textContent = '↑';
    moveUpButton.addEventListener('click', function (event) {
        event.stopPropagation();
        movePokemonResult(pokemonKey, team, -1);
    });
    return moveUpButton;
}

function createMoveDownButton(pokemonKey, team) {
    const moveDownButton = document.createElement('button');
    moveDownButton.type = 'button';
    moveDownButton.className = 'pokemon-card__control pokemon-card__control--move-down';
    moveDownButton.setAttribute('aria-label', 'Move Pokemon down');
    moveDownButton.textContent = '↓';
    moveDownButton.addEventListener('click', function (event) {
        event.stopPropagation();
        movePokemonResult(pokemonKey, team, 1);
    });
    return moveDownButton;
}

function createRemoveButton(pokemonKey, team) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'pokemon-card__remove';
    removeButton.setAttribute('aria-label', 'Remove Pokemon');
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', function (event) {
        event.stopPropagation();
        removePokemonResult(pokemonKey, team);
    });
    return removeButton;
}

function createMinimizeButton(pokemonKey, team) {
    const minimizeButton = document.createElement('button');
    minimizeButton.type = 'button';
    minimizeButton.className = 'pokemon-card__control pokemon-card__control--minimize';
    minimizeButton.setAttribute('aria-label', 'Minimize Pokemon card');
    minimizeButton.textContent = '-';
    minimizeButton.addEventListener('click', function (event) {
        event.stopPropagation();
        setPokemonCardCollapsed(pokemonKey, team, true);
    });
    return minimizeButton;
}

function createMaximizeButton(pokemonKey, team) {
    const maximizeButton = document.createElement('button');
    maximizeButton.type = 'button';
    maximizeButton.className = 'pokemon-card__control pokemon-card__control--maximize';
    maximizeButton.setAttribute('aria-label', 'Maximize Pokemon card');
    maximizeButton.textContent = '+';
    maximizeButton.addEventListener('click', function (event) {
        event.stopPropagation();
        setPokemonCardCollapsed(pokemonKey, team, false);
    });
    return maximizeButton;
}

function createCardControls(pokemonKey, team) {
    const controls = document.createElement('div');
    controls.className = 'pokemon-card__controls';
    controls.appendChild(createMoveUpButton(pokemonKey, team));
    controls.appendChild(createMoveDownButton(pokemonKey, team));
    controls.appendChild(createMinimizeButton(pokemonKey, team));
    controls.appendChild(createMaximizeButton(pokemonKey, team));
    controls.appendChild(createRemoveButton(pokemonKey, team));
    return controls;
}

function removePokemonResult(pokemonKey, team) {
    const item = findResultItemByKey(pokemonKey, team);
    if (!item) {
        return;
    }

    item.remove();
    teamPokemonSets[team].delete(pokemonKey);
    resultsCount = Math.max(0, resultsCount - 1);
    syncTeamCardControlStates(team);
    syncManualEntryVisibility();
}

function movePokemonResult(pokemonKey, team, direction) {
    const item = findResultItemByKey(pokemonKey, team);
    if (!item || !item.parentElement) {
        return;
    }

    const sibling = direction < 0 ? item.previousElementSibling : item.nextElementSibling;
    if (!sibling) {
        return;
    }

    if (direction < 0) {
        item.parentElement.insertBefore(item, sibling);
    } else {
        item.parentElement.insertBefore(sibling, item);
    }

    syncTeamCardControlStates(team);
}

function setPokemonCardCollapsed(pokemonKey, team, collapsed) {
    const item = findResultItemByKey(pokemonKey, team);
    if (!item) {
        return;
    }

    const card = item.querySelector('.pokemon-card');
    if (!card) {
        return;
    }

    card.classList.toggle('is-collapsed', collapsed);
    card.dataset.collapsed = String(collapsed);
    syncTeamCardControlStates(team);
}

function syncTeamCardControlStates(team) {
    const teamList = teamResultsLists[team];
    if (!teamList) {
        return;
    }

    const items = Array.from(teamList.querySelectorAll('.results-list-item'));
    items.forEach((item, index) => {
        const card = item.querySelector('.pokemon-card');
        if (!card) {
            return;
        }

        const isCollapsed = card.classList.contains('is-collapsed');
        const moveUpButton = card.querySelector('.pokemon-card__control--move-up');
        const moveDownButton = card.querySelector('.pokemon-card__control--move-down');
        const minimizeButton = card.querySelector('.pokemon-card__control--minimize');
        const maximizeButton = card.querySelector('.pokemon-card__control--maximize');

        if (moveUpButton) {
            moveUpButton.disabled = index === 0;
        }

        if (moveDownButton) {
            moveDownButton.disabled = index === items.length - 1;
        }

        if (minimizeButton) {
            minimizeButton.hidden = isCollapsed;
        }

        if (maximizeButton) {
            maximizeButton.hidden = !isCollapsed;
        }
    });
}

function findResultItemByKey(pokemonKey, team) {
    const teamList = team ? teamResultsLists[team] : resultsList;
    return Array.from(teamList.querySelectorAll('[data-pokemon-name]')).find(
        (item) => item.dataset.pokemonName === pokemonKey && (!team || item.dataset.team === team)
    ) || null;
}

function flashExistingPokemon(pokemonKey, team) {
    const item = findResultItemByKey(pokemonKey, team);
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

function showDataEntryInput(pokemonName, team = selectedTeam) {
    dataEntry.style.display = 'block';
    dataEntry.dataset.targetPokemonName = normalizePokemonName(pokemonName);
    dataEntry.dataset.targetTeam = team;
}

function handleManualDataEntry() {
    const inputData = resultDataInput.value.trim();
    if (!inputData) {
        return;
    }

    parsePokemonData(inputData);

    const targetKey = dataEntry.dataset.targetPokemonName;
    const targetTeam = dataEntry.dataset.targetTeam || selectedTeam;
    const item = targetKey ? findResultItemByKey(targetKey, targetTeam) : null;
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
    teamPokemonSets.my.clear();
    teamPokemonSets.opponent.clear();
    searchInput.value = '';
    clearTeamResults('my');
    clearTeamResults('opponent');
    dataEntry.style.display = 'none';
    dataEntry.dataset.targetPokemonName = '';
    dataEntry.dataset.targetTeam = '';
    resultDataInput.value = '';
    resultsCount = 0;
    hideSuggestions();
}

function clearTeamResults(team) {
    const teamList = teamResultsLists[team];
    if (!teamList) {
        return;
    }

    const teamItems = Array.from(teamList.querySelectorAll('.results-list-item'));
    resultsCount = Math.max(0, resultsCount - teamItems.length);
    teamList.innerHTML = '';
    teamPokemonSets[team].clear();
}

function focusTextBox(textBoxID) {
    document.getElementById(textBoxID).focus();
}


