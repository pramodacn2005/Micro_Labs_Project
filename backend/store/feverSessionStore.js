import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { decryptString, encryptString } from "../utils/encryption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.resolve(__dirname, "..", "data", "feverSessions.json");

async function readRawStore() {
  try {
    if (!(await fs.pathExists(storePath))) {
      return {};
    }
    const content = await fs.readFile(storePath, "utf8");
    return content ? JSON.parse(content) : {};
  } catch (error) {
    console.error("[SessionStore] Failed to read store", error);
    return {};
  }
}

async function writeRawStore(payload) {
  await fs.ensureFile(storePath);
  await fs.writeFile(storePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function saveSession(sessionId, data) {
  const store = await readRawStore();
  store[sessionId] = encryptString(JSON.stringify(data));
  await writeRawStore(store);
}

export async function getSession(sessionId) {
  const store = await readRawStore();
  const encrypted = store[sessionId];
  if (!encrypted) return null;
  try {
    const decrypted = decryptString(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("[SessionStore] Failed to decrypt session", error);
    return null;
  }
}

export async function updateSession(sessionId, patch) {
  const existing = (await getSession(sessionId)) || {};
  const next = { ...existing, ...patch };
  await saveSession(sessionId, next);
  return next;
}

export async function getSessionByReportId(reportId) {
  const store = await readRawStore();
  for (const [sessionId, encrypted] of Object.entries(store)) {
    try {
      const data = JSON.parse(decryptString(encrypted));
      if (data.reportId === reportId) {
        return { sessionId, data };
      }
    } catch {
      continue;
    }
  }
  return null;
}












