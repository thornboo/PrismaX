import type {
  Conversation,
  CreateConversationInput,
  CreateFolderInput,
  CreateMessageInput,
  Folder,
  IChatRepository,
  Message,
} from "@prismax/core";
import { and, asc, eq, isNull } from "drizzle-orm";

import { conversations, folders, messages } from "../desktop/schema";

type DesktopDb = {
  insert: (table: unknown) => any;
  select: (...args: any[]) => any;
};

export class DesktopChatRepository implements IChatRepository {
  constructor(private readonly db: DesktopDb) {}

  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const now = new Date();

    await this.db.insert(folders).values({
      id: input.id,
      name: input.name,
      parentId: input.parentId,
      createdAt: now,
      updatedAt: now,
    });

    const rows = await this.db.select().from(folders).where(eq(folders.id, input.id)).limit(1);
    const row = rows[0];
    if (!row) throw new Error("DesktopChatRepository: failed to create folder");

    return {
      id: row.id,
      name: row.name,
      parentId: row.parentId ?? null,
      userId: input.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listFolders(input?: { userId?: string; parentId?: string | null }): Promise<Folder[]> {
    const parentId = input?.parentId;
    const where =
      parentId === undefined
        ? undefined
        : parentId === null
          ? isNull(folders.parentId)
          : eq(folders.parentId, parentId);

    const query = this.db.select().from(folders);
    const rows = where ? await query.where(where) : await query;

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId ?? null,
      userId: input?.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const now = new Date();

    await this.db.insert(conversations).values({
      id: input.id,
      folderId: input.folderId,
      title: input.title,
      createdAt: now,
      updatedAt: now,
    });

    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, input.id))
      .limit(1);

    const row = rows[0];
    if (!row) throw new Error("DesktopChatRepository: failed to create conversation");

    return {
      id: row.id,
      userId: input.userId,
      folderId: row.folderId ?? null,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getConversation(input: { id: string; userId?: string }): Promise<Conversation | null> {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, input.id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      userId: input.userId,
      folderId: row.folderId ?? null,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getConversations(input?: { userId?: string; folderId?: string | null }): Promise<Conversation[]> {
    const folderId = input?.folderId;
    const where =
      folderId === undefined
        ? undefined
        : folderId === null
          ? isNull(conversations.folderId)
          : eq(conversations.folderId, folderId);

    const query = this.db.select().from(conversations);
    const rows = where ? await query.where(where) : await query;

    return rows.map((row: any) => ({
      id: row.id,
      userId: input?.userId,
      folderId: row.folderId ?? null,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async addMessage(input: CreateMessageInput & { userId?: string }): Promise<Message> {
    const now = new Date();

    await this.db.insert(messages).values({
      id: input.id,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      createdAt: now,
    });

    const rows = await this.db.select().from(messages).where(eq(messages.id, input.id)).limit(1);
    const row = rows[0];
    if (!row) throw new Error("DesktopChatRepository: failed to add message");

    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
    };
  }

  async getMessages(input: { conversationId: string; userId?: string }): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, input.conversationId))
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
