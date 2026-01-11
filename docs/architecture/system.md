# System Architecture

> This document describes the PrismaX system architecture design

---

## Layered Architecture

### 1. User Interface Layer (UI Layer)

**Location**: `packages/ui/` + `apps/*/components/`

**Responsibilities**:
- Render user interface
- Handle user interactions
- Responsive layout

**Tech Stack**:
- React 19 + TypeScript
- shadcn/ui + Radix UI
- Tailwind CSS
- Framer Motion (animations)

**Component Categories**:
```
packages/ui/
├── components/
│   ├── chat/              # Chat-related components
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatList.tsx
│   │   └── ...
│   │
│   ├── knowledge/         # Knowledge base components
│   │   ├── FileUpload.tsx
│   │   ├── DocumentList.tsx
│   │   └── ...
│   │
│   ├── settings/          # Settings components
│   │   ├── ModelConfig.tsx
│   │   ├── ThemeSwitch.tsx
│   │   └── ...
│   │
│   └── common/            # Common components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── ...
```

---

### 2. State Management Layer (State Layer)

**Location**: `packages/core/stores/`

**Responsibilities**:
- Manage application state
- Handle state changes
- State persistence

**Tech Stack**:
- Zustand
- Immer (immutable data updates)
- zustand/middleware (persistence)

**Store Design**:
```typescript
// Chat state
interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;

  // Actions
  createConversation: () => void;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => void;
}

// Settings state
interface SettingsStore {
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultModel: string;

  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: string) => void;
}

// Knowledge base state
interface KnowledgeStore {
  knowledgeBases: KnowledgeBase[];
  documents: Record<string, Document[]>;

  // Actions
  createKnowledgeBase: (name: string) => Promise<void>;
  uploadDocument: (kbId: string, file: File) => Promise<void>;
}
```

---

### 3. Core Business Logic Layer (Core Layer)

**Location**: `packages/core/`

**Responsibilities**:
- Encapsulate business logic
- Platform-agnostic core functionality
- Data processing and transformation

**Module Structure**:
```
packages/core/
├── chat/                  # Chat core logic
│   ├── conversation.ts    # Conversation management
│   ├── message.ts         # Message processing
│   └── streaming.ts       # Streaming response handling
│
├── knowledge/             # Knowledge base core logic
│   ├── embedding.ts       # Vectorization processing
│   ├── retrieval.ts       # Retrieval logic
│   └── chunking.ts        # Document chunking
│
├── agent/                 # Agent core logic
│   ├── runtime.ts         # Agent runtime
│   ├── tools.ts           # Tool definitions
│   └── planning.ts        # Task planning
│
├── mcp/                   # MCP protocol implementation
│   ├── client.ts          # MCP client
│   ├── server.ts          # MCP server
│   └── protocol.ts        # Protocol definitions
│
└── plugins/               # Plugin system
    ├── loader.ts          # Plugin loader
    ├── registry.ts        # Plugin registry
    └── types.ts           # Plugin type definitions
```

---

### 4. AI SDK Layer (AI Layer)

**Location**: `packages/ai-sdk/`

**Responsibilities**:
- Unified AI model calling interface
- Multi-provider support
- Streaming response handling

**Supported Model Providers**:
```
packages/ai-sdk/
├── providers/
│   ├── openai/            # OpenAI (GPT-4, GPT-3.5)
│   ├── anthropic/         # Anthropic (Claude)
│   ├── google/            # Google (Gemini)
│   ├── qwen/              # Alibaba Qwen
│   ├── deepseek/          # DeepSeek
│   ├── ollama/            # Ollama (local models)
│   ├── openrouter/        # OpenRouter (aggregator)
│   └── custom/            # Custom OpenAI-compatible endpoints
```

**Unified Interface Design**:
```typescript
interface AIProvider {
  // Basic chat
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  // Streaming chat
  chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<ChatChunk>;

  // Embedding
  embed(texts: string[], options?: EmbedOptions): Promise<number[][]>;

  // Model list
  listModels(): Promise<Model[]>;
}
```

---

### 5. Data Storage Layer (Storage Layer)

#### 5.1 Desktop Storage

**Tech Stack**:
- SQLite (better-sqlite3) - Structured data
- Local filesystem - File storage
- electron-store - Configuration storage

#### 5.2 Web Storage

**Tech Stack**:
- PostgreSQL + pgvector - Structured data + Vector search
- Redis - Cache + Agent state
- Local filesystem / S3 - File storage

---

### 6. Platform Adaptation Layer (Platform Layer)

#### 6.1 Desktop Adaptation (Electron)

```
apps/desktop/
├── main/                  # Main process
│   ├── index.ts           # Entry point
│   ├── window.ts          # Window management
│   ├── ipc.ts             # IPC communication
│   ├── tray.ts            # System tray
│   ├── updater.ts         # Auto update
│   └── database.ts        # SQLite operations
│
├── preload/               # Preload scripts
│   └── index.ts           # Expose secure APIs
│
└── renderer/              # Renderer process (Next.js)
```

**IPC Communication Design**:
```typescript
// preload/index.ts
contextBridge.exposeInMainWorld('electron', {
  // Database operations
  db: {
    query: (sql: string, params?: any[]) =>
      ipcRenderer.invoke('db:query', sql, params),
    run: (sql: string, params?: any[]) =>
      ipcRenderer.invoke('db:run', sql, params),
  },

  // File operations
  fs: {
    readFile: (path: string) =>
      ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, data: any) =>
      ipcRenderer.invoke('fs:writeFile', path, data),
    selectFile: (options?: any) =>
      ipcRenderer.invoke('fs:selectFile', options),
  },

  // System operations
  system: {
    getAppPath: () => ipcRenderer.invoke('system:getAppPath'),
    openExternal: (url: string) =>
      ipcRenderer.invoke('system:openExternal', url),
  },
});
```

#### 6.2 Web Adaptation (Next.js)

```
apps/web/
├── app/                   # App Router
│   ├── (auth)/            # Auth-related pages
│   ├── (main)/            # Main app pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
│
├── server/                # Server-side logic
│   ├── routers/           # tRPC routers
│   ├── services/          # Business services
│   └── middleware/        # Middleware
│
└── lib/                   # Utilities
```

---

## Data Flow Design

### Chat Message Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───▶│  UI     │───▶│  Store  │───▶│  Core   │───▶│ AI SDK  │
│  Input  │    │ Layer   │    │ Action  │    │ Process │    │  Call   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                                  │
                                                                  ▼
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   UI    │◀───│  Store  │◀───│  Core   │◀───│ Stream  │◀───│ AI Model│
│ Update  │    │ Update  │    │  Parse  │    │Response │    │ Service │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Knowledge Base Retrieval Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───▶│ Embed   │───▶│Similarity│───▶│ Rerank  │
│  Query  │    │  Query  │    │ Search  │    │         │
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                  │
                                                  ▼
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   AI    │◀───│ Prompt  │◀───│ Context │◀───│  Top-K  │
│ Answer  │    │  Build  │    │ Assembly│    │ Results │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

---

## Deployment Architecture

### Desktop Deployment

```
┌─────────────────────────────────────────┐
│           User Computer                  │
│  ┌───────────────────────────────────┐  │
│  │         PrismaX Desktop           │  │
│  │  ┌─────────────┐ ┌─────────────┐  │  │
│  │  │  Electron   │ │   SQLite    │  │  │
│  │  │Main Process │ │  Database   │  │  │
│  │  └─────────────┘ └─────────────┘  │  │
│  │  ┌─────────────┐ ┌─────────────┐  │  │
│  │  │  Chromium   │ │ Local File  │  │  │
│  │  │  Renderer   │ │  Storage    │  │  │
│  │  └─────────────┘ └─────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         External AI Services            │
│  • OpenAI API                           │
│  • Claude API                           │
│  • Local Ollama                         │
└─────────────────────────────────────────┘
```

### Web Deployment (Docker)

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   prismax-web                        │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │
│  │  │  Next.js    │ │   tRPC      │ │   Static    │   │    │
│  │  │    App      │ │    API      │ │   Files     │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Redis    │  │Local Storage│         │
│  │  (pgvector) │  │             │  │  (Volume)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Design

### Authentication & Authorization

**Web Version**:
- Better Auth for user authentication
- JWT Token session management
- Role-Based Access Control (RBAC)

**Desktop Version**:
- Optional local password protection
- Encrypted data storage

### Data Security

- API Key encrypted storage
- Sensitive data not logged
- HTTPS enforced (Web version)

### Input Validation

- Zod Schema validation for all inputs
- SQL injection protection (ORM parameterized queries)
- XSS protection (React auto-escaping)

---

## Performance Optimization

### Frontend Optimization

- React Server Components (reduce client JS)
- Code splitting (dynamic imports)
- Image optimization (next/image)
- Virtual lists (long message lists)

### Backend Optimization

- Database connection pooling
- Redis caching for hot data
- Streaming responses (reduce time to first byte)
- Vector search indexing (HNSW)

### Desktop Optimization

- Lazy loading modules
- Local caching
- Background preloading
