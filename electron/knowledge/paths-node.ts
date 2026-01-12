import fs from "node:fs";
import path from "node:path";

export function getKnowledgeBasesRootFromUserData(userDataPath: string): string {
  const root = path.join(userDataPath, "knowledge-bases");
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

export function getKnowledgeBaseDirFromUserData(userDataPath: string, kbId: string): string {
  return path.join(getKnowledgeBasesRootFromUserData(userDataPath), kbId);
}

export function getKnowledgeBaseManifestPathFromUserData(
  userDataPath: string,
  kbId: string,
): string {
  return path.join(getKnowledgeBaseDirFromUserData(userDataPath, kbId), "kb.json");
}

export function getKnowledgeMetaDbPathFromUserData(userDataPath: string, kbId: string): string {
  return path.join(getKnowledgeBaseDirFromUserData(userDataPath, kbId), "meta.sqlite");
}

export function getKnowledgeBaseBlobsDirFromUserData(userDataPath: string, kbId: string): string {
  return path.join(getKnowledgeBaseDirFromUserData(userDataPath, kbId), "blobs");
}

export function getKnowledgeBaseIndexDirFromUserData(userDataPath: string, kbId: string): string {
  return path.join(getKnowledgeBaseDirFromUserData(userDataPath, kbId), "index");
}

export function getKnowledgeBaseStagingDirFromUserData(userDataPath: string, kbId: string): string {
  return path.join(getKnowledgeBaseDirFromUserData(userDataPath, kbId), "staging");
}
