export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Conversation = {
  id: string;
  userId?: string;
  folderId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageRole = "system" | "user" | "assistant" | (string & {});

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
};

export type CreateFolderInput = Pick<Folder, "id" | "name" | "parentId"> & {
  userId?: string;
};

export type CreateConversationInput = Pick<Conversation, "id" | "folderId" | "title"> & {
  userId?: string;
};

export type CreateMessageInput = Pick<Message, "id" | "conversationId" | "role" | "content">;

export interface IChatRepository {
  createFolder(input: CreateFolderInput): Promise<Folder>;
  listFolders(input?: { userId?: string; parentId?: string | null }): Promise<Folder[]>;

  createConversation(input: CreateConversationInput): Promise<Conversation>;
  getConversation(input: { id: string; userId?: string }): Promise<Conversation | null>;
  getConversations(input?: { userId?: string; folderId?: string | null }): Promise<Conversation[]>;

  addMessage(input: CreateMessageInput & { userId?: string }): Promise<Message>;
  getMessages(input: { conversationId: string; userId?: string }): Promise<Message[]>;
}
