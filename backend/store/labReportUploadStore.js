import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { encryptString, decryptString } from "../utils/encryption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.resolve(__dirname, "..", "data", "labReportUploads.json");

async function readRawStore() {
  try {
    if (!(await fs.pathExists(uploadsPath))) {
      return {};
    }
    const content = await fs.readFile(uploadsPath, "utf8");
    return content ? JSON.parse(content) : {};
  } catch (error) {
    console.error("[LabUploadStore] Failed to read store", error);
    return {};
  }
}

async function writeRawStore(payload) {
  await fs.ensureFile(uploadsPath);
  await fs.writeFile(uploadsPath, JSON.stringify(payload, null, 2), "utf8");
}

export async function saveLabUpload(uploadId, data) {
  const store = await readRawStore();
  store[uploadId] = encryptString(JSON.stringify(data));
  await writeRawStore(store);
}

export async function getLabUpload(uploadId) {
  const store = await readRawStore();
  if (!store[uploadId]) return null;
  try {
    const decrypted = decryptString(store[uploadId]);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("[LabUploadStore] Failed to decrypt upload entry", error);
    return null;
  }
}

export async function deleteLabUpload(uploadId) {
  const store = await readRawStore();
  if (store[uploadId]) {
    delete store[uploadId];
    await writeRawStore(store);
  }
}





