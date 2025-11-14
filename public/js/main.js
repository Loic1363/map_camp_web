// ================== AUTH / REDIRECTION ==================
const STORAGE_TOKEN_KEY = 'authToken';
let token = localStorage.getItem(STORAGE_TOKEN_KEY);

// Si pas connecté → retour à la page de login
if (!token) {
    window.location.href = '/login.html';
}

const LANGUAGE_STORAGE_KEY = 'appLanguage';
const SIDEBAR_STATE_KEY = 'sidebarState';
const TRANSLATIONS = {
    fr: {
        addMarkerLabel: 'Ajouter un repère',
        statusOn: 'ACTIF',
        statusOff: 'INACTIF',
        searchPlaceholder: 'Rechercher une ville, une adresse ou un lieu...',
        searchButton: 'Aller',
        sidebarTitle: 'Repères',
        sidebarSubtitle: 'Cliquez sur un repère pour le centrer sur la carte.',
        sidebarTip: 'Astuce : cliquez sur un repère pour modifier ses informations.',
        productSubtitle: 'Espace de travail cartographique',
        exportMarkersButton: 'Exporter les repères (JSON)',
        importMarkersButton: 'Importer des repères',
        logout: 'Se déconnecter',
        defaultMarkerName: 'Repère',
        exportFileName: 'reperes.json'
    },
    en: {
        addMarkerLabel: 'Add marker',
        statusOn: 'ON',
        statusOff: 'OFF',
        searchPlaceholder: 'Search a city, address or point of interest...',
        searchButton: 'Search',
        sidebarTitle: 'Markers',
        sidebarSubtitle: 'Click a marker name to focus it on the map.',
        sidebarTip: 'Tip: click a marker to edit its details.',
        productSubtitle: 'Operations map workspace',
        exportMarkersButton: 'Export markers (JSON)',
        importMarkersButton: 'Import markers',
        logout: 'Logout',
        defaultMarkerName: 'Marker',
        exportFileName: 'markers.json'
    },
    nl: {
        addMarkerLabel: 'Marker toevoegen',
        statusOn: 'AAN',
        statusOff: 'UIT',
        searchPlaceholder: 'Zoek een stad, adres of interessant punt...',
        searchButton: 'Zoeken',
        sidebarTitle: 'Markers',
        sidebarSubtitle: 'Klik op een marker om deze op de kaart te centreren.',
        sidebarTip: 'Tip: klik op een marker om de details te wijzigen.',
        productSubtitle: 'Kaartwerkruimte',
        exportMarkersButton: 'Markers exporteren (JSON)',
        importMarkersButton: 'Markers importeren',
        logout: 'Afmelden',
        defaultMarkerName: 'Marker',
        exportFileName: 'markeringen.json'
    }
};

let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'fr';
if (!TRANSLATIONS[currentLanguage]) {
    currentLanguage = 'fr';
}

// ================== VARIABLES GLOBALES ==================
let map = L.map('map').setView([46.6, 2.5], 6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let markers = new Map(); // id -> marker

let addMarkerMode = false;

let sidebar = document.getElementById('sidebar');
let markerList = document.getElementById('markerList');
let exportMenu = document.getElementById('exportMenu');
let importFileInput = document.getElementById('importFile');
let searchInputEl = document.getElementById('searchInput');
let searchSuggestionsEl = document.getElementById('searchSuggestions');
let searchBarEl = document.querySelector('.search-bar');
let appShell = document.querySelector('.app-shell');
const storedSidebarState = localStorage.getItem(SIDEBAR_STATE_KEY);
let isSidebarVisible = storedSidebarState
    ? storedSidebarState !== 'hidden'
    : window.innerWidth > 900;
const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_SEARCH_ZOOM = 15;
let searchDebounceTimeout = null;
let currentSearchSuggestions = [];
let activeSuggestionIndex = -1;

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMarkerNumber(name) {
    if (!name) return null;
    const trimmed = name.trim();
    for (const lang of Object.values(TRANSLATIONS)) {
        const prefix = escapeRegex(lang.defaultMarkerName);
        const regex = new RegExp(`^${prefix}\\s+(\\d+)$`, 'i');
        const match = trimmed.match(regex);
        if (match) {
            return Number(match[1]);
        }
    }
    return null;
}

function getNextDefaultMarkerName() {
    const languageData = TRANSLATIONS[currentLanguage] || TRANSLATIONS.fr;
    const usedNumbers = new Set();
    markers.forEach((marker) => {
        const number = extractMarkerNumber(marker?.data?.name);
        if (number !== null) {
            usedNumbers.add(number);
        }
    });
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
        nextNumber++;
    }
    return `${languageData.defaultMarkerName} ${nextNumber}`;
}

// ================== INITIALISATION ==================
window.addEventListener('DOMContentLoaded', () => {
    // bouton déconnexion
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_TOKEN_KEY);
            window.location.href = '/login.html';
        });
    }

    attachUIEvents();
    initializeLanguage();
    initializeSidebarState();
    window.addEventListener('resize', applySidebarState);
    loadMarkers();
});

function attachUIEvents() {
    const addMarkerBtn = document.getElementById('btnAddMarker');
    if (addMarkerBtn) addMarkerBtn.addEventListener('click', toggleAddMarker);

    const toggleSidebarBtn = document.getElementById('btnToggleSidebar');
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);

    const exportMenuBtn = document.getElementById('btnExportMenu');
    if (exportMenuBtn && exportMenu) exportMenuBtn.addEventListener('click', toggleExportMenu);

    const exportMarkersBtn = document.getElementById('btnExportMarkers');
    if (exportMarkersBtn) exportMarkersBtn.addEventListener('click', exportMarkers);

    const importMarkersBtn = document.getElementById('btnImportMarkers');
    if (importMarkersBtn) importMarkersBtn.addEventListener('click', () => importFileInput.click());

    const searchBtn = document.getElementById('btnSearch');
    if (searchBtn) searchBtn.addEventListener('click', searchLocation);

    if (searchInputEl) {
        searchInputEl.addEventListener('input', handleSearchInputChange);
        searchInputEl.addEventListener('keydown', handleSearchInputKeydown);
        searchInputEl.addEventListener('focus', handleSearchInputFocus);
    }

    document.addEventListener('click', handleDocumentClick);

    importFileInput.addEventListener('change', importMarkersFile);

    map.on('click', onMapClick);
}

function initializeLanguage() {
    const select = document.getElementById('languageSelect');
    if (select) {
        select.value = currentLanguage;
        select.addEventListener('change', (event) => {
            const value = event.target.value;
            if (!TRANSLATIONS[value]) return;
            currentLanguage = value;
            localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
            applyTranslations();
        });
    }
    applyTranslations();
}

function applyTranslations() {
    const t = TRANSLATIONS[currentLanguage];
    if (!t) return;

    const subtitle = document.querySelector('.product-subtitle');
    if (subtitle) subtitle.textContent = t.productSubtitle;

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    const searchButton = document.getElementById('btnSearch');
    if (searchButton) searchButton.textContent = t.searchButton;

    const sidebarTitle = document.querySelector('.sidebar-header h2');
    if (sidebarTitle) sidebarTitle.textContent = t.sidebarTitle;

    const sidebarSubtitle = document.querySelector('.sidebar-subtitle');
    if (sidebarSubtitle) sidebarSubtitle.textContent = t.sidebarSubtitle;

    const sidebarTip = document.querySelector('.sidebar-tip');
    if (sidebarTip) sidebarTip.textContent = t.sidebarTip;

    const exportBtn = document.getElementById('btnExportMarkers');
    if (exportBtn) exportBtn.textContent = t.exportMarkersButton;

    const importBtn = document.getElementById('btnImportMarkers');
    if (importBtn) importBtn.textContent = t.importMarkersButton;

    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) logoutBtn.textContent = t.logout;

    updateModeButtons();
}

function updateModeButtons() {
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.fr;
    const addBtn = document.getElementById('btnAddMarker');
    if (addBtn) {
        addBtn.textContent = `${t.addMarkerLabel}: ${addMarkerMode ? t.statusOn : t.statusOff}`;
    }
}

// ================== MODES ET UI ==================
function initializeSidebarState() {
    applySidebarState();
}

function applySidebarState() {
    if (!appShell || !sidebar) return;
    appShell.classList.toggle('sidebar-hidden', !isSidebarVisible);
    appShell.classList.toggle('sidebar-visible', isSidebarVisible);
    if (window.innerWidth <= 900) {
        sidebar.setAttribute('aria-hidden', (!isSidebarVisible).toString());
    } else {
        sidebar.removeAttribute('aria-hidden');
    }
}

function toggleSidebar() {
    isSidebarVisible = !isSidebarVisible;
    localStorage.setItem(SIDEBAR_STATE_KEY, isSidebarVisible ? 'visible' : 'hidden');
    applySidebarState();
}

function toggleAddMarker() {
    addMarkerMode = !addMarkerMode;
    updateModeButtons();
}

function toggleExportMenu() {
    if (!exportMenu) return;
    exportMenu.style.display =
        exportMenu.style.display === 'flex' ? 'none' : 'flex';
}

// ================== GESTION CARTE / CLIC ==================
function onMapClick(e) {
    if (!addMarkerMode) return;
    createMarkerOnServer({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: null,
        date: ""
    });
}

// ================== HELPERS API ==================
async function apiGet(path) {
    const res = await fetch(path, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        window.location.href = '/login.html';
        return;
    }
    return res.json();
}

async function apiSend(path, method, body) {
    const res = await fetch(path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(body)
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        window.location.href = '/login.html';
        return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur API');
    return data;
}

// ================== CHARGEMENT / CREATION (DB) ==================
async function loadMarkers() {
    try {
        const data = await apiGet('/api/markers');
        if (!data) return;
        data.forEach(m => createMarkerLocal(m));
    } catch (e) {
        console.error(e);
        alert('Erreur de chargement des repères');
    }
}

async function createMarkerOnServer(data) {
    try {
        const created = await apiSend('/api/markers', 'POST', data);
        createMarkerLocal(created);
    } catch (e) {
        console.error(e);
        alert('Erreur lors de la création du repère');
    }
}

function createMarkerLocal(data) {
    const providedName = data.name ? data.name.trim() : '';
    const name = providedName || getNextDefaultMarkerName();

    const marker = L.marker([data.lat, data.lng], { draggable: false }).addTo(map);

    marker.data = {
        id: data.id,
        lat: data.lat,
        lng: data.lng,
        name: name,
        date: data.date || ""
    };

    markers.set(data.id, marker);

    marker.bindTooltip(marker.data.name, {
        permanent: true,
        direction: 'top',
        className: 'my-labels'
    });

    marker.bindPopup(createPopupForm(marker.data));

    marker.on('click', function () {
        this.openPopup();
    });

    updateMarkerList();
}

// ================== POPUP FORM ==================
function createPopupForm(d) {
    return `
        <form class="popup-form" onsubmit="return false;">
            <label>Nom:</label>
            <input type="text" id="name_${d.id}" value="${d.name}">
            <label>Date:</label>
            <input type="date" id="date_${d.id}" value="${d.date}">
            <button type="button" onclick="saveMarker(${d.id})">Enregistrer</button>
            <button type="button" onclick="removeMarker(${d.id})" style="color:red;">Supprimer</button>
        </form>
    `;
}

// ================== SAUVEGARDE / SUPPRESSION (DB) ==================
window.saveMarker = async function (id) {
    const marker = markers.get(id);
    if (!marker) return;

    marker.data.name = document.getElementById(`name_${id}`).value;
    marker.data.date = document.getElementById(`date_${id}`).value;

    try {
        await apiSend('/api/markers/' + id, 'PUT', marker.data);
        marker.setTooltipContent(marker.data.name);
        updateMarkerList();
    } catch (e) {
        console.error(e);
        alert('Erreur de mise á jour');
    }
};

window.removeMarker = async function (id) {
    const marker = markers.get(id);
    if (!marker) return;

    try {
        await apiSend('/api/markers/' + id, 'DELETE');
        map.removeLayer(marker);
        markers.delete(id);
        updateMarkerList();
    } catch (e) {
        console.error(e);
        alert('Erreur de suppression');
    }
};

function updateMarkerList() {
    markerList.innerHTML = '';
    markers.forEach((m) => {
        const li = document.createElement('li');
        li.textContent = m.data.name;
        li.onclick = () => map.setView([m.data.lat, m.data.lng], 13);
        markerList.appendChild(li);
    });
}


// ================== EXPORT / IMPORT (fichier JSON local) ==================
function exportMarkers() {
    const data = Array.from(markers.values()).map(m => m.data);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const translation = TRANSLATIONS[currentLanguage] || TRANSLATIONS.fr;
    link.download = translation.exportFileName;
    link.click();
}

async function importMarkersFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = async function (evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            for (const m of imported) {
                await createMarkerOnServer(m); // recrée en DB
            }
        } catch (err) {
            alert("Fichier invalide");
            console.error(err);
        } finally {
            importFileInput.value = "";
        }
    };
    reader.readAsText(file);
}

// ================== RECHERCHE D'ADRESSE ==================
function handleSearchInputChange(event) {
    const value = event.target.value.trim();
    if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
    }
    if (!value) {
        clearSearchSuggestions();
        return;
    }
    searchDebounceTimeout = setTimeout(() => {
        fetchSearchSuggestions(value);
    }, SEARCH_DEBOUNCE_MS);
}

function handleSearchInputFocus() {
    if (currentSearchSuggestions.length && searchSuggestionsEl) {
        searchSuggestionsEl.classList.add('visible');
    }
}

function handleSearchInputKeydown(event) {
    if (event.key === 'Enter' && !currentSearchSuggestions.length) {
        searchLocation();
        return;
    }

    if (!currentSearchSuggestions.length) return;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            moveActiveSuggestion(1);
            break;
        case 'ArrowUp':
            event.preventDefault();
            moveActiveSuggestion(-1);
            break;
        case 'Enter':
            event.preventDefault();
            if (activeSuggestionIndex >= 0) {
                selectSuggestion(activeSuggestionIndex);
            }
            break;
        case 'Escape':
            clearSearchSuggestions();
            break;
        default:
            break;
    }
}

function handleDocumentClick(event) {
    if (searchBarEl && !searchBarEl.contains(event.target)) {
        clearSearchSuggestions();
    }
}

async function fetchSearchSuggestions(query) {
    try {
        const results = await fetchLocations(query, 5);
        currentSearchSuggestions = results.map((item) =>
            buildSuggestionFromResult(item, query)
        );
        activeSuggestionIndex = -1;
        renderSearchSuggestions();
    } catch (e) {
        console.error('Search suggestions error', e);
    }
}

function renderSearchSuggestions() {
    if (!searchSuggestionsEl) return;
    searchSuggestionsEl.innerHTML = '';
    if (!currentSearchSuggestions.length) {
        searchSuggestionsEl.classList.remove('visible');
        return;
    }

    const fragment = document.createDocumentFragment();
    currentSearchSuggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = 'search-suggestion' + (index === activeSuggestionIndex ? ' active' : '');

        const title = document.createElement('span');
        title.className = 'suggestion-title';
        title.textContent = suggestion.title || suggestion.label;
        item.appendChild(title);

        if (suggestion.subtitle) {
            const subtitle = document.createElement('span');
            subtitle.className = 'suggestion-subtitle';
            subtitle.textContent = suggestion.subtitle;
            item.appendChild(subtitle);
        }

        item.addEventListener('mousedown', (event) => {
            event.preventDefault();
            selectSuggestion(index);
        });

        fragment.appendChild(item);
    });

    searchSuggestionsEl.appendChild(fragment);
    searchSuggestionsEl.classList.add('visible');
}

function moveActiveSuggestion(step) {
    if (!currentSearchSuggestions.length) return;
    activeSuggestionIndex += step;
    if (activeSuggestionIndex < 0) {
        activeSuggestionIndex = currentSearchSuggestions.length - 1;
    } else if (activeSuggestionIndex >= currentSearchSuggestions.length) {
        activeSuggestionIndex = 0;
    }
    updateSuggestionHighlight();
}

function updateSuggestionHighlight() {
    if (!searchSuggestionsEl) return;
    const nodes = searchSuggestionsEl.querySelectorAll('.search-suggestion');
    nodes.forEach((node, idx) => {
        node.classList.toggle('active', idx === activeSuggestionIndex);
    });
}

function selectSuggestion(index) {
    const suggestion = currentSearchSuggestions[index];
    if (!suggestion) return;
    if (searchInputEl) {
        searchInputEl.value = suggestion.label;
    }
    clearSearchSuggestions();
    moveMapTo(suggestion.lat, suggestion.lon);
}

function clearSearchSuggestions() {
    if (searchSuggestionsEl) {
        searchSuggestionsEl.innerHTML = '';
        searchSuggestionsEl.classList.remove('visible');
    }
    currentSearchSuggestions = [];
    activeSuggestionIndex = -1;
}

function buildSuggestionFromResult(result, fallback = '') {
    const display = (result.display_name || result.name || fallback || '').trim();
    const parts = display.split(',');
    const title = (result.name || parts[0] || fallback || '').trim();
    const subtitle = parts.slice(1).join(',').trim();

    return {
        label: display || fallback,
        title: title || display || fallback,
        subtitle,
        lat: Number(result.lat),
        lon: Number(result.lon)
    };
}

async function fetchLocations(query, limit = 5) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
        headers: {
            'Accept-Language': currentLanguage
        }
    });
    if (!response.ok) {
        throw new Error('Nominatim error');
    }
    return response.json();
}

function moveMapTo(lat, lon, zoom = DEFAULT_SEARCH_ZOOM) {
    map.setView([lat, lon], zoom);
}

async function searchLocation() {
    const query = (searchInputEl?.value || '').trim();
    if (!query) return;

    try {
        const results = await fetchLocations(query, 1);
        if (!results.length) {
            alert("Lieu introuvable");
            return;
        }
        const suggestion = buildSuggestionFromResult(results[0], query);
        moveMapTo(suggestion.lat, suggestion.lon);
        if (searchInputEl && suggestion.label) {
            searchInputEl.value = suggestion.label;
        }
        clearSearchSuggestions();
    } catch (e) {
        console.error(e);
        alert("Impossible de trouver ce lieu pour l'instant.");
    }
}