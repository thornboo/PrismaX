import { relations } from "drizzle-orm";
import { blob, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    parentId: text("parent_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("folders_parentId_idx").on(table.parentId)],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("conversations_folderId_idx").on(table.folderId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("messages_conversationId_idx").on(table.conversationId),
    index("messages_createdAt_idx").on(table.createdAt),
  ],
);

export const assistants = sqliteTable(
  "assistants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    model: text("model"),
    systemPrompt: text("system_prompt"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("assistants_name_idx").on(table.name)],
);

export const agentMemories = sqliteTable(
  "agent_memories",
  {
    assistantId: text("assistant_id")
      .notNull()
      .references(() => assistants.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    content: text("content").notNull(),
    lastUpdated: integer("last_updated", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assistantId, table.label] }),
    index("agent_memories_assistantId_idx").on(table.assistantId),
  ],
);

export const archivalMemories = sqliteTable(
  "archival_memories",
  {
    id: text("id").primaryKey(),
    assistantId: text("assistant_id")
      .notNull()
      .references(() => assistants.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: blob("embedding").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("archival_memories_assistantId_idx").on(table.assistantId)],
);

export const folderRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, { fields: [folders.parentId], references: [folders.id] }),
  children: many(folders),
  conversations: many(conversations),
}));

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  folder: one(folders, { fields: [conversations.folderId], references: [folders.id] }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const assistantRelations = relations(assistants, ({ many }) => ({
  coreMemories: many(agentMemories),
  archivalMemories: many(archivalMemories),
}));

export const agentMemoryRelations = relations(agentMemories, ({ one }) => ({
  assistant: one(assistants, {
    fields: [agentMemories.assistantId],
    references: [assistants.id],
  }),
}));

export const archivalMemoryRelations = relations(archivalMemories, ({ one }) => ({
  assistant: one(assistants, {
    fields: [archivalMemories.assistantId],
    references: [assistants.id],
  }),
}));

export type DesktopFolder = typeof folders.$inferSelect;
export type DesktopNewFolder = typeof folders.$inferInsert;
export type DesktopConversation = typeof conversations.$inferSelect;
export type DesktopNewConversation = typeof conversations.$inferInsert;
export type DesktopMessage = typeof messages.$inferSelect;
export type DesktopNewMessage = typeof messages.$inferInsert;
export type DesktopAssistant = typeof assistants.$inferSelect;
export type DesktopNewAssistant = typeof assistants.$inferInsert;
export type DesktopAgentMemory = typeof agentMemories.$inferSelect;
export type DesktopNewAgentMemory = typeof agentMemories.$inferInsert;
export type DesktopArchivalMemory = typeof archivalMemories.$inferSelect;
export type DesktopNewArchivalMemory = typeof archivalMemories.$inferInsert;
