import dotenv from "dotenv";
import axios from "axios";
import { recordAndSummarizeHistory } from "./historyService.js";

dotenv.config();

const API_KEY = process.env.API_KEY || process.env.OPENWEATHER_API_KEY;
const IQAIR_API_KEY = process.env.IQAIR_API_KEY || process.env.LIVE_AQI_TOKEN;
const WEATHER_BASE = "https://api.openweathermap.org";
const IQAIR_BASE = "https://api.airvisual.com/v2";

const AQI_COLORS = {
  good: { label: "Good" },
  moderate: { label: "Satisfactory" },
  usg: { label: "Moderate" },
  unhealthy: { label: "Poor" },
  vunhealthy: { label: "Very Poor" },
  severe: { label: "Severe" }
};

function ensureApiKey() {
  if (!API_KEY) {
    throw new Error("Missing OpenWeather API key. Add API_KEY or OPENWEATHER_API_KEY in server/.env");
  }
}

function aqiCategory(value) {
  if (value <= 50) return "good";
  if (value <= 100) return "moderate";
  if (value <= 200) return "usg";
  if (value <= 300) return "unhealthy";
  if (value <= 400) return "vunhealthy";
  return "severe";
}

function calculateAqiFromBreakpoint(concentration, breakpoints) {
  const match = breakpoints.find((item) => concentration >= item.cLow && concentration <= item.cHigh);
  const range = match || breakpoints[breakpoints.length - 1];
  const bounded = Math.min(Math.max(concentration, range.cLow), range.cHigh);
  const value = ((range.iHigh - range.iLow) / (range.cHigh - range.cLow)) * (bounded - range.cLow) + range.iLow;
  return Math.round(value);
}

function pm25ToAqi(pm25) {
  const concentration = Math.floor(pm25 * 10) / 10;
  return calculateAqiFromBreakpoint(concentration, [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 }
  ]);
}

function pm10ToAqi(pm10) {
  const concentration = Math.round(pm10);
  return calculateAqiFromBreakpoint(concentration, [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 }
  ]);
}

function no2ToAqi(no2) {
  return calculateAqiFromBreakpoint(Number(no2 || 0), [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 401, cHigh: 800, iLow: 401, iHigh: 500 }
  ]);
}

function o3ToAqi(o3) {
  return calculateAqiFromBreakpoint(Number(o3 || 0), [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 }
  ]);
}

function coToAqi(coMg) {
  return calculateAqiFromBreakpoint(Number(coMg || 0), [
    { cLow: 0, cHigh: 1, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50, iLow: 401, iHigh: 500 }
  ]);
}

function so2ToAqi(so2) {
  return calculateAqiFromBreakpoint(Number(so2 || 0), [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1601, cHigh: 2000, iLow: 401, iHigh: 500 }
  ]);
}

function computeIndiaAqi(components = {}) {
  const pm25 = Number(components.pm2_5 || 0);
  const pm10 = Number(components.pm10 || 0);
  const no2 = Number(components.no2 || 0);
  const o3 = Number(components.o3 || 0);
  const so2 = Number(components.so2 || 0);
  const co = Number((components.co || 0) / 1000);
  const subIndices = {
    pm25: pm25ToAqi(pm25),
    pm10: pm10ToAqi(pm10),
    no2: no2ToAqi(no2),
    o3: o3ToAqi(o3),
    so2: so2ToAqi(so2),
    co: coToAqi(co)
  };
  const dominantPollutant = Object.entries(subIndices).sort((a, b) => b[1] - a[1])[0]?.[0] || "pm25";
  const aqi = Math.max(...Object.values(subIndices));

  return {
    aqi,
    dominantPollutant,
    subIndices
  };
}

function weatherIcon(description) {
  const text = String(description || "").toLowerCase();
  if (text.includes("rain") || text.includes("drizzle")) return "🌧";
  if (text.includes("storm") || text.includes("thunder")) return "⛈";
  if (text.includes("cloud")) return "☁";
  if (text.includes("mist") || text.includes("haze") || text.includes("smoke")) return "🌫";
  if (text.includes("clear")) return "☀";
  return "🌤";
}

async function getCoordinates({ city, lat, lon }) {
  ensureApiKey();

  if (lat && lon) {
    return {
      lat: Number(lat),
      lon: Number(lon),
      name: city || "Selected location",
      city: city || "Selected location",
      state: "",
      country: ""
    };
  }

  const response = await axios.get(`${WEATHER_BASE}/geo/1.0/direct`, {
    params: {
      q: city,
      limit: 1,
      appid: API_KEY
    }
  });

  if (!response.data || !response.data.length) {
    throw new Error("City not found");
  }

  const match = response.data[0];

  return {
    lat: match.lat,
    lon: match.lon,
    name: [match.name, match.state, match.country].filter(Boolean).join(", "),
    city: match.name,
    state: match.state || "",
    country: match.country || ""
  };
}

async function fetchWeather(lat, lon) {
  const response = await axios.get(`${WEATHER_BASE}/data/2.5/weather`, {
    params: {
      lat,
      lon,
      appid: API_KEY,
      units: "metric"
    }
  });

  return response.data;
}

async function fetchAir(lat, lon) {
  const response = await axios.get(`${WEATHER_BASE}/data/2.5/air_pollution`, {
    params: {
      lat,
      lon,
      appid: API_KEY
    }
  });

  return response.data;
}

async function fetchAirForecast(lat, lon) {
  const response = await axios.get(`${WEATHER_BASE}/data/2.5/air_pollution/forecast`, {
    params: {
      lat,
      lon,
      appid: API_KEY
    }
  });

  return response.data;
}

async function fetchLiveAqi(location) {
  if (!IQAIR_API_KEY) {
    return { error: "IQAIR key missing" };
  }

  try {
    const cityResponse = await axios.get(`${IQAIR_BASE}/city`, {
      params: {
        city: location.city,
        state: location.state,
        country: location.country,
        key: IQAIR_API_KEY
      }
    });

    if (cityResponse.data?.status === "success" && cityResponse.data?.data) {
      const payload = cityResponse.data.data;
      const pollution = payload.current?.pollution || {};

      return {
        aqi: Number(pollution.aqius || pollution.aqicn || 0),
        station: payload.city || location.city || "Nearest city",
        updatedAt: pollution.ts || null,
        dominantPollutant: pollution.mainus || pollution.maincn || null,
        source: "IQAir"
      };
    }
  } catch {
    // Fall through to geolocation lookup.
  }

  try {
    const geoResponse = await axios.get(`${IQAIR_BASE}/nearest_city`, {
      params: {
        lat: location.lat,
        lon: location.lon,
        key: IQAIR_API_KEY
      }
    });

    if (geoResponse.data?.status !== "success" || !geoResponse.data?.data) {
      return { error: "No IQAir station found" };
    }

    const payload = geoResponse.data.data;
    const pollution = payload.current?.pollution || {};

    return {
      aqi: Number(pollution.aqius || pollution.aqicn || 0),
      station: payload.city || location.city || "Nearest city",
      updatedAt: pollution.ts || null,
      dominantPollutant: pollution.mainus || pollution.maincn || null,
      source: "IQAir"
    };
  } catch (error) {
    const message = error.response?.data?.data?.message || error.response?.data?.message || "IQAir request failed";
    return { error: message };
  }
}

function normalizeSummary(location, weather, air, liveAqi = null) {
  const airEntry = air.list?.[0] || {};
  const components = airEntry.components || {};
  const computed = computeIndiaAqi(components);
  const aqi = computed.aqi;
  const category = aqiCategory(aqi);

  return {
    city: location.name,
    location: {
      name: location.name,
      lat: location.lat,
      lon: location.lon
    },
    aqi,
    aqiLabel: AQI_COLORS[category].label,
    category,
    dominantPollutant: computed.dominantPollutant.toUpperCase(),
    aqiStandard: "India AQI",
    liveAqi,
    pm25: Number((components.pm2_5 || 0).toFixed(1)),
    pm10: Number((components.pm10 || 0).toFixed(1)),
    no2: Number((components.no2 || 0).toFixed(1)),
    o3: Number((components.o3 || 0).toFixed(1)),
    co: Number(((components.co || 0) / 1000).toFixed(2)),
    so2: Number((components.so2 || 0).toFixed(1)),
    temp: Math.round(weather.main?.temp || 0),
    feels_like: Math.round(weather.main?.feels_like || 0),
    humidity: Math.round(weather.main?.humidity || 0),
    wind: Number((weather.wind?.speed || 0).toFixed(1)),
    visibility: Number((((weather.visibility || 0) / 1000)).toFixed(1)),
    weather: weather.weather?.[0]?.description || "Unknown",
    weatherIcon: weatherIcon(weather.weather?.[0]?.description || "")
  };
}

function forecastToHourly(entries = []) {
  return entries.slice(0, 24).map((entry) => ({
    time: entry.dt * 1000,
    hour: new Date(entry.dt * 1000).getHours(),
    aqi: computeIndiaAqi(entry.components || {}).aqi
  }));
}

function forecastTo72(entries = []) {
  const result = [];

  entries.forEach((entry) => {
    const value = computeIndiaAqi(entry.components || {}).aqi;
    for (let i = 0; i < 3; i += 1) {
      result.push(value);
      if (result.length === 72) {
        break;
      }
    }
  });

  while (result.length < 72) {
    result.push(result[result.length - 1] || 80);
  }

  return result.slice(0, 72);
}

function buildGridPoints(lat, lon) {
  const offsets = [-0.06, 0, 0.06];
  return offsets.flatMap((latOffset) =>
    offsets.map((lonOffset) => ({
      lat: Number((lat + latOffset).toFixed(4)),
      lon: Number((lon + lonOffset).toFixed(4))
    }))
  );
}

export async function fetchDashboardBundle({ city, lat, lon, recordSnapshot = true }) {
  const location = await getCoordinates({ city, lat, lon });
  const [weather, air, airForecast, liveAqi] = await Promise.all([
    fetchWeather(location.lat, location.lon),
    fetchAir(location.lat, location.lon),
    fetchAirForecast(location.lat, location.lon),
    fetchLiveAqi(location)
  ]);
  const summary = normalizeSummary(location, weather, air, liveAqi);
  const history = await recordAndSummarizeHistory(location, summary, recordSnapshot);

  return {
    ...summary,
    history,
    forecast72: forecastTo72(airForecast.list || []),
    hourlyData: forecastToHourly(airForecast.list || [])
  };
}

export async function fetchForecastData({ city, lat, lon }) {
  const location = await getCoordinates({ city, lat, lon });
  const airForecast = await fetchAirForecast(location.lat, location.lon);

  return {
    city: location.name,
    forecast72: forecastTo72(airForecast.list || []),
    hourlyData: forecastToHourly(airForecast.list || [])
  };
}

export async function fetchHeatmapData({ city, lat, lon }) {
  const location = await getCoordinates({ city, lat, lon });
  const grid = buildGridPoints(location.lat, location.lon);
  const labels = [
    "North West",
    "North",
    "North East",
    "West",
    "Center",
    "East",
    "South West",
    "South",
    "South East"
  ];

  const points = await Promise.all(
    grid.map(async (point, index) => {
      const air = await fetchAir(point.lat, point.lon);
      const components = air.list?.[0]?.components || {};
      const computed = computeIndiaAqi(components);
      const aqi = computed.aqi;
      const category = aqiCategory(aqi);

      return {
        name: labels[index] || `Zone ${index + 1}`,
        lat: point.lat,
        lon: point.lon,
        aqi,
        cat: category,
        label: AQI_COLORS[category].label
      };
    })
  );

  return {
    city: location.name,
    center: {
      lat: location.lat,
      lon: location.lon
    },
    points
  };
}

export async function searchLocations(query) {
  ensureApiKey();

  const response = await axios.get(`${WEATHER_BASE}/geo/1.0/direct`, {
    params: {
      q: query,
      limit: 5,
      appid: API_KEY
    }
  });

  return (response.data || []).map((item) => ({
    name: [item.name, item.state, item.country].filter(Boolean).join(", "),
    lat: item.lat,
    lon: item.lon
  }));
}
