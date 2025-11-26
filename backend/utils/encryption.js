import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function buildKey() {
  const raw = process.env.PHI_ENCRYPTION_KEY || "";
  if (!raw) {
    console.warn(
      "[encryption] Missing PHI_ENCRYPTION_KEY. Falling back to ephemeral key - do NOT use in production."
    );
  }
  return crypto.createHash("sha256").update(raw || "development-key").digest();
}

export function encryptString(plainText) {
  const key = buildKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptString(payload) {
  if (!payload) return null;
  const buffer = Buffer.from(payload, "base64");
  const key = buildKey();
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH * 2);
  const encrypted = buffer.subarray(IV_LENGTH * 2);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function encryptBuffer(buffer) {
  const key = buildKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptBuffer(buffer) {
  const key = buildKey();
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH * 2);
  const encrypted = buffer.subarray(IV_LENGTH * 2);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}












