import Database from "better-sqlite3";

export function ensureDesktopSchema(sqlite: Database.Database) {
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(
    `
CREATE TABLE IF NOT EXISTS "folders" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "parent_id" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "folders_parentId_idx" ON "folders" ("parent_id");

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "folder_id" TEXT,
  "title" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "conversations_folderId_idx" ON "conversations" ("folder_id");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "messages_conversationId_idx" ON "messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "messages_createdAt_idx" ON "messages" ("created_at");

CREATE TABLE IF NOT EXISTS "assistants" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "model" TEXT,
  "system_prompt" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "assistants_name_idx" ON "assistants" ("name");

CREATE TABLE IF NOT EXISTS "agent_memories" (
  "assistant_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "last_updated" INTEGER NOT NULL,
  PRIMARY KEY ("assistant_id", "label"),
  FOREIGN KEY ("assistant_id") REFERENCES "assistants" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "agent_memories_assistantId_idx" ON "agent_memories" ("assistant_id");

CREATE TABLE IF NOT EXISTS "archival_memories" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "assistant_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" BLOB NOT NULL,
  "created_at" INTEGER NOT NULL,
  FOREIGN KEY ("assistant_id") REFERENCES "assistants" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "archival_memories_assistantId_idx" ON "archival_memories" ("assistant_id");
`.trim(),
  );
}
