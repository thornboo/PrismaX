import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { KNOWLEDGE_META_MIGRATIONS } from "./meta-schema";

export type KnowledgeMetaDb = Database.Database;

export function openKnowledgeMetaDb(dbFilePath: string): KnowledgeMetaDb {
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
  const sqlite = new Database(dbFilePath);

  // 性能/一致性权衡：知识库导入写入量大，采用 WAL + NORMAL 更合适。
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("temp_store = MEMORY");

  migrateKnowledgeMetaDb(sqlite);
  return sqlite;
}

export function closeKnowledgeMetaDb(db: KnowledgeMetaDb): void {
  db.close();
}

function migrateKnowledgeMetaDb(sqlite: KnowledgeMetaDb): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const current = sqlite
    .prepare("SELECT COALESCE(MAX(id), 0) AS id FROM schema_migrations")
    .get() as { id: number };

  const currentId = Number(current?.id ?? 0);
  const pending = KNOWLEDGE_META_MIGRATIONS.filter((m) => m.id > currentId).sort(
    (a, b) => a.id - b.id,
  );
  if (pending.length === 0) return;

  const now = Date.now();
  const tx = sqlite.transaction(() => {
    for (const migration of pending) {
      sqlite.exec(migration.sql);
      sqlite
        .prepare("INSERT INTO schema_migrations(id, name, applied_at) VALUES (?, ?, ?)")
        .run(migration.id, migration.name, now);
    }
  });
  tx();
}
