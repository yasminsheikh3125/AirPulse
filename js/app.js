const API_BASE = "http://localhost:5000/api/air";

const AQI_COLORS = {
  good: { hex: "#22c55e", label: "Good", textColor: "#86efac" },
  moderate: { hex: "#f0a500", label: "Moderate", textColor: "#fde047" },
  usg: { hex: "#f97316", label: "Unhealthy for SG", textColor: "#fdba74" },
  unhealthy: { hex: "#ef4444", label: "Unhealthy", textColor: "#fca5a5" },
  vunhealthy: { hex: "#a855f7", label: "Very Unhealthy", textColor: "#d8b4fe" }
};

const PERSONA_META = {
  general: { icon: "AQ", title: "Daily Guidance", action: "Use this advice", type: "info" },
  asthma: { icon: "A", title: "Asthma Care", action: "Take precautions", type: "danger" },
  runner: { icon: "R", title: "Workout Planning", action: "Adjust activity", type: "warning" },
  child: { icon: "C", title: "Sensitive Groups", action: "Plan safer time", type: "warning" },
  pregnant: { icon: "P", title: "Pregnancy Safety", action: "Follow advice", type: "info" }
};

const state = {
  city: "Mumbai, Maharashtra",
  lat: null,
  lon: null,
  summary: null,
  forecast72: [],
  hourlyData: [],
  heatmapPoints: [],
  recommendations: {
    general: [],
    asthma: [],
    runner: [],
    child: [],
    pregnant: []
  }
};

let forecastChart = null;
let pollutantChart = null;
let liveMap = null;
let liveMapLayers = [];

function byId(id) {
  return document.getElementById(id);
}

function aqiCategory(value) {
  if (value <= 50) return "good";
  if (value <= 100) return "moderate";
  if (value <= 150) return "usg";
  if (value <= 200) return "unhealthy";
  return "vunhealthy";
}

function weatherIcon(description) {
  const text = String(description || "").toLowerCase();
  if (text.includes("rain") || text.includes("drizzle")) return "Rain";
  if (text.includes("storm") || text.includes("thunder")) return "Storm";
  if (text.includes("cloud")) return "Cloud";
  if (text.includes("mist") || text.includes("haze") || text.includes("smoke")) return "Haze";
  if (text.includes("clear")) return "Clear";
  return "Weather";
}

function clearChildren(node) {
  if (node) {
    node.innerHTML = "";
  }
}

function setText(id, value) {
  const node = byId(id);
  if (node) {
    node.textContent = value;
  }
}

function setSearchStatus(message = "", type = "") {
  const node = byId("search-status");
  if (!node) return;
  node.textContent = message;
  node.className = `search-status ${type}`.trim();
}

async function fetchJson(url) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload.error || payload.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function updateClock() {
  const clock = byId("clock");
  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function buildNotificationItems() {
  const summary = state.summary;
  if (!summary) {
    return [];
  }

  const generalAdvice = state.recommendations.general || [];
  const aqi = summary.aqi;
  const type = aqi > 150 ? "notif-crit" : aqi > 100 ? "notif-warn" : "notif-good";

  return generalAdvice.slice(0, 4).map((item, index) => ({
    type,
    icon: index === 0 ? "!" : index === 1 ? "A" : index === 2 ? "P" : "O",
    title: `${summary.city}: ${item}`,
    desc: `Current AQI ${summary.aqi}. ${summary.weather}.`,
    time: index === 0 ? "just now" : `${index * 15} min ago`
  }));
}

async function searchLocation(query) {
  const payload = await fetchJson(`${API_BASE}/locations?q=${encodeURIComponent(query)}`);
  return payload.items?.[0] || null;
}

async function loadDashboardData() {
  const query = `city=${encodeURIComponent(state.city)}${state.lat !== null ? `&lat=${state.lat}&lon=${state.lon}` : ""}`;
  const [summary, forecast, heatmap] = await Promise.all([
    fetchJson(`${API_BASE}/summary?${query}`),
    fetchJson(`${API_BASE}/forecast?${query}`),
    fetchJson(`${API_BASE}/heatmap?${query}`)
  ]);

  state.summary = summary;
  state.city = summary.city;
  state.lat = summary.location?.lat ?? state.lat;
  state.lon = summary.location?.lon ?? state.lon;
  state.forecast72 = forecast.forecast72 || summary.forecast72 || [];
  state.hourlyData = forecast.hourlyData || summary.hourlyData || [];
  state.heatmapPoints = heatmap.points || [];
  state.recommendations = summary.recommendations || state.recommendations;
}

function initMainAQI() {
  const data = state.summary;
  if (!data) return;

  const category = aqiCategory(data.aqi);
  const color = AQI_COLORS[category];

  setText("sidebar-aqi", data.aqi);
  if (byId("sidebar-aqi")) {
    byId("sidebar-aqi").style.color = color.hex;
  }
  if (byId("sidebar-bar")) {
    byId("sidebar-bar").style.width = `${Math.min(100, (data.aqi / 300) * 100)}%`;
    byId("sidebar-bar").style.background = color.hex;
  }
  setText("sidebar-badge", color.label);
  setText("sidebar-city", data.city.split(",")[0]);
  setText("topbar-city", data.city);

  const arc = byId("gauge-arc");
  if (arc) {
    const totalLength = 172;
    const percent = Math.min(1, data.aqi / 300);
    setTimeout(() => {
      arc.setAttribute("stroke-dasharray", `${totalLength * percent} ${totalLength}`);
    }, 200);
  }

  setText("gauge-text", data.aqi);

  const badge = byId("aqi-status-badge");
  if (badge) {
    badge.textContent = color.label;
    badge.style.background = `${color.hex}20`;
    badge.style.color = color.textColor;
    badge.style.border = `1px solid ${color.hex}40`;
  }

  setText("temp-val", `${data.temp} C`);
  setText("feels-like", `Feels like ${data.feels_like} C`);
  setText("pm25-kpi", data.pm25.toFixed(1));
  setText("humidity-kpi", `${data.humidity}%`);
  setText("wind-kpi", `Wind ${data.wind} m/s`);

  setText("pm25", data.pm25.toFixed(1));
  setText("pm10", data.pm10.toFixed(1));
  setText("no2", data.no2.toFixed(1));
  setText("o3", data.o3.toFixed(1));
  setText("so2", data.so2.toFixed(1));
  setText("co", data.co.toFixed(2));

  setTimeout(() => {
    if (byId("pm25bar")) byId("pm25bar").style.width = `${Math.min(100, (data.pm25 / 150) * 100)}%`;
    if (byId("pm10bar")) byId("pm10bar").style.width = `${Math.min(100, (data.pm10 / 250) * 100)}%`;
    if (byId("no2bar")) byId("no2bar").style.width = `${Math.min(100, (data.no2 / 200) * 100)}%`;
    if (byId("o3bar")) byId("o3bar").style.width = `${Math.min(100, (data.o3 / 100) * 100)}%`;
    if (byId("so2bar")) byId("so2bar").style.width = `${Math.min(100, (data.so2 / 75) * 100)}%`;
    if (byId("cobar")) byId("cobar").style.width = `${Math.min(100, (data.co / 10) * 100)}%`;
  }, 250);

  setText("weather-icon", data.weatherIcon || weatherIcon(data.weather));
  setText("temp-weather", `${data.temp} C`);
  setText("weather-desc", data.weather);
  setText("humidity", `${data.humidity}%`);
  setText("wind", `${data.wind} m/s`);
  setText("visibility", `${data.visibility} km`);
}

function renderSafeHours(gridId, tooltipId) {
  const grid = byId(gridId);
  if (!grid) return;

  clearChildren(grid);

  const colorMap = {
    good: "#22c55e",
    moderate: "#f0a500",
    usg: "#f97316",
    unhealthy: "#ef4444",
    vunhealthy: "#a855f7"
  };

  state.hourlyData.slice(0, 24).forEach((entry, index) => {
    const aqi = typeof entry === "number" ? entry : entry.aqi;
    const category = aqiCategory(aqi);
    const block = document.createElement("div");
    block.className = "sh-block";
    block.style.background = colorMap[category];
    block.style.opacity = category === "good" ? "1" : category === "moderate" ? ".85" : ".65";
    block.addEventListener("mouseenter", () => {
      const tooltip = byId(tooltipId);
      if (!tooltip) return;
      tooltip.textContent = `${index}:00 - AQI ${aqi}`;
      tooltip.style.display = "block";
    });
    block.addEventListener("mouseleave", () => {
      const tooltip = byId(tooltipId);
      if (tooltip) tooltip.style.display = "none";
    });
    block.addEventListener("mousemove", (event) => {
      const tooltip = byId(tooltipId);
      if (!tooltip) return;
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY - 32}px`;
    });
    grid.appendChild(block);
  });
}

function initLiveMap() {
  const mapNode = byId("live-map");
  if (!mapNode || typeof L === "undefined" || !state.summary) return;

  if (!liveMap) {
    liveMap = L.map(mapNode, {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(liveMap);
  }

  liveMapLayers.forEach((layer) => layer.remove());
  liveMapLayers = [];

  const center = [state.summary.location.lat, state.summary.location.lon];
  liveMap.setView(center, 11);

  const mainCategory = aqiCategory(state.summary.aqi);
  const mainMarker = L.marker(center).bindPopup(`<strong>${state.summary.city}</strong><br/>AQI ${state.summary.aqi} - ${AQI_COLORS[mainCategory].label}`);
  mainMarker.addTo(liveMap);
  liveMapLayers.push(mainMarker);

  state.heatmapPoints.forEach((point) => {
    const color = AQI_COLORS[point.cat]?.hex || "#f0a500";
    const circle = L.circleMarker([point.lat, point.lon], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.55,
      weight: 2
    }).bindPopup(`<strong>${point.name}</strong><br/>AQI ${point.aqi} - ${AQI_COLORS[point.cat]?.label || "Unknown"}`);

    circle.addTo(liveMap);
    liveMapLayers.push(circle);
  });

  setTimeout(() => {
    liveMap.invalidateSize();
  }, 120);

  setText("zone-name", state.summary.city);
  setText("zone-aqi", `AQI ${state.summary.aqi} - ${AQI_COLORS[mainCategory].label}`);

  const rankings = byId("zone-rankings");
  if (rankings) {
    clearChildren(rankings);
    [...state.heatmapPoints]
      .sort((a, b) => b.aqi - a.aqi)
      .forEach((point) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.justifyContent = "space-between";
        row.style.padding = "10px 12px";
        row.style.border = "1px solid rgba(255,255,255,.06)";
        row.style.borderRadius = "12px";
        row.style.background = "rgba(255,255,255,.02)";
        row.innerHTML = `<span>${point.name}</span><span style="color:${AQI_COLORS[point.cat].hex};font-family:var(--font-mono)">AQI ${point.aqi}</span>`;
        rankings.appendChild(row);
      });
  }
}

function initForecastChart() {
  if (typeof Chart === "undefined" || !byId("forecast-chart") || !state.forecast72.length) return;

  const labels = state.forecast72.map((_, index) => {
    const hour = index % 24;
    const day = Math.floor(index / 24);
    if (index === 0 || hour === 0) return ["Today", "Day 2", "Day 3"][day] || "";
    if (hour % 6 === 0) return `${hour}:00`;
    return "";
  });

  const colors = state.forecast72.map((value) => {
    const category = aqiCategory(value);
    return AQI_COLORS[category].hex;
  });

  if (forecastChart) {
    forecastChart.destroy();
  }

  forecastChart = new Chart(byId("forecast-chart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "AQI",
          data: state.forecast72,
          backgroundColor: colors.map((color) => `${color}80`),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (context) => `AQI: ${context.parsed.y}` } }
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#5a6478", font: { size: 9 }, maxTicksLimit: 12 } },
        y: { min: 0, max: 250, grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#5a6478", font: { size: 9 } } }
      }
    }
  });
}

function initForecastSummary() {
  if (!state.forecast72.length) return;

  const dayChunks = [state.forecast72.slice(0, 24), state.forecast72.slice(24, 48), state.forecast72.slice(48, 72)];
  const dayAverages = dayChunks.map((chunk) => Math.round(chunk.reduce((sum, value) => sum + value, 0) / Math.max(chunk.length, 1)));
  const bestDayIndex = dayAverages.indexOf(Math.min(...dayAverages));
  const worstValue = Math.max(...state.forecast72);
  const worstIndex = state.forecast72.indexOf(worstValue);
  const average = Math.round(state.forecast72.reduce((sum, value) => sum + value, 0) / state.forecast72.length);

  setText("fc-best-day", `Day ${bestDayIndex + 1}`);
  setText("fc-best-aqi", `Avg AQI ${dayAverages[bestDayIndex]}`);
  setText("fc-worst-time", `Day ${Math.floor(worstIndex / 24) + 1}, ${worstIndex % 24}:00`);
  setText("fc-worst-aqi", `Peak AQI ${worstValue}`);
  setText("fc-avg", String(average));
}

function initPollutantChart() {
  if (typeof Chart === "undefined" || !byId("pollutant-chart") || !state.summary) return;

  const data = state.summary;

  if (pollutantChart) {
    pollutantChart.destroy();
  }

  pollutantChart = new Chart(byId("pollutant-chart"), {
    type: "doughnut",
    data: {
      labels: ["PM2.5", "PM10", "NO2", "O3", "SO2", "CO"],
      datasets: [
        {
          data: [data.pm25, data.pm10, data.no2, data.o3, data.so2, data.co * 10],
          backgroundColor: ["#f97316cc", "#f0a500cc", "#4f8ef7cc", "#22c55ecc", "#a855f7cc", "#ef4444cc"],
          borderColor: "#0e1219",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "right",
          labels: { color: "#8892a4", font: { size: 10 }, boxWidth: 10, padding: 7 }
        }
      }
    }
  });
}

function initHourlyGrid() {
  const grid = byId("hourly-grid");
  if (!grid) return;

  clearChildren(grid);

  state.hourlyData.slice(0, 24).forEach((entry) => {
    const aqi = typeof entry === "number" ? entry : entry.aqi;
    const hour = typeof entry === "number" ? state.hourlyData.indexOf(entry) : entry.hour;
    const category = aqiCategory(aqi);
    const color = AQI_COLORS[category].hex;
    const pct = Math.min(100, (aqi / 250) * 100);
    const bar = document.createElement("div");
    bar.className = "hr-bar";
    bar.innerHTML = `
      <div class="hr-vis" style="height:${28 + pct * 0.6}px;background:${color}25;border:1px solid ${color}55;border-radius:5px 5px 2px 2px;width:32px;"></div>
      <div class="hr-num" style="color:${color}">${aqi}</div>
      <div class="hr-time">${hour}:00</div>
    `;
    grid.appendChild(bar);
  });
}

function renderAlerts(persona) {
  const container = byId("alert-cards");
  if (!container) return;

  clearChildren(container);

  const cards = state.recommendations[persona] || state.recommendations.general || [];
  const meta = PERSONA_META[persona] || PERSONA_META.general;

  cards.forEach((text, index) => {
    const div = document.createElement("div");
    div.className = `alert-card ${index === 0 ? meta.type : index === 1 ? "warning" : "info"}`;
    div.innerHTML = `
      <div class="ac-icon">${meta.icon}</div>
      <div class="ac-title">${meta.title}</div>
      <div class="ac-body">${text}</div>
      <span class="ac-action">${meta.action} -></span>
    `;
    container.appendChild(div);
  });
}

function initPersonaTabs() {
  const tabs = document.querySelectorAll(".ptab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      renderAlerts(tab.dataset.persona);
    });
  });
  renderAlerts("general");
}

function initNotifications() {
  const list = byId("notif-list");
  if (!list) return;

  clearChildren(list);

  buildNotificationItems().forEach((item) => {
    const div = document.createElement("div");
    div.className = `notif ${item.type}`;
    div.innerHTML = `<div class="notif-icon-wrap">${item.icon}</div><div class="notif-body"><div class="notif-title">${item.title}</div><div class="notif-desc">${item.desc}</div></div><div class="notif-time">${item.time}</div>`;
    list.appendChild(div);
  });
}

function refreshVisibleTabVisuals(tab) {
  if (tab === "heatmap") {
    initLiveMap();
    initPollutantChart();
  }
  if (tab === "forecast") {
    initForecastChart();
    initForecastSummary();
    renderSafeHours("safe-hours-grid-forecast", "tooltip");
  }
}

function initSearch() {
  const input = byId("city-input");
  if (!input) return;

  input.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    const query = event.target.value.trim();
    if (!query) return;

    try {
      setSearchStatus("Searching...", "info");
      const location = await searchLocation(query);

      if (!location) {
        setSearchStatus("Location not found. Try a city name like Delhi or Pune.", "error");
        return;
      }

      state.city = location.name;
      state.lat = location.lat;
      state.lon = location.lon;
      input.value = location.name;
      setSearchStatus(`Showing live data for ${location.name}`, "success");
      await hydrateDashboard();
    } catch (error) {
      console.error("Location search failed", error);
      setSearchStatus(error.message || "Search failed. Try again.", "error");
    }
  });
}

function initTabs() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((node) => node.classList.remove("active"));
      item.classList.add("active");

      const tab = item.dataset.tab;
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.style.display = "none";
      });

      const activePanel = byId(`tab-${tab}`);
      if (activePanel) {
        activePanel.style.display = "";
      }

      const topbarTitle = byId("topbar-tab-title");
      if (topbarTitle) {
        topbarTitle.textContent = item.textContent.trim();
      }

      setTimeout(() => {
        refreshVisibleTabVisuals(tab);
      }, 100);
    });
  });
}

async function hydrateDashboard() {
  await loadDashboardData();
  initMainAQI();
  renderSafeHours("safe-hours-grid", "tooltip");
  renderSafeHours("safe-hours-grid-forecast", "tooltip");
  initLiveMap();
  initForecastChart();
  initForecastSummary();
  initPollutantChart();
  initHourlyGrid();
  initPersonaTabs();
  initNotifications();
}

window.addEventListener("load", async () => {
  setInterval(updateClock, 1000);
  updateClock();
  initSearch();
  initTabs();

  try {
    await hydrateDashboard();
    setSearchStatus(`Showing live data for ${state.city}`, "success");
  } catch (error) {
    console.error("Failed to load dashboard", error);
    const badge = byId("aqi-status-badge");
    if (badge) {
      badge.textContent = "Data unavailable";
    }
    setSearchStatus(error.message || "Unable to load live data.", "error");
  }
});
