# Cross-Platform Adaptation Design

> This document describes the PrismaX Web/Desktop cross-platform adaptation architecture

---

## Overview

PrismaX adopts a **Web-first** strategy:
1. v0.1.0 implements Web version first to validate core architecture
2. v0.2.0 Desktop version reuses Web rendering layer, wrapped in Electron shell

To maximize code reuse, abstraction layers need to be designed for key modules.

---

## Architecture Strategy

### Desktop Reuses Web Rendering Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/desktop (Electron)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Main Process                        │  │
│  │  - Window management                                   │  │
│  │  - IPC handling                                        │  │
│  │  - System integration (tray, shortcuts, auto-update)   │  │
│  │  - Local capabilities (filesystem, Keychain, SQLite)   │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │ IPC                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Renderer Process                     │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              apps/web (Next.js)                 │  │  │
│  │  │  - Dev: load http://localhost:3000              │  │  │
│  │  │  - Prod: load build artifacts                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Platform Detection

```typescript
// packages/shared/src/platform.ts
export type Platform = 'web' | 'desktop';

export function getPlatform(): Platform {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return 'desktop';
  }
  return 'web';
}

export function isDesktop(): boolean {
  return getPlatform() === 'desktop';
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}
```

---

## Data Layer Abstraction

### Database Adapter Interface

```typescript
// packages/database/src/adapter.ts
export interface DatabaseAdapter {
  // Conversations
  conversations: ConversationRepository;
  // Messages
  messages: MessageRepository;
  // Settings
  settings: SettingsRepository;
  // API Keys
  apiKeys: APIKeyRepository;
  // Knowledge bases (later)
  knowledgeBases?: KnowledgeBaseRepository;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  migrate(): Promise<void>;
}

// Repository interface example
export interface ConversationRepository {
  findAll(userId?: string): Promise<Conversation[]>;
  findById(id: string): Promise<Conversation | null>;
  create(data: CreateConversationInput): Promise<Conversation>;
  update(id: string, data: UpdateConversationInput): Promise<Conversation>;
  delete(id: string): Promise<void>;
}

export interface MessageRepository {
  findByConversation(conversationId: string): Promise<Message[]>;
  create(data: CreateMessageInput): Promise<Message>;
  update(id: string, data: UpdateMessageInput): Promise<Message>;
  delete(id: string): Promise<void>;
  deleteByConversation(conversationId: string): Promise<void>;
}
```

### PostgreSQL Adapter (Web)

```typescript
// packages/database/src/adapters/postgres.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool, { schema });
  }

  conversations = {
    findAll: async (userId?: string) => {
      let query = this.db.select().from(schema.conversations);
      if (userId) {
        query = query.where(eq(schema.conversations.userId, userId));
      }
      return query.orderBy(desc(schema.conversations.updatedAt));
    },

    findById: async (id: string) => {
      const [result] = await this.db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id));
      return result || null;
    },

    create: async (data: CreateConversationInput) => {
      const [result] = await this.db
        .insert(schema.conversations)
        .values({
          id: generateId(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return result;
    },

    update: async (id: string, data: UpdateConversationInput) => {
      const [result] = await this.db
        .update(schema.conversations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.conversations.id, id))
        .returning();
      return result;
    },

    delete: async (id: string) => {
      await this.db
        .delete(schema.conversations)
        .where(eq(schema.conversations.id, id));
    },
  };

  // ... other repository implementations

  async connect() {
    await this.pool.connect();
  }

  async disconnect() {
    await this.pool.end();
  }

  async migrate() {
    // Use drizzle-kit migration
  }
}
```

### SQLite Adapter (Desktop)

```typescript
// packages/database/src/adapters/sqlite.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema/sqlite';

export class SQLiteAdapter implements DatabaseAdapter {
  private sqlite: Database.Database;
  private db: ReturnType<typeof drizzle>;

  constructor(dbPath: string) {
    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite, { schema });
  }

  conversations = {
    findAll: async () => {
      return this.db
        .select()
        .from(schema.conversations)
        .orderBy(desc(schema.conversations.updatedAt))
        .all();
    },

    findById: async (id: string) => {
      const result = this.db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id))
        .get();
      return result || null;
    },

    create: async (data: CreateConversationInput) => {
      const id = generateId();
      const now = new Date().toISOString();
      this.db.insert(schema.conversations).values({
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      }).run();
      return this.conversations.findById(id);
    },

    // ... other methods
  };

  async connect() {
    // SQLite doesn't need explicit connection
  }

  async disconnect() {
    this.sqlite.close();
  }

  async migrate() {
    // Use drizzle-kit migration
  }
}
```

### Adapter Factory

```typescript
// packages/database/src/index.ts
import { getPlatform } from '@prismax/shared';

let adapter: DatabaseAdapter | null = null;

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (adapter) return adapter;

  const platform = getPlatform();

  if (platform === 'desktop') {
    const { SQLiteAdapter } = await import('./adapters/sqlite');
    const dbPath = await window.electronAPI.getDbPath();
    adapter = new SQLiteAdapter(dbPath);
  } else {
    const { PostgresAdapter } = await import('./adapters/postgres');
    adapter = new PostgresAdapter(process.env.DATABASE_URL!);
  }

  await adapter.connect();
  await adapter.migrate();

  return adapter;
}

export { DatabaseAdapter } from './adapter';
```

---

## API Key Storage Abstraction

### KeyStore Interface

```typescript
// packages/core/src/security/key-store.ts
export interface KeyStore {
  get(provider: string): Promise<string | null>;
  set(provider: string, key: string): Promise<void>;
  delete(provider: string): Promise<void>;
  list(): Promise<string[]>;
}
```

### Database KeyStore (Web)

```typescript
// packages/core/src/security/database-key-store.ts
import { getDatabase } from '@prismax/database';
import { encrypt, decrypt } from './crypto';

export class DatabaseKeyStore implements KeyStore {
  private encryptionKey: Buffer;

  constructor(encryptionKey: string) {
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  async get(provider: string): Promise<string | null> {
    const db = await getDatabase();
    const record = await db.apiKeys.findByProvider(provider);
    if (!record) return null;
    return decrypt(record.encryptedKey, this.encryptionKey);
  }

  async set(provider: string, key: string): Promise<void> {
    const db = await getDatabase();
    const encryptedKey = encrypt(key, this.encryptionKey);
    await db.apiKeys.upsert(provider, encryptedKey);
  }

  async delete(provider: string): Promise<void> {
    const db = await getDatabase();
    await db.apiKeys.delete(provider);
  }

  async list(): Promise<string[]> {
    const db = await getDatabase();
    const records = await db.apiKeys.findAll();
    return records.map((r) => r.provider);
  }
}
```

### Keychain KeyStore (Desktop)

```typescript
// packages/core/src/security/keychain-store.ts
// This implementation runs in Electron main process, exposed to renderer via IPC

export class KeychainStore implements KeyStore {
  private serviceName = 'PrismaX';

  async get(provider: string): Promise<string | null> {
    // Call main process via IPC
    return window.electronAPI.keychain.get(provider);
  }

  async set(provider: string, key: string): Promise<void> {
    return window.electronAPI.keychain.set(provider, key);
  }

  async delete(provider: string): Promise<void> {
    return window.electronAPI.keychain.delete(provider);
  }

  async list(): Promise<string[]> {
    return window.electronAPI.keychain.list();
  }
}

// Electron main process implementation
// apps/desktop/electron/ipc/keychain.ts
import keytar from 'keytar';

const SERVICE_NAME = 'PrismaX';

export const keychainHandlers = {
  'keychain:get': async (provider: string) => {
    return keytar.getPassword(SERVICE_NAME, provider);
  },

  'keychain:set': async (provider: string, key: string) => {
    await keytar.setPassword(SERVICE_NAME, provider, key);
  },

  'keychain:delete': async (provider: string) => {
    await keytar.deletePassword(SERVICE_NAME, provider);
  },

  'keychain:list': async () => {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    return credentials.map((c) => c.account);
  },
};
```

### KeyStore Factory

```typescript
// packages/core/src/security/index.ts
import { getPlatform } from '@prismax/shared';

let keyStore: KeyStore | null = null;

export async function getKeyStore(): Promise<KeyStore> {
  if (keyStore) return keyStore;

  const platform = getPlatform();

  if (platform === 'desktop') {
    const { KeychainStore } = await import('./keychain-store');
    keyStore = new KeychainStore();
  } else {
    const { DatabaseKeyStore } = await import('./database-key-store');
    keyStore = new DatabaseKeyStore(process.env.ENCRYPTION_KEY!);
  }

  return keyStore;
}
```

---

## Ollama Integration

### Web Considerations

Web calling local Ollama needs CORS handling:

```typescript
// packages/ai-sdk/src/providers/ollama/index.ts
export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private useProxy: boolean;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    // Web needs server-side proxy
    this.useProxy = getPlatform() === 'web';
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const url = this.useProxy
      ? '/api/ollama/chat'  // Server-side proxy
      : `${this.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'llama3',
        messages,
        stream: false,
      }),
    });

    return response.json();
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<ChatChunk> {
    const url = this.useProxy
      ? '/api/ollama/chat'
      : `${this.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'llama3',
        messages,
        stream: true,
      }),
    });

    // Parse streaming response
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter(Boolean);

      for (const line of lines) {
        const data = JSON.parse(line);
        yield {
          type: 'text',
          content: data.message?.content || '',
        };
      }
    }
  }
}
```

### Web Proxy Route

```typescript
// apps/web/src/app/api/ollama/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (body.stream) {
    // Forward streaming response
    return new NextResponse(response.body, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
```

### Desktop Direct Connection

Desktop can directly call local Ollama without proxy:

```typescript
// In Desktop environment, OllamaProvider's useProxy is false
// Directly requests http://localhost:11434
```

---

## IPC Communication Design

### Preload Script

```typescript
// apps/desktop/electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform identifier
  platform: 'desktop',

  // Database path
  getDbPath: () => ipcRenderer.invoke('db:getPath'),

  // Keychain operations
  keychain: {
    get: (provider: string) => ipcRenderer.invoke('keychain:get', provider),
    set: (provider: string, key: string) =>
      ipcRenderer.invoke('keychain:set', provider, key),
    delete: (provider: string) => ipcRenderer.invoke('keychain:delete', provider),
    list: () => ipcRenderer.invoke('keychain:list'),
  },

  // Filesystem (for knowledge base later)
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, data: string) =>
      ipcRenderer.invoke('fs:writeFile', path, data),
    selectFile: (options: OpenDialogOptions) =>
      ipcRenderer.invoke('fs:selectFile', options),
  },

  // Window control
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
});
```

### Type Declarations

```typescript
// packages/shared/src/types/electron.d.ts
interface ElectronAPI {
  platform: 'desktop';
  getDbPath: () => Promise<string>;
  keychain: {
    get: (provider: string) => Promise<string | null>;
    set: (provider: string, key: string) => Promise<void>;
    delete: (provider: string) => Promise<void>;
    list: () => Promise<string[]>;
  };
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, data: string) => Promise<void>;
    selectFile: (options: OpenDialogOptions) => Promise<string[] | null>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
```

---

## Environment Variables

### Web

```bash
# .env.local (Web)
DATABASE_URL=postgresql://user:pass@localhost:5432/prismax
ENCRYPTION_KEY=your-32-byte-hex-key
OLLAMA_URL=http://localhost:11434
```

### Desktop

```bash
# Desktop configuration mostly managed via electron-store
# Sensitive info stored via system Keychain
```

---

## Summary

| Module | Web | Desktop |
|--------|-----|---------|
| Database | PostgreSQL | SQLite |
| API Key Storage | Encrypted in database | System Keychain |
| Ollama | Server-side proxy | Direct connection |
| Filesystem | Server-side handling | IPC to main process |
| Rendering Layer | Next.js | Reuse Web |
