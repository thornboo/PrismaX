import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { once } from "node:events";
import { StringDecoder } from "node:string_decoder";
import { openKnowledgeMetaDb } from "./meta-db";
import type { KnowledgeMetaDb } from "./meta-db";
import {
  getKnowledgeBaseBlobsDirFromUserData,
  getKnowledgeBaseDirFromUserData,
  getKnowledgeBaseIndexDirFromUserData,
  getKnowledgeBaseManifestPathFromUserData,
  getKnowledgeBaseStagingDirFromUserData,
  getKnowledgeMetaDbPathFromUserData,
} from "./paths-node";
import type {
  KnowledgeWorkerEvent,
  KnowledgeWorkerRequest,
  KnowledgeWorkerResponse,
} from "./worker-protocol";

type JobStatus = "pending" | "processing" | "paused" | "done" | "failed" | "canceled";
type JobItemStatus = "pending" | "processing" | "done" | "failed" | "skipped";

type ImportSource =
  | { type: "files"; paths: string[] }
  | { type: "directory"; paths: string[]; recursive?: boolean };

type ImportJobPayload = {
  sources: ImportSource[];
};

type SearchResult = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentKind: "file" | "note";
  snippet: string;
  score: number;
};

const USER_DATA_PATH = process.env.PRISMAX_USER_DATA;
if (!USER_DATA_PATH) {
  throw new Error("缺少环境变量 PRISMAX_USER_DATA");
}

const dbCache = new Map<string, KnowledgeMetaDb>();
const runningByKb = new Map<string, string>(); // kbId -> jobId
const inMemoryCanceledJobs = new Set<string>(); // jobId（用于尽快停止）

function sendEvent(event: string, payload: unknown): void {
  const msg: KnowledgeWorkerEvent = { type: "event", event, payload };
  if (typeof process.send === "function") {
    process.send(msg);
  }
}

function respondOk(id: string, result: unknown): void {
  const msg: KnowledgeWorkerResponse = { id, ok: true, result };
  if (typeof process.send === "function") {
    process.send(msg);
  }
}

function respondError(id: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "未知错误";
  const stack = error instanceof Error ? error.stack : undefined;
  const msg: KnowledgeWorkerResponse = { id, ok: false, error: { message, stack } };
  if (typeof process.send === "function") {
    process.send(msg);
  }
}

function ensureKbDirs(kbId: string): void {
  const kbDir = getKnowledgeBaseDirFromUserData(USER_DATA_PATH, kbId);
  fs.mkdirSync(kbDir, { recursive: true });
  fs.mkdirSync(getKnowledgeBaseBlobsDirFromUserData(USER_DATA_PATH, kbId), { recursive: true });
  fs.mkdirSync(getKnowledgeBaseIndexDirFromUserData(USER_DATA_PATH, kbId), { recursive: true });
  fs.mkdirSync(getKnowledgeBaseStagingDirFromUserData(USER_DATA_PATH, kbId), { recursive: true });

  const manifestPath = getKnowledgeBaseManifestPathFromUserData(USER_DATA_PATH, kbId);
  if (!fs.existsSync(manifestPath)) {
    const now = Date.now();
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          id: kbId,
          name: "未命名知识库",
          description: null,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        null,
        2,
      ),
    );
  }
}

function getDb(kbId: string): KnowledgeMetaDb {
  const cached = dbCache.get(kbId);
  if (cached) return cached;

  ensureKbDirs(kbId);
  const dbPath = getKnowledgeMetaDbPathFromUserData(USER_DATA_PATH, kbId);
  const sqlite = openKnowledgeMetaDb(dbPath);

  // 启动恢复：将上次崩溃遗留的 processing 状态归位为 paused/pending
  const now = Date.now();
  sqlite
    .prepare("UPDATE jobs SET status = 'paused', updated_at = ? WHERE status = 'processing'")
    .run(now);
  sqlite
    .prepare("UPDATE job_items SET status = 'pending', updated_at = ? WHERE status = 'processing'")
    .run(now);

  dbCache.set(kbId, sqlite);
  return sqlite;
}

function isSupportedTextExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const textExts = new Set([
    ".txt",
    ".md",
    ".markdown",
    ".mdx",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".csv",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".kts",
    ".rb",
    ".php",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".xml",
    ".toml",
    ".ini",
    ".sh",
    ".bash",
    ".zsh",
    ".sql",
  ]);
  return textExts.has(ext);
}

function guessMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".json": "application/json",
    ".csv": "text/csv",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
  };
  return map[ext] ?? null;
}

async function collectFilesFromDirectory(dir: string, recursive: boolean): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [dir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      // 规避常见噪音目录
      if (
        entry.isDirectory() &&
        ["node_modules", ".git", ".idea", ".vscode"].includes(entry.name)
      ) {
        continue;
      }

      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) stack.push(full);
        continue;
      }
      if (entry.isFile()) out.push(full);
    }
  }

  return out;
}

async function resolveImportFileList(sources: ImportSource[]): Promise<string[]> {
  const files: string[] = [];
  for (const source of sources) {
    if (source.type === "files") {
      files.push(...source.paths);
      continue;
    }
    if (source.type === "directory") {
      for (const dir of source.paths) {
        const collected = await collectFilesFromDirectory(dir, source.recursive ?? true);
        files.push(...collected);
      }
    }
  }
  // 去重 + 保序
  return [...new Set(files)];
}

function getBlobRelPath(documentId: string, sourcePath: string): string {
  const ext = path.extname(sourcePath);
  return path.join("blobs", `${documentId}${ext}`);
}

function chunkTextStream(
  chunkSize: number,
  overlap: number,
): {
  push: (text: string) => string[];
  flush: () => string | null;
} {
  let carry = "";
  return {
    push: (text: string) => {
      carry += text;
      const chunks: string[] = [];
      while (carry.length >= chunkSize) {
        const part = carry.slice(0, chunkSize);
        chunks.push(part);
        carry = carry.slice(Math.max(0, chunkSize - overlap));
      }
      return chunks;
    },
    flush: () => {
      const rest = carry.trim();
      carry = "";
      return rest.length > 0 ? rest : null;
    },
  };
}

function bufferLooksBinary(buf: Buffer): boolean {
  // 快速启发式：出现 0x00 基本可认为是二进制
  return buf.includes(0);
}

async function importOneFile(params: {
  kbId: string;
  jobId: string;
  jobItemId: string;
  sourcePath: string;
}): Promise<{ status: JobItemStatus; documentId?: string; error?: string }> {
  const { kbId, sourcePath, jobItemId } = params;
  const db = getDb(kbId);

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(sourcePath);
  } catch {
    return { status: "failed", error: "文件不存在或无法读取" };
  }
  if (!stat.isFile()) {
    return { status: "skipped", error: "非文件" };
  }

  const documentId = crypto.randomUUID();
  const now = Date.now();
  const title = path.basename(sourcePath);
  const blobRelPath = getBlobRelPath(documentId, sourcePath);
  const blobAbsPath = path.join(getKnowledgeBaseDirFromUserData(USER_DATA_PATH, kbId), blobRelPath);

  const insertDocument = db.prepare(`
    INSERT INTO documents(
      id, kind, title, source_path, blob_rel_path, mime_type, size_bytes, sha256, created_at, updated_at
    ) VALUES (?, 'file', ?, ?, ?, ?, ?, NULL, ?, ?)
  `);
  const updateSha = db.prepare("UPDATE documents SET sha256 = ?, updated_at = ? WHERE id = ?");

  const insertChunk = db.prepare(`
    INSERT INTO chunks(id, document_id, chunk_index, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const shouldIndexText = isSupportedTextExtension(sourcePath);

  // 手动事务：需要与 stream async/await 配合
  db.exec("BEGIN");
  try {
    fs.mkdirSync(path.dirname(blobAbsPath), { recursive: true });
    insertDocument.run(
      documentId,
      title,
      sourcePath,
      blobRelPath,
      guessMimeType(sourcePath),
      stat.size,
      now,
      now,
    );

    const hash = crypto.createHash("sha256");
    const reader = fs.createReadStream(sourcePath);
    const writer = fs.createWriteStream(blobAbsPath, { flags: "wx" });

    const decoder = new StringDecoder("utf8");
    const chunker = chunkTextStream(2000, 200);
    let chunkIndex = 0;
    let decidedBinary = false;
    let canIndex = shouldIndexText;

    for await (const buf of reader) {
      const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as any);
      hash.update(buffer);

      if (!writer.write(buffer)) {
        await once(writer, "drain");
      }

      if (!canIndex) continue;

      if (!decidedBinary) {
        decidedBinary = true;
        if (bufferLooksBinary(buffer)) {
          canIndex = false;
          continue;
        }
      }

      const text = decoder.write(buffer);
      const parts = chunker.push(text);
      for (const part of parts) {
        insertChunk.run(crypto.randomUUID(), documentId, chunkIndex++, part, Date.now());
      }
    }

    const tail = decoder.end();
    if (canIndex) {
      const parts = chunker.push(tail);
      for (const part of parts) {
        insertChunk.run(crypto.randomUUID(), documentId, chunkIndex++, part, Date.now());
      }
      const rest = chunker.flush();
      if (rest) {
        insertChunk.run(crypto.randomUUID(), documentId, chunkIndex++, rest, Date.now());
      }
    }

    writer.end();
    await once(writer, "close");

    updateSha.run(hash.digest("hex"), Date.now(), documentId);

    db.exec("COMMIT");
    return { status: canIndex ? "done" : "skipped", documentId };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    // 尽量清理未完成 blob
    try {
      await fs.promises.rm(blobAbsPath, { force: true });
    } catch {
      // ignore
    }
    const message = error instanceof Error ? error.message : "导入失败";
    return { status: "failed", error: message };
  } finally {
    // 更新 job_item 状态（无论成功失败）
    const now2 = Date.now();
    db.prepare("UPDATE job_items SET updated_at = ? WHERE id = ?").run(now2, jobItemId);
  }
}

function jobSummary(db: KnowledgeMetaDb, jobId: string): any {
  const row = db
    .prepare(
      `
      SELECT
        id, type, status, progress_current AS progressCurrent, progress_total AS progressTotal,
        error_message AS errorMessage,
        created_at AS createdAt, started_at AS startedAt, finished_at AS finishedAt,
        updated_at AS updatedAt, heartbeat_at AS heartbeatAt
      FROM jobs
      WHERE id = ?
    `,
    )
    .get(jobId);
  return row ?? null;
}

/**
 * 队列策略（KISS）：同一知识库同一时间只允许一个"未结束任务"（pending/processing/paused）。
 * 如果存在 paused 任务，则不自动启动其他 pending，避免并发让用户困惑。
 */
function scheduleNextPendingJob(kbId: string, db: KnowledgeMetaDb): void {
  const hasPaused = db.prepare("SELECT 1 AS ok FROM jobs WHERE status = 'paused' LIMIT 1").get() as
    | { ok: 1 }
    | undefined;
  if (hasPaused) {
    return;
  }

  const next = db
    .prepare(
      `
      SELECT id
      FROM jobs
      WHERE type = 'import_files' AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `,
    )
    .get() as { id: string } | undefined;
  if (next?.id) {
    void processImportJob(kbId, next.id);
  }
}

async function processImportJob(kbId: string, jobId: string): Promise<void> {
  const db = getDb(kbId);
  if (runningByKb.get(kbId) && runningByKb.get(kbId) !== jobId) {
    return;
  }
  runningByKb.set(kbId, jobId);

  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'processing', started_at = COALESCE(started_at, ?), updated_at = ?, heartbeat_at = ? WHERE id = ?",
  ).run(now, now, now, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });

  try {
    while (true) {
      if (inMemoryCanceledJobs.has(jobId)) {
        break;
      }

      const job = db.prepare("SELECT status FROM jobs WHERE id = ?").get(jobId) as
        | { status: JobStatus }
        | undefined;
      const status = job?.status;
      if (!status || status === "done" || status === "failed" || status === "canceled") {
        break;
      }
      if (status === "paused") {
        break;
      }

      const next = db
        .prepare(
          `
          SELECT id, source_path AS sourcePath
          FROM job_items
          WHERE job_id = ? AND status = 'pending'
          ORDER BY created_at ASC
          LIMIT 1
        `,
        )
        .get(jobId) as { id: string; sourcePath: string } | undefined;

      if (!next) {
        db.prepare(
          "UPDATE jobs SET status = 'done', finished_at = ?, updated_at = ?, heartbeat_at = ? WHERE id = ?",
        ).run(Date.now(), Date.now(), Date.now(), jobId);
        sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
        break;
      }

      const itemNow = Date.now();
      db.prepare(
        "UPDATE job_items SET status = 'processing', started_at = ?, updated_at = ? WHERE id = ?",
      ).run(itemNow, itemNow, next.id);

      const result = await importOneFile({
        kbId,
        jobId,
        jobItemId: next.id,
        sourcePath: next.sourcePath,
      });

      const doneNow = Date.now();
      db.prepare(
        "UPDATE job_items SET status = ?, error_message = ?, finished_at = ?, updated_at = ? WHERE id = ?",
      ).run(result.status, result.error ?? null, doneNow, doneNow, next.id);

      const progress = db
        .prepare(
          "SELECT COUNT(*) AS doneCount FROM job_items WHERE job_id = ? AND status IN ('done', 'failed', 'skipped')",
        )
        .get(jobId) as { doneCount: number };

      db.prepare(
        "UPDATE jobs SET progress_current = ?, updated_at = ?, heartbeat_at = ? WHERE id = ?",
      ).run(Number(progress.doneCount ?? 0), doneNow, doneNow, jobId);

      sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入任务失败";
    const failNow = Date.now();
    db.prepare(
      "UPDATE jobs SET status = 'failed', error_message = ?, finished_at = ?, updated_at = ? WHERE id = ?",
    ).run(message, failNow, failNow, jobId);
    sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  } finally {
    runningByKb.delete(kbId);
    scheduleNextPendingJob(kbId, db);
  }
}

async function handleEnsureInitialized(params: any): Promise<{ kbId: string; metaDbPath: string }> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  ensureKbDirs(kbId);
  const dbPath = getKnowledgeMetaDbPathFromUserData(USER_DATA_PATH, kbId);
  getDb(kbId); // migrate + recover
  return { kbId, metaDbPath: dbPath };
}

async function handleImportFiles(params: any): Promise<{ jobId: string }> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  const sources = (params?.sources ?? []) as ImportSource[];
  if (!Array.isArray(sources) || sources.length === 0) throw new Error("sources 不能为空");

  ensureKbDirs(kbId);
  const db = getDb(kbId);

  const files = await resolveImportFileList(sources);
  if (files.length === 0) {
    throw new Error("未发现可导入的文件");
  }

  const jobId = crypto.randomUUID();
  const payload: ImportJobPayload = { sources };
  const now = Date.now();

  const insertJob = db.prepare(`
    INSERT INTO jobs(id, type, status, payload_json, progress_current, progress_total, error_message, created_at, started_at, finished_at, updated_at, heartbeat_at)
    VALUES (?, 'import_files', 'pending', ?, 0, ?, NULL, ?, NULL, NULL, ?, NULL)
  `);
  const insertItem = db.prepare(`
    INSERT INTO job_items(id, job_id, kind, source_path, status, error_message, created_at, updated_at, started_at, finished_at)
    VALUES (?, ?, 'file', ?, 'pending', NULL, ?, ?, NULL, NULL)
  `);

  db.exec("BEGIN");
  try {
    insertJob.run(jobId, JSON.stringify(payload), files.length, now, now);
    for (const sourcePath of files) {
      insertItem.run(crypto.randomUUID(), jobId, sourcePath, now, now);
    }
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }

  // 如果该 KB 当前没有任务在跑，立即启动；否则保持 pending（后续可实现队列）
  if (!runningByKb.has(kbId)) {
    void processImportJob(kbId, jobId);
  }

  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { jobId };
}

async function handleListJobs(params: any): Promise<any[]> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  const db = getDb(kbId);
  const rows = db
    .prepare(
      `
      SELECT
        id, type, status, progress_current AS progressCurrent, progress_total AS progressTotal,
        error_message AS errorMessage,
        created_at AS createdAt, started_at AS startedAt, finished_at AS finishedAt,
        updated_at AS updatedAt, heartbeat_at AS heartbeatAt
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 200
    `,
    )
    .all();
  return rows as any[];
}

async function handlePauseJob(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const jobId = String(params?.jobId ?? "");
  if (!kbId || !jobId) throw new Error("kbId/jobId 不能为空");
  const db = getDb(kbId);
  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'paused', updated_at = ? WHERE id = ? AND status IN ('pending','processing')",
  ).run(now, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { success: true };
}

async function handleResumeJob(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const jobId = String(params?.jobId ?? "");
  if (!kbId || !jobId) throw new Error("kbId/jobId 不能为空");
  const db = getDb(kbId);
  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'pending', updated_at = ? WHERE id = ? AND status IN ('paused','pending')",
  ).run(now, jobId);
  if (!runningByKb.has(kbId)) {
    void processImportJob(kbId, jobId);
  }
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { success: true };
}

async function handleCancelJob(params: any): Promise<{ success: boolean }> {
  const kbId = String(params?.kbId ?? "");
  const jobId = String(params?.jobId ?? "");
  if (!kbId || !jobId) throw new Error("kbId/jobId 不能为空");
  inMemoryCanceledJobs.add(jobId);
  const db = getDb(kbId);
  const now = Date.now();
  db.prepare(
    "UPDATE jobs SET status = 'canceled', finished_at = COALESCE(finished_at, ?), updated_at = ? WHERE id = ?",
  ).run(now, now, jobId);
  db.prepare(
    "UPDATE job_items SET status = 'skipped', updated_at = ? WHERE job_id = ? AND status IN ('pending','processing')",
  ).run(now, jobId);
  sendEvent("job:update", { kbId, job: jobSummary(db, jobId) });
  return { success: true };
}

async function handleSearch(params: any): Promise<{ results: SearchResult[] }> {
  const kbId = String(params?.kbId ?? "");
  const query = String(params?.query ?? "").trim();
  const limit = Number(params?.limit ?? 20);
  if (!kbId) throw new Error("kbId 不能为空");
  if (!query) return { results: [] };

  const db = getDb(kbId);

  // FTS5：bm25 越小越相关
  const rows = db
    .prepare(
      `
      SELECT
        c.id AS chunkId,
        c.document_id AS documentId,
        d.title AS documentTitle,
        d.kind AS documentKind,
        snippet(chunks_fts, 0, '[', ']', '...', 10) AS snippet,
        bm25(chunks_fts) AS score
      FROM chunks_fts
      JOIN chunks c ON chunks_fts.rowid = c.rowid
      JOIN documents d ON d.id = c.document_id
      WHERE chunks_fts MATCH ?
      ORDER BY score ASC
      LIMIT ?
    `,
    )
    .all(query, limit) as any[];

  return {
    results: rows.map((r) => ({
      chunkId: String(r.chunkId),
      documentId: String(r.documentId),
      documentTitle: String(r.documentTitle ?? ""),
      documentKind: r.documentKind === "note" ? "note" : "file",
      snippet: String(r.snippet ?? ""),
      score: Number(r.score ?? 0),
    })),
  };
}

async function handleCreateNote(params: any): Promise<{ documentId: string }> {
  const kbId = String(params?.kbId ?? "");
  const title = String(params?.title ?? "").trim();
  const content = String(params?.content ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  if (!title) throw new Error("title 不能为空");

  const db = getDb(kbId);
  const documentId = crypto.randomUUID();
  const now = Date.now();

  const insertDoc = db.prepare(
    `INSERT INTO documents(id, kind, title, source_path, blob_rel_path, mime_type, size_bytes, sha256, created_at, updated_at)
     VALUES (?, 'note', ?, NULL, NULL, 'text/markdown', ?, NULL, ?, ?)`,
  );
  const insertNote = db.prepare("INSERT INTO notes(document_id, content) VALUES (?, ?)");
  const insertChunk = db.prepare(
    "INSERT INTO chunks(id, document_id, chunk_index, content, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  db.exec("BEGIN");
  try {
    insertDoc.run(documentId, title, Buffer.byteLength(content, "utf8"), now, now);
    insertNote.run(documentId, content);

    const chunker = chunkTextStream(2000, 200);
    let idx = 0;
    const parts = chunker.push(content);
    for (const part of parts) {
      insertChunk.run(crypto.randomUUID(), documentId, idx++, part, Date.now());
    }
    const rest = chunker.flush();
    if (rest) {
      insertChunk.run(crypto.randomUUID(), documentId, idx++, rest, Date.now());
    }

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }

  return { documentId };
}

async function handleGetStats(params: any): Promise<any> {
  const kbId = String(params?.kbId ?? "");
  if (!kbId) throw new Error("kbId 不能为空");
  const db = getDb(kbId);
  const doc = db.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number };
  const chunks = db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as { n: number };
  const jobs = db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as { n: number };
  return {
    documents: Number(doc.n ?? 0),
    chunks: Number(chunks.n ?? 0),
    jobs: Number(jobs.n ?? 0),
  };
}

const handlers: Record<string, (params: any) => Promise<any>> = {
  "kb.ensureInitialized": handleEnsureInitialized,
  "kb.importFiles": handleImportFiles,
  "kb.listJobs": handleListJobs,
  "kb.pauseJob": handlePauseJob,
  "kb.resumeJob": handleResumeJob,
  "kb.cancelJob": handleCancelJob,
  "kb.search": handleSearch,
  "kb.createNote": handleCreateNote,
  "kb.getStats": handleGetStats,
};

process.on("message", async (msg: KnowledgeWorkerRequest) => {
  if (!msg || typeof msg !== "object") return;
  const { id, method, params } = msg as KnowledgeWorkerRequest;
  if (!id || !method) return;

  const handler = handlers[method];
  if (!handler) {
    respondError(id, new Error(`未知方法: ${method}`));
    return;
  }

  try {
    const result = await handler(params as any);
    respondOk(id, result);
  } catch (error) {
    respondError(id, error);
  }
});

process.on("disconnect", () => {
  for (const db of dbCache.values()) {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
  process.exit(0);
});
