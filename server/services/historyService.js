import { readDb, writeDb } from "./databaseService.js";
const MAX_ENTRIES_PER_LOCATION = 72;
const STABLE_DELTA = 5;

function roundCoord(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildLocationKey(location) {
  return `${String(location.name || "unknown").toLowerCase()}::${roundCoord(location.lat)}::${roundCoord(location.lon)}`;
}

function bucketTimestamp(date = new Date()) {
  const bucket = new Date(date);
  bucket.setMinutes(0, 0, 0);
  return bucket.toISOString();
}

function formatLabel(timestamp) {
  return new Date(timestamp).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric"
  });
}

function buildTrend(history = [], currentAqi) {
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const latest = history[history.length - 1] || null;
  const recentWindow = history.slice(-24);
  const average24h = recentWindow.length
    ? Math.round(recentWindow.reduce((sum, entry) => sum + entry.aqi, 0) / recentWindow.length)
    : currentAqi;
  const delta = previous ? currentAqi - previous.aqi : 0;
  const direction = delta > STABLE_DELTA ? "up" : delta < -STABLE_DELTA ? "down" : "stable";
  const best = history.length ? history.reduce((min, entry) => (entry.aqi < min.aqi ? entry : min), history[0]) : null;
  const worst = history.length ? history.reduce((max, entry) => (entry.aqi > max.aqi ? entry : max), history[0]) : null;

  return {
    captures: history.length,
    deltaFromPrevious: delta,
    direction,
    average24h,
    latestRecordedAt: latest?.timestamp || null,
    bestRecent: best
      ? { aqi: best.aqi, label: formatLabel(best.timestamp) }
      : null,
    worstRecent: worst
      ? { aqi: worst.aqi, label: formatLabel(worst.timestamp) }
      : null,
    timeline: history.slice(-12).map((entry) => ({
      aqi: entry.aqi,
      label: formatLabel(entry.timestamp),
      timestamp: entry.timestamp
    }))
  };
}

export async function recordAndSummarizeHistory(location, snapshot, shouldRecord = true) {
  const db = await readDb();
  const store = db.historyByLocation || {};
  const key = buildLocationKey(location);
  const existing = Array.isArray(store[key]) ? store[key] : [];
  const timestamp = bucketTimestamp();
  let history = existing;

  if (shouldRecord) {
    const nextEntry = {
      timestamp,
      aqi: snapshot.aqi,
      pm25: snapshot.pm25,
      temp: snapshot.temp
    };

    const withoutCurrentBucket = existing.filter((entry) => entry.timestamp !== timestamp);
    history = [...withoutCurrentBucket, nextEntry]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-MAX_ENTRIES_PER_LOCATION);

    store[key] = history;
    db.historyByLocation = store;
    db.latestSnapshots[key] = {
      timestamp,
      city: snapshot.city || location.name,
      aqi: snapshot.aqi,
      dominantPollutant: snapshot.dominantPollutant,
      pm25: snapshot.pm25,
      pm10: snapshot.pm10,
      temp: snapshot.temp
    };
    await writeDb(db);
  }

  return buildTrend(history, snapshot.aqi);
}
