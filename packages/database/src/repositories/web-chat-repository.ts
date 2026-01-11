import type {
  Conversation,
  CreateConversationInput,
  CreateFolderInput,
  CreateMessageInput,
  Folder,
  IChatRepository,
  Message,
} from "@prismax/core";
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { conversations, messages } from "../web/schema";

import type * as WebSchema from "../web/schema";

type WebDb = PostgresJsDatabase<typeof WebSchema>;

function requireUserId(userId: string | undefined): string {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("WebChatRepository: userId is required");
  }
  return userId;
}

export class WebChatRepository implements IChatRepository {
  constructor(private readonly db: WebDb) {}

  async createFolder(_input: CreateFolderInput): Promise<Folder> {
    throw new Error("WebChatRepository: folders are not supported by the current web schema");
  }

  async listFolders(): Promise<Folder[]> {
    return [];
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const userId = requireUserId(input.userId);

    const [row] = await this.db
      .insert(conversations)
      .values({
        id: input.id,
        userId,
        title: input.title,
        providerId: null,
      })
      .returning();

    if (!row) {
      throw new Error("WebChatRepository: failed to create conversation");
    }

    return {
      id: row.id,
      userId: row.userId,
      folderId: null,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getConversation(input: { id: string; userId?: string }): Promise<Conversation | null> {
    const userId = requireUserId(input.userId);

    const rows = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, input.id), eq(conversations.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      folderId: null,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getConversations(input?: {
    userId?: string;
    folderId?: string | null;
  }): Promise<Conversation[]> {
    const userId = requireUserId(input?.userId);

    if (input && "folderId" in input && input.folderId != null) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.updatedAt);

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      folderId: null,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async addMessage(input: CreateMessageInput & { userId?: string }): Promise<Message> {
    const userId = requireUserId(input.userId);

    const canWrite = await this.getConversation({ id: input.conversationId, userId });
    if (!canWrite) {
      throw new Error("WebChatRepository: conversation not found");
    }

    const [row] = await this.db
      .insert(messages)
      .values({
        id: input.id,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
      })
      .returning();

    if (!row) {
      throw new Error("WebChatRepository: failed to add message");
    }

    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
    };
  }

  async getMessages(input: { conversationId: string; userId?: string }): Promise<Message[]> {
    const userId = requireUserId(input.userId);

    const rows = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.userId, userId), eq(messages.conversationId, input.conversationId)))
      .orderBy(asc(messages.createdAt));

    return rows.map((row: any) => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
    }));
  }
}
