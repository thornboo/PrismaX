import fs from "node:fs";
import path from "node:path";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { schema } from "../db";

type ExportEnvelope<T extends object> = T & {
  version: number;
  exportedAt: string;
};

export type ConversationsExportV1 = ExportEnvelope<{
  kind: "prismax.conversations";
  conversations: Array<{
    id: string;
    title: string;
    modelId: string | null;
    assistantId: string | null;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  messages: Array<{
    id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    modelId: string | null;
    promptTokens: number | null;
    completionTokens: number | null;
    createdAt: string;
  }>;
}>;

export type SettingsExportV1 = ExportEnvelope<{
  kind: "prismax.settings";
  settings: Record<string, unknown>;
  providers: Array<{
    id: string;
    name: string;
    baseUrl: string | null;
    enabled: boolean;
  }>;
}>;

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.promises.readFile(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

export function buildConversationsExport(
  db: BetterSQLite3Database<typeof schema>,
): ConversationsExportV1 {
  const conversations = db.select().from(schema.conversations).all();
  const messages = db.select().from(schema.messages).all();

  return {
    kind: "prismax.conversations",
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      modelId: c.modelId,
      assistantId: c.assistantId,
      pinned: c.pinned,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    messages: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      modelId: m.modelId,
      promptTokens: m.promptTokens,
      completionTokens: m.completionTokens,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export function buildSettingsExport(
  db: BetterSQLite3Database<typeof schema>,
  input: {
    settings: Record<string, unknown>;
    providers: Array<{ id: string; name: string; baseUrl: string | null; enabled: boolean }>;
  },
): SettingsExportV1 {
  void db;
  return {
    kind: "prismax.settings",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: input.settings,
    providers: input.providers,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseConversationsExport(value: unknown): ConversationsExportV1 {
  if (!isRecord(value)) throw new Error("无效的导入文件（格式错误）");
  if (value.kind !== "prismax.conversations") throw new Error("无效的导入文件（类型不匹配）");
  if (value.version !== 1) throw new Error("无效的导入文件（版本不兼容）");
  if (!Array.isArray(value.conversations) || !Array.isArray(value.messages)) {
    throw new Error("无效的导入文件（缺少必要字段）");
  }
  return value as ConversationsExportV1;
}

export function parseSettingsExport(value: unknown): SettingsExportV1 {
  if (!isRecord(value)) throw new Error("无效的导入文件（格式错误）");
  if (value.kind !== "prismax.settings") throw new Error("无效的导入文件（类型不匹配）");
  if (value.version !== 1) throw new Error("无效的导入文件（版本不兼容）");
  if (!isRecord(value.settings) || !Array.isArray(value.providers)) {
    throw new Error("无效的导入文件（缺少必要字段）");
  }
  return value as SettingsExportV1;
}

export function importConversationsAsNew(
  db: BetterSQLite3Database<typeof schema>,
  input: ConversationsExportV1,
): { conversationsAdded: number; messagesAdded: number } {
  const now = Date.now();
  const conversationIdMap = new Map<string, string>();

  for (const c of input.conversations) {
    conversationIdMap.set(c.id, crypto.randomUUID());
  }

  for (const c of input.conversations) {
    const newId = conversationIdMap.get(c.id);
    if (!newId) continue;
    const createdAt = new Date(c.createdAt);
    const updatedAt = new Date(c.updatedAt);
    db.insert(schema.conversations)
      .values({
        id: newId,
        title: c.title || "导入的对话",
        modelId: c.modelId ?? null,
        assistantId: c.assistantId ?? null,
        pinned: !!c.pinned,
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date(now) : createdAt,
        updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date(now) : updatedAt,
      })
      .run();
  }

  let messagesAdded = 0;
  for (const m of input.messages) {
    const mappedConversationId = conversationIdMap.get(m.conversationId);
    if (!mappedConversationId) continue;
    const createdAt = new Date(m.createdAt);
    db.insert(schema.messages)
      .values({
        id: crypto.randomUUID(),
        conversationId: mappedConversationId,
        role: m.role,
        content: m.content ?? "",
        modelId: m.modelId ?? null,
        promptTokens: m.promptTokens ?? null,
        completionTokens: m.completionTokens ?? null,
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date(now) : createdAt,
      })
      .run();
    messagesAdded += 1;
  }

  return { conversationsAdded: input.conversations.length, messagesAdded };
}

export function applySettingsImport(
  db: BetterSQLite3Database<typeof schema>,
  input: SettingsExportV1,
): { settingsUpdated: number; providersUpdated: number } {
  let settingsUpdated = 0;
  for (const [key, value] of Object.entries(input.settings)) {
    db.insert(schema.settings)
      .values({ key, value: JSON.stringify(value), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value: JSON.stringify(value), updatedAt: new Date() },
      })
      .run();
    settingsUpdated += 1;
  }

  let providersUpdated = 0;
  for (const p of input.providers) {
    db.update(schema.providers)
      .set({
        baseUrl: p.baseUrl ?? null,
        enabled: !!p.enabled,
        updatedAt: new Date(),
      })
      .where(eq(schema.providers.id, p.id))
      .run();
    providersUpdated += 1;
  }

  return { settingsUpdated, providersUpdated };
}
