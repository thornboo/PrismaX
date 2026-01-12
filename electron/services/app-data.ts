import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";

type AppDataConfig = {
  dataRoot?: string;
};

function getConfigDir(): string {
  return path.join(os.homedir(), ".prismax-desktop");
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readConfig(): AppDataConfig {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return {};
    }
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as AppDataConfig;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function getConfiguredDataRoot(): string | null {
  const config = readConfig();
  if (!config.dataRoot || typeof config.dataRoot !== "string") {
    return null;
  }
  return config.dataRoot;
}

export function setConfiguredDataRoot(dataRoot: string): void {
  ensureConfigDir();
  fs.writeFileSync(getConfigPath(), JSON.stringify({ dataRoot }, null, 2));
}

export function resolveUserDataPath(): string {
  const configured = getConfiguredDataRoot();
  if (configured) {
    return configured;
  }
  return app.getPath("userData");
}

/**
 * 必须在 app.whenReady() 前调用，确保后续所有 app.getPath('userData') 与数据库路径一致。
 */
export function applyUserDataPathEarly(): void {
  const configured = getConfiguredDataRoot();
  if (!configured) return;
  try {
    if (!fs.existsSync(configured)) {
      fs.mkdirSync(configured, { recursive: true });
    }
    app.setPath("userData", configured);
  } catch {
    // ignore: 如果设置失败，回退到默认 userData
  }
}
