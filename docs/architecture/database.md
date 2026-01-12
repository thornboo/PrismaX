# Database Design

> This document describes the PrismaX database schema design

---

## Database Selection

| Scenario        | Database              | Description                                     |
| --------------- | --------------------- | ----------------------------------------------- |
| Web Version     | PostgreSQL + pgvector | Vector search support (Soft Delete enforced)    |
| Desktop Version | SQLite + sqlite-vss   | Lightweight local storage (Hard Delete allowed) |
| Cache           | Redis                 | Agent state, session cache                      |

### Data Deletion Strategy (Strict Compliance)

> To meet business requirements, we implement different deletion strategies for Web and Desktop.

- **Web Version (SaaS)**:
  - **User Action**: "Delete" marks the record as `deleted_at = NOW()`. Data is invisible to user but retained in DB.
  - **Admin Action**: Only System Administrators can perform physical deletion via Admin Panel.
  - **Reason**: Data compliance and auditing.

- **Desktop Version (Local)**:
  - **User Action**: "Delete" performs physical `DELETE FROM table`.
  - **Reason**: User privacy and disk space management.

---

## Web Database Design (PostgreSQL)

### User Related

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  avatar VARCHAR(500),
  role VARCHAR(50) DEFAULT 'user',  -- 'admin' | 'user'
  status VARCHAR(50) DEFAULT 'active',  -- 'active' | 'pending' | 'disabled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(50) DEFAULT 'system',
  language VARCHAR(10) DEFAULT 'zh-CN',
  default_model VARCHAR(100),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### File Storage (Hybrid Strategy)

> Supports "Cloud Sync" (S3) and "Local Only" modes. Core Logic handles storage abstraction.

```sql
-- Files table (Universal attachment storage)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  storage_type VARCHAR(50) NOT NULL, -- 's3' | 'local'
  url VARCHAR(500), -- S3 URL or Local Path (encrypted if local)
  hash VARCHAR(64), -- SHA-256 for deduplication
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft Delete
);
```

### Conversation Related

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  model VARCHAR(100),
  system_prompt TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,  -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  model VARCHAR(100),
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  parent_id UUID REFERENCES messages(id),  -- For branching conversations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Folders table
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_folder_id ON conversations(folder_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

### Knowledge Base Related (Heavy Usage Optimization)

> Designed for heavy knowledge base usage scenarios (100+ documents per user).

**Optimization Strategy**:

1. **Vector Separation**: In Core Architecture, define `IVectorStore` interface. Web uses `pgvector`, but ready to switch to Qdrant/Milvus if scaling needed.
2. **Chunking Strategy**: Adaptive chunking based on content type (Code vs Text).

```sql
-- Knowledge bases table
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  chunk_size INTEGER DEFAULT 1000,
  chunk_overlap INTEGER DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft Delete
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size INTEGER,
  file_type VARCHAR(50),
  content TEXT,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table (vector storage)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimensions
  chunk_index INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector index
CREATE INDEX idx_document_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Indexes
CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id);
CREATE INDEX idx_documents_knowledge_base_id ON documents(knowledge_base_id);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
```

### Assistant Related

```sql
-- Assistants table
CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar VARCHAR(500),
  model VARCHAR(100),
  system_prompt TEXT,
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INTEGER,
  knowledge_base_ids UUID[] DEFAULT '{}',
  tools JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assistants_user_id ON assistants(user_id);
CREATE INDEX idx_assistants_is_public ON assistants(is_public);

-- Agent Core Memories (Native Memory Implementation)
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL, -- e.g., 'persona', 'human'
  content TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assistant_id, label)
);
```

### Model Configuration Related

```sql
-- Model providers configuration table
CREATE TABLE model_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,  -- 'openai' | 'anthropic' | 'ollama' | ...
  name VARCHAR(100),
  api_key_encrypted TEXT,  -- AES-256-GCM encrypted. Decrypted only in server memory for proxying.
  base_url VARCHAR(500),
  is_enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX idx_model_providers_user_id ON model_providers(user_id);
```

### Plugin Related

```sql
-- Installed plugins table
CREATE TABLE installed_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plugin_id VARCHAR(100) NOT NULL,
  name VARCHAR(100),
  version VARCHAR(50),
  is_enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plugin_id)
);
```

### System Settings

```sql
-- System settings table (admin configuration)
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Desktop Database Design (SQLite)

Desktop version uses SQLite with similar schema to Web version, but with these differences:

1. **No users table** - Desktop is single-user
2. **No vector extension** - Uses sqlite-vss or in-memory vector search
3. **Simplified permissions** - No RBAC needed

```sql
-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  model TEXT,
  system_prompt TEXT,
  folder_id TEXT,
  is_pinned INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  metadata TEXT DEFAULT '{}',
  parent_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Knowledge bases table
CREATE TABLE knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  chunk_size INTEGER DEFAULT 1000,
  chunk_overlap INTEGER DEFAULT 200,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Document chunks table
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding BLOB,  -- Vector stored as binary
  chunk_index INTEGER,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Assistants table
CREATE TABLE assistants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  model TEXT,
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER,
  knowledge_base_ids TEXT DEFAULT '[]',
  tools TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Agent Core Memories
CREATE TABLE agent_memories (
  id TEXT PRIMARY KEY,
  assistant_id TEXT REFERENCES assistants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  last_updated TEXT DEFAULT (datetime('now')),
  UNIQUE(assistant_id, label)
);

-- Model providers configuration table
CREATE TABLE model_providers (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  name TEXT,
  api_key_encrypted TEXT,
  base_url TEXT,
  is_enabled INTEGER DEFAULT 1,
  config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_conversations_folder_id ON conversations(folder_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_documents_knowledge_base_id ON documents(knowledge_base_id);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
```

---

## Drizzle ORM Schema

### Web Schema Example

```typescript
// packages/database/schema/users.ts
import { pgTable, uuid, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  avatar: varchar("avatar", { length: 500 }),
  role: varchar("role", { length: 50 }).default("user"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// packages/database/schema/conversations.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { folders } from "./folders";

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  model: varchar("model", { length: 100 }),
  systemPrompt: text("system_prompt"),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  isPinned: boolean("is_pinned").default(false),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// packages/database/schema/messages.ts
import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "cascade",
  }),
  role: varchar("role", { length: 50 }).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 100 }),
  tokensUsed: integer("tokens_used"),
  metadata: jsonb("metadata").default({}),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Data Migration Strategy

### Web Version

Use Drizzle Kit for database migrations:

```bash
# Generate migration files
pnpm drizzle-kit generate:pg

# Execute migrations
pnpm drizzle-kit push:pg
```

### Desktop Version

Use built-in migration scripts:

```typescript
// apps/desktop/main/database.ts
const migrations = [
  {
    version: 1,
    up: `
      CREATE TABLE conversations (...);
      CREATE TABLE messages (...);
    `,
  },
  {
    version: 2,
    up: `
      ALTER TABLE conversations ADD COLUMN is_archived INTEGER DEFAULT 0;
    `,
  },
];

function runMigrations(db: Database) {
  const currentVersion = db.pragma("user_version", { simple: true }) as number;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      db.exec(migration.up);
      db.pragma(`user_version = ${migration.version}`);
    }
  }
}
```
