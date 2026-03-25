import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const API_KEY = process.env.API_KEY || process.env.OPENWEATHER_API_KEY;
const WEATHER_BASE = "https://api.openweathermap.org";

const AQI_COLORS = {
  good: { label: "Good" },
  moderate: { label: "Moderate" },
  usg: { label: "Unhealthy for SG" },
  unhealthy: { label: "Unhealthy" },
  vunhealthy: { label: "Very Unhealthy" }
};

function ensureApiKey() {
  if (!API_KEY) {
    throw new Error("Missing OpenWeather API key. Add API_KEY or OPENWEATHER_API_KEY in server/.env");
  }
}

function aqiCategory(value) {
  if (value <= 50) return "good";
  if (value <= 100) return "moderate";
  if (value <= 150) return "usg";
  if (value <= 200) return "unhealthy";
  return "vunhealthy";
}

function openWeatherIndexToAqi(index) {
  return { 1: 40, 2: 80, 3: 130, 4: 180, 5: 260 }[index] || 80;
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
      name: city || "Selected location"
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
    name: [match.name, match.state, match.country].filter(Boolean).join(", ")
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

function normalizeSummary(location, weather, air) {
  const airEntry = air.list?.[0] || {};
  const components = airEntry.components || {};
  const aqi = openWeatherIndexToAqi(airEntry.main?.aqi);
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
    aqi: openWeatherIndexToAqi(entry.main?.aqi)
  }));
}

function forecastTo72(entries = []) {
  const result = [];

  entries.forEach((entry) => {
    const value = openWeatherIndexToAqi(entry.main?.aqi);
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

export async function fetchDashboardBundle({ city, lat, lon }) {
  const location = await getCoordinates({ city, lat, lon });
  const [weather, air, airForecast] = await Promise.all([
    fetchWeather(location.lat, location.lon),
    fetchAir(location.lat, location.lon),
    fetchAirForecast(location.lat, location.lon)
  ]);
  const summary = normalizeSummary(location, weather, air);

  return {
    ...summary,
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
      const aqi = openWeatherIndexToAqi(air.list?.[0]?.main?.aqi);
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
