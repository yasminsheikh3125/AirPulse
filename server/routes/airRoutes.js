import express from "express";
import {
  getDashboardSummary,
  getForecast,
  getHeatmap,
  getLocationResults
} from "../controllers/airController.js";

const router = express.Router();

router.get("/summary", getDashboardSummary);
router.get("/forecast", getForecast);
router.get("/heatmap", getHeatmap);
router.get("/locations", getLocationResults);

export default router;
