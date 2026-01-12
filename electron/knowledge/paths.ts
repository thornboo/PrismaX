import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export function getKnowledgeBasesRoot(): string {
  const root = path.join(app.getPath("userData"), "knowledge-bases");
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

export function getKnowledgeBaseDir(kbId: string): string {
  return path.join(getKnowledgeBasesRoot(), kbId);
}

export function getKnowledgeBaseManifestPath(kbId: string): string {
  return path.join(getKnowledgeBaseDir(kbId), "kb.json");
}

export function getKnowledgeMetaDbPath(kbId: string): string {
  return path.join(getKnowledgeBaseDir(kbId), "meta.sqlite");
}

export function getKnowledgeBaseBlobsDir(kbId: string): string {
  return path.join(getKnowledgeBaseDir(kbId), "blobs");
}

export function getKnowledgeBaseIndexDir(kbId: string): string {
  return path.join(getKnowledgeBaseDir(kbId), "index");
}

export function getKnowledgeBaseStagingDir(kbId: string): string {
  return path.join(getKnowledgeBaseDir(kbId), "staging");
}
