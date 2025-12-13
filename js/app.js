document.addEventListener("DOMContentLoaded", () => {
    const statusDiv = document.getElementById("networkStatus");
    const form = document.getElementById("incidentForm");
    const message = document.getElementById("message");
    const geoStatusDiv = document.getElementById("geolocationStatus");

    let currentLat = null;
    let currentLng = null;

    const severityInput = document.getElementById("severity");
    const severityLabel = document.getElementById("severityLabel");

    

    const severityDisplayMap = {
    1: { text: "Critical", class: "critical" },
    2: { text: "High", class: "high" },
    3: { text: "Medium", class: "medium" },
    4: { text: "Low", class: "low" },
    5: { text: "Minimal", class: "minimal" }
    };


    severityInput.addEventListener("input", () => {
        const s = severityMap[severityInput.value];
        severityLabel.textContent = s.text;
        severityLabel.className = `severity-text ${s.class}`;
    });

    // Load last known location (offline fallback)
    const savedLocation = localStorage.getItem("lastKnownLocation");
    if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        currentLat = loc.lat;
        currentLng = loc.lng;
    }

    // --- INDEXEDDB SETUP ---
    const db = new Dexie("AegisDB");
    db.version(2).stores({
        reports: "++id, incidentType, severity, lat, lng, timestamp, synced"
    });

    const toggleBtn = document.getElementById("toggleHistory");
    const historySection = document.getElementById("historySection");
    const historyTable = document.getElementById("historyTable");

    // Toggle history view
    toggleBtn.addEventListener("click", async () => {
        historySection.style.display =
            historySection.style.display === "none" ? "block" : "none";

        toggleBtn.textContent =
            historySection.style.display === "block"
                ? "Hide History"
                : "View Incident History";

        if (historySection.style.display === "block") {
            await loadHistory();
        }
    });

    async function loadHistory() {
    const reports = await db.reports.toArray();
    historyTable.innerHTML = "";

    if (reports.length === 0) {
        historyTable.innerHTML =
        `<tr><td colspan="6">No reports saved yet</td></tr>`;
        return;
    }

    reports.reverse().forEach(r => {
        const sev = severityDisplayMap[r.severity];

        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${r.incidentType}</td>
        <td class="${sev.class}">${sev.text}</td>
        <td>${r.lat ?? "N/A"}</td>
        <td>${r.lng ?? "N/A"}</td>
        <td>${new Date(r.timestamp).toLocaleString()}</td>
        <td>${r.synced ? "Synced" : "Pending"}</td>
        `;
        historyTable.appendChild(row);
    });
    }



    form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const incidentType = document.getElementById("incidentType").value;
    const severity = document.getElementById("severity").value;
    
    await db.reports.add({
        incidentType,
        severity,
        lat: currentLat,
        lng: currentLng,
        timestamp: new Date().toISOString(),
        synced: false
    });

    message.textContent = "Saved locally";
    form.reset();

    await loadHistory();   // 🔥 THIS IS WHAT YOU WERE MISSING

    if (navigator.onLine) syncReports();
    });




    // --- CAPTURE GPS ON LOAD (IMPORTANT) ---
    function captureLocation() {
        if (!("geolocation" in navigator)) {
            geoStatusDiv.textContent = "Geolocation not supported.";
            return;
        }

        geoStatusDiv.textContent = "Getting GPS location...";

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                currentLat = pos.coords.latitude;
                currentLng = pos.coords.longitude;

                // 🔥 Save for offline use
                localStorage.setItem(
                    "lastKnownLocation",
                    JSON.stringify({ lat: currentLat, lng: currentLng })
                );

                console.log("GPS READY:", currentLat, currentLng);

                geoStatusDiv.textContent =
                    `GPS Ready: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`;
            },
            (error) => {
                console.error("GPS error:", error);
                geoStatusDiv.textContent =
                    "GPS unavailable. Report will be saved without location.";
            },
            {
                enableHighAccuracy: false,   // 🔥 critical for desktop
                timeout: 15000,
                maximumAge: 60000
            }
        );
    }

    // --- SYNC LOGIC ---
    async function syncReports() {
        if (!navigator.onLine) return;

        const unsyncedReports = await db.reports
            .filter(r => r.synced === false)
            .toArray();

        for (const report of unsyncedReports) {
            const { id, synced, ...dataToSend } = report;

            try {
                const res = await fetch("http://localhost:5000/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend)
                });

                if (res.ok) {
                    await db.reports.update(id, { synced: true });
                    console.log(`Synced report ID ${id}`);
                }
            } catch {
                break;
            }
        }
    }

    // --- NETWORK STATUS ---
    function updateStatus() {
    if (!statusDiv) return;

    statusDiv.classList.remove("online", "offline");

        if (navigator.onLine) {
            statusDiv.textContent = "ONLINE – All systems operational";
            statusDiv.classList.add("online");
            syncReports();
        } else {
            statusDiv.textContent = "OFFLINE – Working in offline mode";
            statusDiv.classList.add("offline");
        }
    }


    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    

    // --- INIT ---
    captureLocation();
    updateStatus();
    loadHistory();
});
