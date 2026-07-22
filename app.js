/* global L, CONFIG, supabase */
// ============================================================================
//  Lógica del panel: carga datos (demo o Supabase real), pinta mapa + lista.
// ============================================================================

const CENTER = [32.308, -106.772]; // Las Cruces, NM

// ---- Datos de DEMO (para que veas la idea sin backend) ---------------------
const DEMO_WORKERS = [
  { id: "6", name: "Ivan Perez", lat: 32.3088, lng: -106.7760, status: "moving", km: 15.9, idleMin: 0,  battery: 82, place: "S Locust St", img: "assets/ivan-perez.png" },
  { id: "7", name: "Anilu",      lat: 32.3055, lng: -106.7715, status: "moving", km: 11.3, idleMin: 0,  battery: 67, place: "E Idaho Ave", img: "assets/anilu.png" },
];

// Foto de cada trabajador. En modo real se empareja por nombre.
// (Cuando sepas los IDs de Life360, puedes cambiar la llave por el id.)
const PHOTOS = {
  "Ivan Perez": "assets/ivan-perez.png",
  "Anilu": "assets/anilu.png",
};

let map, markers = {}, trails = {}, selectedId = null, fittedOnce = false;

function statusOf(w) { return w.status; }
function initials(name) { return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }

// ---- Mapa ------------------------------------------------------------------
function initMap() {
  map = L.map("map", { zoomControl: true, attributionControl: false }).setView(CENTER, 15);
  // Satélite (Esri World Imagery) — se parece a lo que ves en Life360.
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19 }
  ).addTo(map);
}

function pinIcon(w) {
  const color = w.status === "moving" ? "#22c55e" : w.status === "idle" ? "#f59e0b" : "#9aa2b1";
  // Repartidor en scooter dejando flyers 🛵📄
  const label = w.status === "idle" ? `${initials(w.name)} · ${w.idleMin}m` : w.name.split(" ")[0];
  // Contenido central: foto del trabajador si tiene, si no el scooter 🛵.
  const inner = w.img
    ? `<img src="${w.img}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🛵',style:'font-size:20px'}))" style="width:100%;height:100%;object-fit:cover;object-position:center 30%">`
    : `<span style="font-size:20px;line-height:1">🛵</span>`;
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);text-align:center">
      <div style="font-size:11px;font-weight:800;color:#0f1117;background:${color};padding:2px 7px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.4);margin-bottom:2px;display:inline-block">
        ${label}
      </div>
      <div style="position:relative;width:48px;height:48px;margin:0 auto">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.25;${w.status === "moving" ? "animation:ping 1.6s ease-out infinite" : ""}"></div>
        <div style="position:absolute;inset:3px;border-radius:50%;overflow:hidden;background:#fff;border:2px solid ${color};display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.4)">
          ${inner}
        </div>
        <span style="position:absolute;top:-2px;right:-2px;font-size:14px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))">📄</span>
      </div>
    </div>`,
  });
}

function renderMap(workers) {
  const active = workers.filter(w => w.status !== "off");

  // Dibuja/actualiza el CAMINO (recorrido) de cada trabajador.
  workers.forEach(w => {
    const color = w.status === "moving" ? "#22c55e" : w.status === "idle" ? "#f59e0b" : "#9aa2b1";
    if (w.trail && w.trail.length > 1) {
      if (trails[w.id]) {
        trails[w.id].setLatLngs(w.trail).setStyle({ color });
      } else {
        trails[w.id] = L.polyline(w.trail, {
          color, weight: 4, opacity: 0.85, lineJoin: "round", lineCap: "round",
        }).addTo(map);
      }
    } else if (trails[w.id]) {
      map.removeLayer(trails[w.id]);
      delete trails[w.id];
    }
  });

  active.forEach(w => {
    const pos = [w.lat, w.lng];
    if (markers[w.id]) {
      markers[w.id].setLatLng(pos).setIcon(pinIcon(w));
    } else {
      markers[w.id] = L.marker(pos, { icon: pinIcon(w) }).addTo(map);
    }
    markers[w.id].bindPopup(
      `<b class="pin-lbl">${w.name}</b><br>${w.place}<br>` +
      (w.status === "idle" ? `⏸ parado ${w.idleMin} min<br>` : "🟢 en movimiento<br>") +
      `🔋 ${w.battery}% · 📏 ${w.km} km hoy`
    );
  });
  // La primera vez que hay gente con señal, centra el mapa en ellos.
  if (!fittedOnce && active.length) {
    fittedOnce = true;
    if (active.length === 1) {
      map.setView([active[0].lat, active[0].lng], 16);
    } else {
      map.fitBounds(active.map(w => [w.lat, w.lng]), { padding: [60, 60], maxZoom: 16 });
    }
  }
}

// ---- Panel lateral + KPIs --------------------------------------------------
function renderSidebar(workers) {
  const moving = workers.filter(w => w.status === "moving").length;
  const idle = workers.filter(w => w.status === "idle").length;
  const active = workers.filter(w => w.status !== "off").length;
  const km = workers.reduce((s, w) => s + w.km, 0);
  document.getElementById("kMoving").textContent = moving;
  document.getElementById("kIdle").textContent = idle;
  document.getElementById("kKm").textContent = km.toFixed(1);
  document.getElementById("kActive").textContent = active;

  const list = document.getElementById("workerList");
  list.innerHTML = "";
  workers.forEach(w => {
    const el = document.createElement("div");
    el.className = "worker" + (w.id === selectedId ? " sel" : "");
    const tag = w.status === "moving" ? `<span class="tag moving">En movimiento</span>`
      : w.status === "idle" ? `<span class="tag idle">Parado ${w.idleMin} min</span>`
      : `<span class="tag off">Sin señal</span>`;
    const face = w.img
      ? `<img src="${w.img}" onerror="this.replaceWith(document.createTextNode('${initials(w.name)}'))" style="width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:center 30%">`
      : initials(w.name);
    el.innerHTML = `
      <div class="avatar" style="overflow:hidden;background:#fff">${face}<span class="st ${w.status}"></span></div>
      <div>
        <div class="w-name">${w.name}</div>
        <div class="w-meta">${w.place}${w.status !== "off" ? " · 🔋 " + w.battery + "%" : ""}</div>
        ${tag}
      </div>
      <div class="w-right">
        <div class="w-km">${w.km.toFixed(1)}<span> km</span></div>
      </div>`;
    el.onclick = () => {
      selectedId = w.id;
      if (markers[w.id]) { map.setView([w.lat, w.lng], 17); markers[w.id].openPopup(); }
      renderSidebar(workers);
    };
    list.appendChild(el);
  });
}

function renderAlerts(workers) {
  const box = document.getElementById("alerts");
  box.innerHTML = "";
  workers.filter(w => w.status === "idle").sort((a, b) => b.idleMin - a.idleMin).forEach(w => {
    const c = document.createElement("div");
    c.className = "alert-card";
    c.innerHTML = `<div class="t">⏸ ${w.name} lleva ${w.idleMin} min parado</div>
      <div class="s">${w.place} · 🔋 ${w.battery}%</div>`;
    box.appendChild(c);
  });
}

// ---- Carga de datos --------------------------------------------------------
async function loadFromSupabase() {
  // Lee la última posición de cada trabajador + su distancia de hoy + inactividad abierta.
  const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  const [{ data: workers }, { data: distance }, { data: idle }] = await Promise.all([
    sb.from("trk_workers").select("id,name,photo_url").eq("active", true),
    sb.from("trk_daily_distance").select("worker_id,km").eq("day", new Date().toISOString().slice(0, 10)),
    sb.from("trk_idle_events").select("worker_id,started_at").is("ended_at", null),
  ]);

  // Última posición por trabajador
  const result = [];
  for (const w of workers ?? []) {
    // Usamos inserted_at (hora en que el SERVIDOR recibió el punto) — es a prueba
    // de teléfonos con el reloj mal puesto. captured_at (hora del teléfono) puede
    // venir atrasada y marcaría "sin señal" falsamente.
    const { data: snap } = await sb
      .from("trk_positions")
      .select("lat,lng,battery,inserted_at")
      .eq("worker_id", w.id)
      .order("inserted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Recorrido (camino) de las últimas 12 horas para dibujar la ruta.
    const sinceISO = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const { data: track } = await sb
      .from("trk_positions")
      .select("lat,lng")
      .eq("worker_id", w.id)
      .gte("inserted_at", sinceISO)
      .order("inserted_at", { ascending: true })
      .limit(1000);
    const trail = (track ?? []).map(p => [p.lat, p.lng]);

    const km = distance?.find(d => d.worker_id === w.id)?.km ?? 0;
    const openIdle = idle?.find(i => i.worker_id === w.id);
    const stale = snap ? (Date.now() - new Date(snap.inserted_at).getTime()) > 15 * 60000 : true;

    result.push({
      id: w.id, name: w.name,
      lat: snap?.lat ?? CENTER[0], lng: snap?.lng ?? CENTER[1],
      battery: snap?.battery != null ? Math.round(snap.battery * 100) : 0,
      km: Number(km),
      place: stale ? "sin señal" : `${snap.lat.toFixed(4)}, ${snap.lng.toFixed(4)}`,
      status: stale ? "off" : openIdle ? "idle" : "moving",
      idleMin: openIdle ? Math.round((Date.now() - new Date(openIdle.started_at).getTime()) / 60000) : 0,
      img: w.photo_url || PHOTOS[w.name],
      trail,
    });
  }
  return result;
}

function loadDemo() {
  // Pequeño "jitter" para que se sienta vivo: los que se mueven cambian un poco.
  return DEMO_WORKERS.map(w => {
    if (w.status === "moving") {
      w = { ...w, lat: w.lat + (Math.random() - 0.5) * 0.0012, lng: w.lng + (Math.random() - 0.5) * 0.0012, km: w.km + 0.1 };
    } else if (w.status === "idle") {
      w = { ...w, idleMin: w.idleMin + 1 };
    }
    return w;
  });
}

async function refresh() {
  let workers;
  try {
    workers = CONFIG.DEMO_MODE ? loadDemo() : await loadFromSupabase();
  } catch (e) {
    console.error("Error cargando datos:", e);
    return;
  }
  // Persistimos el jitter en demo
  if (CONFIG.DEMO_MODE) workers.forEach(w => { const i = DEMO_WORKERS.findIndex(d => d.id === w.id); DEMO_WORKERS[i] = w; });
  renderMap(workers);
  renderSidebar(workers);
  renderAlerts(workers);
}

function tickClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString("es-MX");
}

// ---- Arranque --------------------------------------------------------------
initMap();
if (!CONFIG.DEMO_MODE) document.getElementById("demoBadge").style.display = "none";
refresh();
tickClock();
setInterval(tickClock, 1000);
setInterval(refresh, CONFIG.DEMO_MODE ? 3000 : CONFIG.REFRESH_SECONDS * 1000);
