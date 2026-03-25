import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const DB_FILE = path.join(DATA_DIR, "air-db.json");

const DEFAULT_DB = {
  historyByLocation: {},
  latestSnapshots: {}
};

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
}

export async function readDb() {
  await ensureDb();

  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...DEFAULT_DB,
      ...parsed,
      historyByLocation: parsed.historyByLocation || {},
      latestSnapshots: parsed.latestSnapshots || {}
    };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

export async function writeDb(db) {
  await ensureDb();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}
