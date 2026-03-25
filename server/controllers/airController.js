import {
  fetchDashboardBundle,
  fetchForecastData,
  fetchHeatmapData,
  searchLocations
} from "../services/airService.js";
import { generateAIAdvice } from "../services/aiService.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const { city = "Mumbai, Maharashtra", lat, lon, record } = req.query;
    const summary = await fetchDashboardBundle({
      city,
      lat,
      lon,
      recordSnapshot: record !== "false"
    });
    const recommendations = generateAIAdvice(summary);

    res.json({
      ...summary,
      recommendations
    });
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ error: error.message || "Failed to fetch dashboard data" });
  }
};

export const getForecast = async (req, res) => {
  try {
    const { city = "Mumbai, Maharashtra", lat, lon } = req.query;
    const forecast = await fetchForecastData({ city, lat, lon });
    res.json(forecast);
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ error: error.message || "Failed to fetch forecast data" });
  }
};

export const getHeatmap = async (req, res) => {
  try {
    const { city = "Mumbai, Maharashtra", lat, lon } = req.query;
    const heatmap = await fetchHeatmapData({ city, lat, lon });
    res.json(heatmap);
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ error: error.message || "Failed to fetch heatmap data" });
  }
};

export const getLocationResults = async (req, res) => {
  try {
    const query = req.query.q || req.query.city;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const items = await searchLocations(query);
    return res.json({ items });
  } catch (error) {
    console.error(error.message);
    return res.status(400).json({ error: error.message || "Failed to search locations" });
  }
};
