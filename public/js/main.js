// ================== AUTH / REDIRECTION ==================
const STORAGE_TOKEN_KEY = 'authToken';
let token = localStorage.getItem(STORAGE_TOKEN_KEY);

// Si pas connecté → retour à la page de login
if (!token) {
    window.location.href = '/login.html';
}

// ================== VARIABLES GLOBALES ==================
let map = L.map('map').setView([46.6, 2.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = new Map(); // id -> marker
let lines = [];

let addMarkerMode = false;
let linkMarkersMode = false;

let sidebar = document.getElementById('sidebar');
let markerList = document.getElementById('markerList');
let exportMenu = document.getElementById('exportMenu');
let importFileInput = document.getElementById('importFile');

let selectedMarkersToLink = [];

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
    loadMarkers();
});

function attachUIEvents() {
    document.getElementById('btnAddMarker').addEventListener('click', toggleAddMarker);
    document.getElementById('btnLinkMarkers').addEventListener('click', toggleLinkMarkers);
    document.getElementById('btnToggleSidebar').addEventListener('click', toggleSidebar);
    document.getElementById('btnExportMenu').addEventListener('click', toggleExportMenu);
    document.getElementById('btnExportMarkers').addEventListener('click', exportMarkers);
    document.getElementById('btnImportMarkers').addEventListener('click', () => importFileInput.click());
    document.getElementById('btnSearch').addEventListener('click', searchLocation);
    importFileInput.addEventListener('change', importMarkersFile);

    map.on('click', onMapClick);
}

// ================== MODES ET UI ==================
function toggleSidebar() {
    sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
}

function toggleAddMarker() {
    addMarkerMode = !addMarkerMode;
    document.getElementById('btnAddMarker').textContent =
        "Ajouter un repère: " + (addMarkerMode ? "ON" : "OFF");
}

function toggleLinkMarkers() {
    linkMarkersMode = !linkMarkersMode;
    document.getElementById('btnLinkMarkers').textContent =
        "Relier des repères: " + (linkMarkersMode ? "ON" : "OFF");
}

function toggleExportMenu() {
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
    const name = data.name || ('Repère ' + data.id);

    const marker = L.marker([data.lat, data.lng], { draggable: true }).addTo(map);

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

    marker.on('dragend', async function () {
        const pos = this.getLatLng();
        this.data.lat = pos.lat;
        this.data.lng = pos.lng;
        try {
            await apiSend('/api/markers/' + this.data.id, 'PUT', this.data);
            updateMarkerList();
        } catch (e) {
            console.error(e);
            alert('Erreur de mise à jour');
        }
    });

    marker.on('click', function (event) {
        if (linkMarkersMode) {
            selectMarkerForLink(this);
            event.originalEvent.preventDefault();
            event.originalEvent.stopPropagation();
        } else {
            this.openPopup();
        }
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
        alert('Erreur de mise à jour');
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

// ================== LIENS ENTRE REPÈRES ==================
function selectMarkerForLink(marker) {
    if (selectedMarkersToLink.includes(marker)) {
        selectedMarkersToLink = selectedMarkersToLink.filter(m => m !== marker);
        marker.setIcon(new L.Icon.Default());
    } else {
        if (selectedMarkersToLink.length >= 2) {
            alert("Vous ne pouvez relier que 2 repères à la fois. Désélectionnez un repère.");
            return;
        }
        selectedMarkersToLink.push(marker);
        marker.setIcon(new L.Icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-red.png'
        }));
    }

    if (selectedMarkersToLink.length === 2) {
        const latlngs = [
            selectedMarkersToLink[0].getLatLng(),
            selectedMarkersToLink[1].getLatLng()
        ];
        const polyline = L.polyline(latlngs, { color: 'red' }).addTo(map);
        lines.push(polyline);
        selectedMarkersToLink.forEach(m => m.setIcon(new L.Icon.Default()));
        selectedMarkersToLink = [];
    }
}

// ================== EXPORT / IMPORT (fichier JSON local) ==================
function exportMarkers() {
    const data = Array.from(markers.values()).map(m => m.data);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'reperes.json';
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
async function searchLocation() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fr`
    );
    const data = await resp.json();
    if (data.length > 0) {
        map.setView([data[0].lat, data[0].lon], 13);
    } else {
        alert("Lieu introuvable");
    }
}