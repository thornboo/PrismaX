import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { openKnowledgeMetaDb, closeKnowledgeMetaDb } from "./meta-db";
import {
  getKnowledgeBaseBlobsDir,
  getKnowledgeBaseDir,
  getKnowledgeBaseIndexDir,
  getKnowledgeBaseManifestPath,
  getKnowledgeBaseStagingDir,
  getKnowledgeBasesRoot,
  getKnowledgeMetaDbPath,
} from "./paths";

export type KnowledgeBaseManifest = {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
};

export type KnowledgeBaseSummary = KnowledgeBaseManifest & {
  dir: string;
  metaDbPath: string;
};

const KNOWLEDGE_MANIFEST_SCHEMA_VERSION = 1;

export function ensureKnowledgeBaseInitialized(kbId: string): KnowledgeBaseSummary {
  const dir = getKnowledgeBaseDir(kbId);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(getKnowledgeBaseBlobsDir(kbId), { recursive: true });
  fs.mkdirSync(getKnowledgeBaseIndexDir(kbId), { recursive: true });
  fs.mkdirSync(getKnowledgeBaseStagingDir(kbId), { recursive: true });

  const manifestPath = getKnowledgeBaseManifestPath(kbId);
  let manifest: KnowledgeBaseManifest | null = null;
  if (fs.existsSync(manifestPath)) {
    try {
      const raw = fs.readFileSync(manifestPath, "utf-8");
      manifest = JSON.parse(raw) as KnowledgeBaseManifest;
    } catch {
      manifest = null;
    }
  }

  if (!manifest) {
    const now = Date.now();
    manifest = {
      id: kbId,
      name: "未命名知识库",
      description: null,
      createdAt: now,
      updatedAt: now,
      schemaVersion: KNOWLEDGE_MANIFEST_SCHEMA_VERSION,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  // 确保 meta.sqlite 已按版本迁移
  const metaDbPath = getKnowledgeMetaDbPath(kbId);
  const sqlite = openKnowledgeMetaDb(metaDbPath);
  closeKnowledgeMetaDb(sqlite);

  return { ...manifest, dir, metaDbPath };
}

export function createKnowledgeBase(input: {
  name: string;
  description?: string | null;
}): KnowledgeBaseSummary {
  const root = getKnowledgeBasesRoot();
  fs.mkdirSync(root, { recursive: true });

  const id = crypto.randomUUID();
  const dir = getKnowledgeBaseDir(id);
  fs.mkdirSync(dir, { recursive: true });

  const now = Date.now();
  const manifest: KnowledgeBaseManifest = {
    id,
    name: input.name.trim() || "未命名知识库",
    description: input.description?.trim() || null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: KNOWLEDGE_MANIFEST_SCHEMA_VERSION,
  };

  fs.writeFileSync(getKnowledgeBaseManifestPath(id), JSON.stringify(manifest, null, 2));

  ensureKnowledgeBaseInitialized(id);
  return { ...manifest, dir, metaDbPath: getKnowledgeMetaDbPath(id) };
}

export function listKnowledgeBases(): KnowledgeBaseSummary[] {
  const root = getKnowledgeBasesRoot();
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const bases: KnowledgeBaseSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const kbId = entry.name;
    const manifestPath = getKnowledgeBaseManifestPath(kbId);
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const raw = fs.readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw) as KnowledgeBaseManifest;
      if (!manifest || typeof manifest !== "object") continue;
      if (!manifest.id || !manifest.name) continue;
      bases.push({
        ...manifest,
        dir: getKnowledgeBaseDir(kbId),
        metaDbPath: getKnowledgeMetaDbPath(kbId),
      });
    } catch {
      // ignore broken manifest
    }
  }

  return bases.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function updateKnowledgeBaseManifest(
  kbId: string,
  updates: Partial<Pick<KnowledgeBaseManifest, "name" | "description">>,
): KnowledgeBaseSummary {
  const current = ensureKnowledgeBaseInitialized(kbId);
  const next: KnowledgeBaseManifest = {
    ...current,
    name: updates.name ? updates.name.trim() : current.name,
    description:
      updates.description === undefined ? current.description : updates.description?.trim() || null,
    updatedAt: Date.now(),
    schemaVersion: KNOWLEDGE_MANIFEST_SCHEMA_VERSION,
  };

  fs.writeFileSync(getKnowledgeBaseManifestPath(kbId), JSON.stringify(next, null, 2));
  return { ...next, dir: current.dir, metaDbPath: current.metaDbPath };
}

export function deleteKnowledgeBaseDir(input: { kbId: string; confirmed: boolean }): void {
  if (!input.confirmed) {
    throw new Error("危险操作：删除知识库需要 confirmed=true");
  }

  const dir = getKnowledgeBaseDir(input.kbId);
  if (!fs.existsSync(dir)) {
    return;
  }

  // 删除整个知识库目录（包含 blobs/index/meta.sqlite 等）
  fs.rmSync(dir, { recursive: true, force: true });
}

export function resolveKnowledgeBasePath(kbId: string): string {
  return path.resolve(getKnowledgeBaseDir(kbId));
}
