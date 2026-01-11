import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("users_email_idx").on(table.email)],
);

export const folders = pgTable(
  "folders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: text("parent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("folders_userId_idx").on(table.userId)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("conversations_userId_idx").on(table.userId),
    index("conversations_folderId_idx").on(table.folderId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversationId_idx").on(table.conversationId),
    index("messages_createdAt_idx").on(table.createdAt),
  ],
);

export const assistants = pgTable(
  "assistants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    model: text("model"),
    systemPrompt: text("system_prompt"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("assistants_userId_idx").on(table.userId)],
);

export const agentMemories = pgTable(
  "agent_memories",
  {
    assistantId: text("assistant_id")
      .notNull()
      .references(() => assistants.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    content: text("content").notNull(),
    lastUpdated: timestamp("last_updated")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assistantId, table.label] }),
    index("agent_memories_assistantId_idx").on(table.assistantId),
  ],
);

export const archivalMemories = pgTable(
  "archival_memories",
  {
    id: text("id").primaryKey(),
    assistantId: text("assistant_id")
      .notNull()
      .references(() => assistants.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("archival_memories_assistantId_idx").on(table.assistantId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  folders: many(folders),
  conversations: many(conversations),
  assistants: many(assistants),
}));

export const folderRelations = relations(folders, ({ one, many }) => ({
  user: one(users, { fields: [folders.userId], references: [users.id] }),
  parent: one(folders, { fields: [folders.parentId], references: [folders.id] }),
  children: many(folders),
  conversations: many(conversations),
}));

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  folder: one(folders, { fields: [conversations.folderId], references: [folders.id] }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const assistantRelations = relations(assistants, ({ one, many }) => ({
  user: one(users, { fields: [assistants.userId], references: [users.id] }),
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

export type WebUser = typeof users.$inferSelect;
export type WebNewUser = typeof users.$inferInsert;
export type WebFolder = typeof folders.$inferSelect;
export type WebNewFolder = typeof folders.$inferInsert;
export type WebConversation = typeof conversations.$inferSelect;
export type WebNewConversation = typeof conversations.$inferInsert;
export type WebMessage = typeof messages.$inferSelect;
export type WebNewMessage = typeof messages.$inferInsert;
export type WebAssistant = typeof assistants.$inferSelect;
export type WebNewAssistant = typeof assistants.$inferInsert;
export type WebAgentMemory = typeof agentMemories.$inferSelect;
export type WebNewAgentMemory = typeof agentMemories.$inferInsert;
export type WebArchivalMemory = typeof archivalMemories.$inferSelect;
export type WebNewArchivalMemory = typeof archivalMemories.$inferInsert;
