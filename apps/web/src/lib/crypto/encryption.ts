import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_VERSION = "v1";

function getEncryptionKey(): Buffer {
  const keyB64 = process.env.APP_ENCRYPTION_KEY;
  if (keyB64) {
    const key = Buffer.from(keyB64, "base64");
    if (key.length !== 32) {
      throw new Error("APP_ENCRYPTION_KEY 必须是 32 字节 base64");
    }
    return key;
  }

  const fallback = process.env.BETTER_AUTH_SECRET;
  if (!fallback) {
    throw new Error("缺少 APP_ENCRYPTION_KEY / BETTER_AUTH_SECRET，无法加密存储");
  }

  return createHash("sha256").update(fallback).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, ciphertextB64] = payload.split(":");
  if (version !== ENCRYPTION_VERSION || !ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error("不支持的密文格式");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

