const API_BASE = "http://localhost:5000/api/air";
const SAVED_PLACES_KEY = "airpulse:saved-places";

const AQI_COLORS = {
  good: { hex: "#22c55e", label: "Good", textColor: "#86efac" },
  moderate: { hex: "#84cc16", label: "Satisfactory", textColor: "#d9f99d" },
  usg: { hex: "#f0a500", label: "Moderate", textColor: "#fde047" },
  unhealthy: { hex: "#f97316", label: "Poor", textColor: "#fdba74" },
  vunhealthy: { hex: "#ef4444", label: "Very Poor", textColor: "#fca5a5" },
  severe: { hex: "#a855f7", label: "Severe", textColor: "#d8b4fe" }
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
  },
  savedPlaces: [],
  compareSummaries: [],
  compareLastUpdated: null
};

let forecastChart = null;
let pollutantChart = null;
let liveMap = null;
let liveMapLayers = [];
let activeSpeechButton = null;

function byId(id) {
  return document.getElementById(id);
}

function loadSavedPlaces() {
  try {
    const raw = localStorage.getItem(SAVED_PLACES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedPlaces() {
  localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(state.savedPlaces));
}

function aqiCategory(value) {
  if (value <= 50) return "good";
  if (value <= 100) return "moderate";
  if (value <= 200) return "usg";
  if (value <= 300) return "unhealthy";
  if (value <= 400) return "vunhealthy";
  return "severe";
}

function aqiVisual(value) {
  return AQI_COLORS[aqiCategory(value)];
}

function interpolateAqi(concentration, breakpoints) {
  const match = breakpoints.find((item) => concentration >= item.cLow && concentration <= item.cHigh) || breakpoints[breakpoints.length - 1];
  const bounded = Math.min(Math.max(concentration, match.cLow), match.cHigh);
  const value = ((match.iHigh - match.iLow) / (match.cHigh - match.cLow)) * (bounded - match.cLow) + match.iLow;
  return Math.round(value);
}

function pm25ToAqi(pm25) {
  const concentration = Math.floor(Number(pm25 || 0) * 10) / 10;
  return interpolateAqi(concentration, [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 }
  ]);
}

function pm10ToAqi(pm10) {
  const concentration = Math.round(Number(pm10 || 0));
  return interpolateAqi(concentration, [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 }
  ]);
}

function no2ToAqi(no2) {
  return interpolateAqi(Number(no2 || 0), [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 401, cHigh: 800, iLow: 401, iHigh: 500 }
  ]);
}

function o3ToAqi(o3) {
  return interpolateAqi(Number(o3 || 0), [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 }
  ]);
}

function so2ToAqi(so2) {
  return interpolateAqi(Number(so2 || 0), [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1601, cHigh: 2000, iLow: 401, iHigh: 500 }
  ]);
}

function coToAqi(coMg) {
  return interpolateAqi(Number(coMg || 0), [
    { cLow: 0, cHigh: 1, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50, iLow: 401, iHigh: 500 }
  ]);
}

function computeFrontendAqi(summary) {
  const pm25Aqi = pm25ToAqi(summary.pm25);
  const pm10Aqi = pm10ToAqi(summary.pm10);
  const no2Aqi = no2ToAqi(summary.no2);
  const o3Aqi = o3ToAqi(summary.o3);
  const so2Aqi = so2ToAqi(summary.so2);
  const coAqi = coToAqi(summary.co);
  const subIndices = {
    "PM2.5": pm25Aqi,
    PM10: pm10Aqi,
    NO2: no2Aqi,
    O3: o3Aqi,
    SO2: so2Aqi,
    CO: coAqi
  };
  const dominantPollutant = Object.entries(subIndices).sort((a, b) => b[1] - a[1])[0]?.[0] || "PM2.5";
  const aqi = Math.max(...Object.values(subIndices));
  const category = aqiCategory(aqi);

  return {
    ...summary,
    aqi,
    aqiLabel: AQI_COLORS[category].label,
    category,
    aqiStandard: "India AQI",
    dominantPollutant: summary.dominantPollutant || dominantPollutant
  };
}

function bestHourFromForecast(forecast72 = []) {
  const bestWindow = forecast72.findIndex((value) => value <= 80);
  return bestWindow >= 0 ? `${bestWindow % 24}:00` : "later when AQI improves";
}

function buildFallbackRecommendations(summary) {
  if (!summary) {
    return {
      general: [],
      asthma: [],
      runner: [],
      child: [],
      pregnant: []
    };
  }

  const bestHourText = bestHourFromForecast(summary.forecast72 || []);
  const polluted = summary.aqi > 100;
  const veryPolluted = summary.aqi > 150;
  const dusty = summary.pm25 >= 35;
  const hot = summary.temp >= 34;
  const humid = summary.humidity >= 70;
  const calmAir = summary.wind < 2;

  return {
    general: [
      veryPolluted
        ? "Air quality is unhealthy right now, so outdoor exposure should be brief and essential only."
        : polluted
          ? "Air quality is elevated, so keep outdoor activity moderate."
          : "Air quality is manageable for most people right now.",
      dusty
        ? "Fine particles are elevated, so a mask helps near roads and traffic corridors."
        : "Particle levels are not extreme, but using cleaner hours is still the smarter option.",
      hot && humid
        ? "Heat and humidity are both high, so outdoor effort may feel heavier than usual."
        : hot
          ? "It is hot outside, so hydration matters even during short trips."
          : "Weather stress looks fairly manageable at the moment.",
      `Current weather is ${summary.weather}. A cleaner window starts around ${bestHourText}.`,
      "Use side streets or park routes instead of traffic-heavy roads when possible."
    ],
    asthma: [
      polluted || dusty
        ? "Asthma triggers are elevated today, so keep rescue medication nearby and favor cleaner indoor air."
        : "Conditions are not at peak trigger level, but carrying your inhaler is still a good precaution.",
      calmAir
        ? "Low wind may trap pollution close to the ground, so avoid waiting near roads for long."
        : `If you need outdoor time, aim for around ${bestHourText} when conditions are calmer.`,
      dusty
        ? "Keep windows closed during busier hours if indoor air starts to feel irritating."
        : "Short outdoor walks are safer away from congested intersections.",
      hot
        ? "Heat can add breathing stress, so slow your pace and avoid midday exposure."
        : "Even with stable air, shorter outdoor sessions are safer than prolonged exposure.",
      "If coughing, chest tightness, or irritation increases, move indoors quickly and avoid exertion."
    ],
    runner: [
      polluted
        ? "Outdoor running is not ideal right now, so an indoor workout or lighter session is safer."
        : "Conditions are acceptable for a lighter outdoor run if you keep intensity controlled.",
      `The best training window starts around ${bestHourText}, when AQI is expected to be lower.`,
      hot
        ? "Heat is high, so shorten the session, slow your pace, and carry water."
        : "A short indoor warm-up can reduce time spent breathing outdoor air.",
      dusty
        ? "Choose routes away from traffic-heavy corridors because particles are elevated today."
        : "Quieter streets or parks are still better than main roads for training.",
      "If air quality rises during your workout, switch to recovery pace or end the session early."
    ],
    child: [
      polluted
        ? "Children and older adults should keep outdoor exposure short during poor air periods."
        : "Short outdoor time is okay, but the cleaner-hour window is still the better choice.",
      hot
        ? "Avoid outdoor play during peak heat because children and seniors dehydrate faster."
        : "Morning and evening remain the more comfortable times for fresh air.",
      dusty
        ? "Busy roads, school pickup zones, and traffic signals are best avoided when particles are elevated."
        : "Parks and low-traffic streets are the better option for walks and play.",
      calmAir
        ? "Still air can let pollution linger, so take indoor breaks if irritation starts."
        : `If you need to go outside, around ${bestHourText} is a better time to do it.`,
      "Carry water and keep outdoor sessions shorter if anyone feels tired, irritated, or overheated."
    ],
    pregnant: [
      "Use cleaner indoor spaces and avoid high-traffic roads whenever possible.",
      polluted
        ? "Because air quality is elevated, reduce unnecessary outdoor exposure and keep errands efficient."
        : `If you need to step out, around ${bestHourText} is a better outdoor window.`,
      hot && humid
        ? "Heat and humidity can add fatigue, so keep outdoor travel short and stay hydrated."
        : "Choose shaded and less crowded routes to reduce both air and heat stress.",
      dusty
        ? "A mask is worth considering if you must spend time near traffic or dusty roads."
        : "Short walks are better on quieter streets than near major intersections.",
      "If you feel tired or uncomfortable outside, move indoors and postpone non-essential travel."
    ]
  };
}

function mergeRecommendations(summary, serverRecommendations = {}) {
  const fallback = buildFallbackRecommendations(summary);
  const merged = {};

  Object.keys(fallback).forEach((persona) => {
    const primary = Array.isArray(serverRecommendations[persona]) ? serverRecommendations[persona].filter(Boolean) : [];
    const combined = [...primary];

    fallback[persona].forEach((item) => {
      if (!combined.includes(item)) {
        combined.push(item);
      }
    });

    merged[persona] = combined.slice(0, 5);
  });

  return merged;
}

function buildPlainLanguageSummary(data) {
  if (!data) return "";

  const dominantPollutant = data.dominantPollutant || inferDominantPollutant(data);
  const liveAqiText = data.liveAqi?.aqi ? `The nearest live station reports AQI ${data.liveAqi.aqi} from ${data.liveAqi.station}. ` : "";

  const weatherText = data.weather ? `${data.weather}` : "current conditions";
  const outdoorNote = data.aqi <= 80
    ? "Outdoor activity looks manageable right now."
    : data.aqi <= 130
      ? "It is better to keep outdoor time moderate."
      : "It is better to limit outdoor time for now.";

  return `${data.city} currently has an ${data.aqiStandard || "AQI"} reading of ${data.aqi}, which is ${data.aqiLabel}. ${liveAqiText}Temperature is ${data.temp} degrees Celsius with ${data.humidity} percent humidity, ${data.wind} meters per second wind, and ${weatherText}. PM2.5 is ${data.pm25.toFixed(1)} micrograms per cubic meter, and the dominant pollutant signal is ${dominantPollutant}. ${outdoorNote}`;
}

function inferDominantPollutant(data) {
  const entries = [
    ["PM2.5", Number(data.pm25 || 0)],
    ["PM10", Number(data.pm10 || 0)],
    ["NO2", Number(data.no2 || 0)],
    ["O3", Number(data.o3 || 0)],
    ["SO2", Number(data.so2 || 0)],
    ["CO", Number(data.co || 0)]
  ];

  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] || "Unavailable";
}

function stopSpeaking() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  if (activeSpeechButton) {
    activeSpeechButton.classList.remove("is-speaking");
    activeSpeechButton.textContent = activeSpeechButton.id === "speak-summary-btn" ? "Speak Summary" : "Speak";
    activeSpeechButton = null;
  }
}

function speakText(text, button) {
  if (!text) return;

  if (!("speechSynthesis" in window)) {
    setSearchStatus("Speech is not supported in this browser.", "error");
    return;
  }

  const shouldStopCurrent = activeSpeechButton === button;
  stopSpeaking();

  if (shouldStopCurrent) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;

  if (button) {
    activeSpeechButton = button;
    button.classList.add("is-speaking");
    button.textContent = button.id === "speak-summary-btn" ? "Stop Summary" : "Stop";
  }

  utterance.onend = () => {
    if (button) {
      button.classList.remove("is-speaking");
      button.textContent = button.id === "speak-summary-btn" ? "Speak Summary" : "Speak";
    }
    if (activeSpeechButton === button) {
      activeSpeechButton = null;
    }
  };

  utterance.onerror = () => {
    if (button) {
      button.classList.remove("is-speaking");
      button.textContent = button.id === "speak-summary-btn" ? "Speak Summary" : "Speak";
    }
    if (activeSpeechButton === button) {
      activeSpeechButton = null;
    }
  };

  window.speechSynthesis.speak(utterance);
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

function setCompareStatus(message = "", type = "") {
  const node = byId("compare-status");
  if (!node) return;
  node.textContent = message;
  node.className = `compare-status ${type}`.trim();
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

function updateNotificationBadges(count) {
  const safeCount = String(Math.max(0, count || 0));
  const sidebar = byId("sidebar-notif-count");
  const topButton = byId("topbar-notif-btn");

  if (sidebar) {
    sidebar.textContent = safeCount;
  }

  if (topButton) {
    topButton.dataset.count = safeCount;
  }
}

function formatShortDateTime(value) {
  return new Date(value).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

async function searchLocation(query) {
  const payload = await fetchJson(`${API_BASE}/locations?q=${encodeURIComponent(query)}`);
  return payload.items?.[0] || null;
}

async function loadDashboardData() {
  const query = `city=${encodeURIComponent(state.city)}${state.lat !== null ? `&lat=${state.lat}&lon=${state.lon}` : ""}`;
  const [summaryPayload, forecast, heatmap] = await Promise.all([
    fetchJson(`${API_BASE}/summary?${query}&record=true`),
    fetchJson(`${API_BASE}/forecast?${query}`),
    fetchJson(`${API_BASE}/heatmap?${query}`)
  ]);
  const summary = computeFrontendAqi(summaryPayload);

  state.summary = summary;
  state.city = summary.city;
  state.lat = summary.location?.lat ?? state.lat;
  state.lon = summary.location?.lon ?? state.lon;
  state.forecast72 = forecast.forecast72 || summary.forecast72 || [];
  state.hourlyData = forecast.hourlyData || summary.hourlyData || [];
  state.heatmapPoints = heatmap.points || [];
  summary.forecast72 = state.forecast72;
  state.recommendations = mergeRecommendations(summary, summary.recommendations || state.recommendations);
}

async function fetchSummaryForPlace(place, options = {}) {
  const params = new URLSearchParams({
    city: place.name
  });

  if (place.lat !== undefined && place.lon !== undefined) {
    params.set("lat", String(place.lat));
    params.set("lon", String(place.lon));
  }

  params.set("record", options.record === false ? "false" : "true");

  const payload = await fetchJson(`${API_BASE}/summary?${params.toString()}`);
  return computeFrontendAqi(payload);
}

function initMainAQI() {
  const data = state.summary;
  if (!data) return;
  const dominantPollutant = data.dominantPollutant || inferDominantPollutant(data);

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
  setText("aqi-summary-text", buildPlainLanguageSummary(data));
  setText("summary-aqi-label", `${data.aqiLabel} (${data.aqi})`);
  setText("summary-live-aqi", data.liveAqi?.aqi ? `${data.liveAqi.aqi} (${data.liveAqi.station})` : (data.liveAqi?.error || "Unavailable"));
  setText("summary-weather", data.weather);
  setText("summary-feels", `${data.feels_like} C`);
  setText("summary-pm25", `${data.pm25.toFixed(1)} ug/m3`);
  setText("summary-dominant", dominantPollutant);
  setText("live-aqi-note", data.liveAqi?.aqi ? `Live station AQI ${data.liveAqi.aqi} via ${data.liveAqi.source}` : (data.liveAqi?.error || "Live station AQI unavailable"));
}

function renderTrendMemory() {
  const history = state.summary?.history;
  const fallbackTimeline = [{
    aqi: state.summary?.aqi || 0,
    label: "Now",
    timestamp: new Date().toISOString()
  }];
  const captures = history?.captures || 0;
  const timeline = history?.timeline?.length ? history.timeline : fallbackTimeline;
  const currentColor = aqiVisual(state.summary?.aqi || 0);
  const sparkline = byId("history-sparkline");
  const timelineNode = byId("trend-timeline");

  const directionLabels = {
    up: "Air quality is worsening",
    down: "Air quality is improving",
    stable: "Air quality is mostly stable"
  };
  const directionText = captures > 1 ? (directionLabels[history?.direction] || "Building history") : "First snapshot recorded";

  const delta = history?.deltaFromPrevious || 0;
  const deltaText = captures > 1
    ? `${delta > 0 ? "+" : ""}${delta} AQI vs previous snapshot`
    : "First snapshot captured. Trend insights will strengthen as more visits are recorded.";

  setText("trend-direction", directionText);
  setText("trend-delta", deltaText);
  setText("trend-average", `${history?.average24h ?? state.summary?.aqi ?? "-"} AQI`);
  setText("trend-captures", `${Math.max(captures, 1)} capture${Math.max(captures, 1) === 1 ? "" : "s"} stored`);
  setText("trend-best", history?.bestRecent ? `AQI ${history.bestRecent.aqi} on ${history.bestRecent.label}` : `AQI ${state.summary?.aqi ?? "-"} now`);
  setText("trend-worst", history?.worstRecent ? `AQI ${history.worstRecent.aqi} on ${history.worstRecent.label}` : `AQI ${state.summary?.aqi ?? "-"} now`);
  setText("trend-updated", history?.latestRecordedAt ? formatShortDateTime(history.latestRecordedAt) : "just now");
  setText("trend-hero-title", captures > 1 ? `${state.summary.city} has a ${history.direction} AQI pattern right now.` : `Trend memory has started for ${state.summary.city}.`);
  setText("trend-hero-text", captures > 1
    ? `AirPulse has stored ${captures} recent snapshots for this location. Use them to see whether conditions are stabilizing, improving, or starting to deteriorate.`
    : "This is the first recorded snapshot for this place. Each return visit adds another memory point so the system can surface change over time.");
  setText("trend-hero-ring", String(state.summary?.aqi ?? "-"));
  setText("trend-hero-caption", `${currentColor.label} air quality right now`);
  setText("trend-story-pattern", directionText);
  setText("trend-story-detail", captures > 1
    ? `Compared with the previous stored reading, the AQI moved by ${delta > 0 ? "+" : ""}${delta}.`
    : "Come back later or search this city again after some time to build a stronger trend line.");
  setText("trend-story-updated", history?.latestRecordedAt ? formatShortDateTime(history.latestRecordedAt) : "just now");
  setText("trend-window-quality", history?.average24h <= 80 ? "Mostly manageable" : history?.average24h <= 130 ? "Mixed air quality" : "Persistently elevated");
  setText("trend-window-detail", captures > 1
    ? `The recent average is ${history?.average24h ?? state.summary?.aqi} AQI across the latest stored window.`
    : "Need more than one capture before AirPulse can judge consistency.");

  if (!sparkline) return;

  clearChildren(sparkline);
  if (timelineNode) {
    clearChildren(timelineNode);
  }

  timeline.forEach((point) => {
    const bar = document.createElement("div");
    const color = aqiVisual(point.aqi);
    const height = Math.max(26, Math.min(120, (point.aqi / 250) * 120));
    bar.className = "spark-bar";
    bar.style.height = `${height}px`;
    bar.style.background = `linear-gradient(180deg, ${color.hex}, ${color.hex}66)`;
    bar.dataset.aqi = point.aqi;
    bar.title = `${point.label} - AQI ${point.aqi}`;
    const label = document.createElement("span");
    label.textContent = point.label?.split(",")[0] || "Now";
    bar.appendChild(label);
    sparkline.appendChild(bar);
  });

  if (timelineNode) {
    timeline.slice().reverse().forEach((point, index) => {
      const color = aqiVisual(point.aqi);
      const item = document.createElement("div");
      item.className = "trend-timeline-item";
      item.innerHTML = `
        <div class="trend-timeline-dot" style="background:${color.hex}"></div>
        <div class="trend-timeline-body">
          <strong>${index === 0 ? "Latest capture" : `Capture ${timeline.length - index}`}</strong>
          <span>${point.timestamp ? formatShortDateTime(point.timestamp) : point.label}</span>
        </div>
        <div class="trend-timeline-aqi" style="color:${color.hex}">${point.aqi}</div>
      `;
      timelineNode.appendChild(item);
    });
  }
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
      <div class="ac-foot">
        <span class="ac-action">${meta.action} -></span>
        <button class="speak-btn" type="button" data-speak-text="${encodeURIComponent(`${meta.title}. ${text}`)}">Speak</button>
      </div>
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

  const items = buildNotificationItems();
  updateNotificationBadges(items.length);

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = `notif ${item.type}`;
    div.innerHTML = `<div class="notif-icon-wrap">${item.icon}</div><div class="notif-body"><div class="notif-title">${item.title}</div><div class="notif-desc">${item.desc}</div></div><div class="notif-time">${item.time}</div>`;
    list.appendChild(div);
  });
}

function activateTab(tab) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.tab === tab);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.style.display = "none";
  });

  const activePanel = byId(`tab-${tab}`);
  if (activePanel) {
    activePanel.style.display = "";
  }

  const activeNav = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  const topbarTitle = byId("topbar-tab-title");
  if (activeNav && topbarTitle) {
    topbarTitle.textContent = activeNav.textContent.trim();
  }

  setTimeout(() => {
    refreshVisibleTabVisuals(tab);
  }, 100);
}

function compareLeadText(summary, bestAqi) {
  if (!summary) return "";
  if (summary.aqi === bestAqi) return "Cleanest among saved places";
  return `${summary.aqi - bestAqi} AQI higher than the cleanest option`;
}

function renderComparePlaces() {
  const list = byId("compare-list");
  if (!list) return;

  clearChildren(list);

  if (!state.compareSummaries.length) {
    const empty = document.createElement("div");
    empty.className = "compare-empty";
    empty.textContent = "Save the current city to start comparing home, work, or travel spots.";
    list.appendChild(empty);
    return;
  }

  const bestAqi = Math.min(...state.compareSummaries.map((item) => item.aqi));

  state.compareSummaries
    .slice()
    .sort((a, b) => a.aqi - b.aqi)
    .forEach((summary) => {
      const color = aqiVisual(summary.aqi);
      const item = document.createElement("div");
      item.className = "compare-item";
      item.innerHTML = `
        <div class="compare-place">
          <strong>${summary.city}</strong>
          <span>${compareLeadText(summary, bestAqi)}</span>
        </div>
        <div class="compare-score" style="color:${color.hex}">${summary.aqi}</div>
        <div class="compare-meta">
          <span>24h avg: ${summary.history?.average24h ?? summary.aqi}</span>
          <span>${summary.weather}</span>
        </div>
        <div>
          <div class="compare-pill" style="background:${color.hex}20;color:${color.textColor};border-color:${color.hex}44;">${color.label}</div>
          <button class="compare-remove" type="button" data-remove-place="${summary.city}">Remove</button>
        </div>
      `;
      list.appendChild(item);
    });
}

async function refreshComparePlaces() {
  const refreshButton = byId("refresh-compare-btn");

  if (!state.savedPlaces.length) {
    state.compareSummaries = [];
    renderComparePlaces();
    setCompareStatus("Save a place first to start comparing.", "info");
    return;
  }

  try {
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Refreshing...";
    }
    setCompareStatus("Refreshing saved places with the latest live AQI...", "info");
    const summaries = await Promise.all(
      state.savedPlaces.map((place) => fetchSummaryForPlace(place, { record: false }))
    );
    state.compareSummaries = summaries;
    state.compareLastUpdated = new Date().toISOString();
    renderComparePlaces();
    setCompareStatus(`Last refreshed ${formatShortDateTime(state.compareLastUpdated)}`, "success");
  } catch (error) {
    console.error("Compare refresh failed", error);
    setSearchStatus(error.message || "Unable to refresh saved places.", "error");
    setCompareStatus(error.message || "Unable to refresh saved places.", "error");
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh Compare";
    }
  }
}

function saveCurrentPlace() {
  if (state.lat === null || state.lon === null) return;

  const alreadySaved = state.savedPlaces.some(
    (place) => place.name === state.city || (place.lat === state.lat && place.lon === state.lon)
  );

  if (alreadySaved) {
    setSearchStatus(`${state.city} is already in saved places.`, "info");
    return;
  }

  state.savedPlaces = [
    ...state.savedPlaces,
    {
      name: state.city,
      lat: state.lat,
      lon: state.lon
    }
  ];

  persistSavedPlaces();
  refreshComparePlaces();
  setSearchStatus(`${state.city} saved for comparison.`, "success");
}

function removeSavedPlace(name) {
  state.savedPlaces = state.savedPlaces.filter((place) => place.name !== name);
  persistSavedPlaces();
  refreshComparePlaces();
}

function initSavedPlacesActions() {
  const saveButton = byId("save-place-btn");
  const refreshButton = byId("refresh-compare-btn");
  const notifButton = byId("topbar-notif-btn");
  const summaryButton = byId("topbar-summary-btn");
  const list = byId("compare-list");

  if (saveButton) {
    saveButton.addEventListener("click", saveCurrentPlace);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await refreshComparePlaces();
    });
  }

  if (notifButton) {
    notifButton.addEventListener("click", () => {
      activateTab("notifications");
    });
  }

  if (summaryButton) {
    summaryButton.addEventListener("click", () => {
      activateTab("dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (list) {
    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-place]");
      if (!button) return;
      removeSavedPlace(button.dataset.removePlace);
    });
  }
}

function initSpeechControls() {
  const summaryButton = byId("speak-summary-btn");
  const summaryText = byId("aqi-summary-text");
  const alertCards = byId("alert-cards");

  if (summaryButton && summaryText) {
    summaryButton.addEventListener("click", () => {
      speakText(summaryText.textContent.trim(), summaryButton);
    });
  }

  if (alertCards) {
    alertCards.addEventListener("click", (event) => {
      const button = event.target.closest("[data-speak-text]");
      if (!button) return;
      speakText(decodeURIComponent(button.dataset.speakText || ""), button);
    });
  }
}

function refreshVisibleTabVisuals(tab) {
  if (tab === "trends") {
    renderTrendMemory();
  }
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
      activateTab(item.dataset.tab);
    });
  });
}

async function hydrateDashboard() {
  await loadDashboardData();
  initMainAQI();
  renderTrendMemory();
  renderSafeHours("safe-hours-grid", "tooltip");
  renderSafeHours("safe-hours-grid-forecast", "tooltip");
  initLiveMap();
  initForecastChart();
  initForecastSummary();
  initPollutantChart();
  initHourlyGrid();
  initPersonaTabs();
  initNotifications();
  await refreshComparePlaces();
}

window.addEventListener("load", async () => {
  setInterval(updateClock, 1000);
  updateClock();
  state.savedPlaces = loadSavedPlaces();
  initSearch();
  initTabs();
  initSavedPlacesActions();
  initSpeechControls();
  renderComparePlaces();

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
