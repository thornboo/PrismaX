// Electron API 类型定义
export interface ElectronAPI {
  system: {
    getAppVersion: () => Promise<string>;
    checkUpdate: () => Promise<{ hasUpdate: boolean; version?: string; downloadUrl?: string }>;
    openExternal: (url: string) => Promise<void>;
    minimize: () => Promise<void>;
    close: () => Promise<void>;
  };
  chat: {
    send: (input: {
      conversationId: string;
      content: string;
      modelId?: string;
    }) => Promise<{ requestId: string; error?: string }>;
    history: (conversationId: string) => Promise<{
      conversationId: string;
      messages: Array<{ id: string; role: string; content: string }>;
    }>;
    onToken: (callback: (payload: { requestId: string; token: string }) => void) => () => void;
    onDone: (callback: (payload: { requestId: string }) => void) => () => void;
    onError: (callback: (payload: { requestId: string; message: string }) => void) => () => void;
  };
  db: {
    getConversations: () => Promise<Conversation[]>;
    createConversation: (title?: string) => Promise<Conversation>;
    deleteConversation: (id: string) => Promise<void>;
    getMessages: (conversationId: string) => Promise<Message[]>;
  };
  settings: {
    get: <T>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown) => Promise<void>;
    getAll: () => Promise<Record<string, unknown>>;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
