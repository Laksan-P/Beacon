document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.querySelector("#incidentTable tbody");
    const HQ_API_URL = "http://localhost:5000/reports";

    const map = L.map("map").setView([6.9271, 79.8612], 9);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    const markers = L.layerGroup().addTo(map);

    const severityLevelMap = {
        1: "Critical",
        2: "High",
        3: "Medium",
        4: "Low",
        5: "Minimal"
    };

    const db = new Dexie("AegisDB");
    db.version(2).stores({
        reports: "++id, incidentType, severity, lat, lng, timestamp, photo, synced"
    });

    async function fetchAndRenderReports() {
        const serverReports = await fetch(HQ_API_URL).then(r => r.json());
        const localReports = await db.reports.toArray();

        tableBody.innerHTML = "";
        markers.clearLayers();

        serverReports.forEach((r, i) => {
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lng);

            const row = tableBody.insertRow();
            row.insertCell().textContent = i + 1;
            row.insertCell().textContent = r.incidentType || "Unknown";
            row.insertCell().textContent =
                severityLevelMap[r.severity] || "Unknown";
            row.insertCell().textContent =
                new Date(r.timestamp).toLocaleString();
            row.insertCell().textContent =
                !isNaN(lat) && !isNaN(lng)
                    ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                    : "N/A";

            if (!isNaN(lat) && !isNaN(lng)) {
                L.circleMarker([lat, lng], {
                    radius: 8,
                    fillOpacity: 0.8
                }).addTo(markers);
            }
        });

        console.log(`Dashboard refreshed (${serverReports.length} reports)`);
    }

    fetchAndRenderReports();
    setInterval(fetchAndRenderReports, 5000);
});

