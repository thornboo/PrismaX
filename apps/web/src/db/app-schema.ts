import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, boolean } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const aiProviders = pgTable(
  "ai_providers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    openaiBaseUrl: text("openai_base_url"),
    openaiApiKeyEnc: text("openai_api_key_enc"),
    openaiModel: text("openai_model"),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("ai_providers_userId_idx").on(table.userId)],
);

export const aiProviderRelations = relations(aiProviders, ({ one }) => ({
  user: one(user, {
    fields: [aiProviders.userId],
    references: [user.id],
  }),
}));

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("provider_id").references(() => aiProviders.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("conversations_userId_idx").on(table.userId)],
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

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  user: one(user, {
    fields: [conversations.userId],
    references: [user.id],
  }),
  provider: one(aiProviders, {
    fields: [conversations.providerId],
    references: [aiProviders.id],
  }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const userAiSettings = pgTable("user_ai_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  openaiBaseUrl: text("openai_base_url"),
  openaiApiKeyEnc: text("openai_api_key_enc"),
  openaiModel: text("openai_model"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const userAiSettingsRelations = relations(userAiSettings, ({ one }) => ({
  user: one(user, {
    fields: [userAiSettings.userId],
    references: [user.id],
  }),
}));
