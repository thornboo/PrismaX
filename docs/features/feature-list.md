# Feature List

> This document outlines the complete PrismaX feature list with priorities

---

## Feature Priority Planning

### P0 - Core Features (MVP)

Features that must be implemented in the first version:

| Feature | Description | Desktop | Web | Mobile |
|---------|-------------|---------|-----|--------|
| **Basic Chat** | Chat with AI models | Yes | Yes | Yes |
| **Multi-model Support** | OpenAI, Claude, local models, etc. | Yes | Yes | Yes |
| **Ollama Integration** | Local model support | Yes | Yes | - |
| **Session Management** | Create, delete, rename sessions | Yes | Yes | Yes |
| **Message Management** | Edit, delete, regenerate | Yes | Yes | Yes |
| **Streaming Response** | Real-time AI response display | Yes | Yes | Yes |
| **Markdown Rendering** | Code highlighting, tables, formulas | Yes | Yes | Yes |
| **Model Configuration** | API Key, endpoint configuration | Yes | Yes | Yes |
| **Theme Switching** | Light/dark theme | Yes | Yes | Yes |
| **Multi-language** | Chinese/English | Yes | Yes | Yes |
| **User Authentication** | Login, registration | - | Yes | Yes |
| **Data Persistence** | Local/server storage | Yes | Yes | Yes |

### P1 - Important Features

Features to implement in the second phase:

| Feature | Description | Desktop | Web | Mobile |
|---------|-------------|---------|-----|--------|
| **Knowledge Base RAG** | Document upload, vector search, Q&A | Yes | Yes | Yes |
| **File Upload** | Images, PDF, documents | Yes | Yes | Yes |
| **Cloud Sync** | Cross-device data synchronization | Yes | Yes | Yes |
| **Assistant Presets** | System prompt templates | Yes | Yes | Yes |
| **Keyboard Shortcuts** | Common operation shortcuts | Yes | Yes | - |
| **Search Function** | Session, message search | Yes | Yes | Yes |
| **Data Export** | Export conversation records | Yes | Yes | Yes |
| **Multi-user Management** | User management, permission control | - | Yes | - |

### P2 - Enhanced Features

Features to implement in the third phase:

| Feature | Description | Desktop | Web | Mobile |
|---------|-------------|---------|-----|--------|
| **Agent System** | Tool calling, automation | Yes | Yes | Yes |
| **MCP Protocol** | External tool integration | Yes | Yes | - |
| **Plugin System** | Third-party plugins | Yes | Yes | - |
| **Web Search** | Tavily/Brave search | Yes | Yes | Yes |
| **TTS/STT** | Voice input/output | Yes | Yes | Yes |
| **Topic Branching** | Conversation branch management | Yes | Yes | Yes |
| **Data Backup** | Auto backup, restore | Yes | Yes | Yes |
| **System Tray** | Background running, quick launch | Yes | - | - |
| **Auto Update** | Application auto-update | Yes | - | Yes |

### P3 - Nice to Have

Features to consider in future versions:

| Feature | Description | Desktop | Web | Mobile |
|---------|-------------|---------|-----|--------|
| **Assistant Marketplace** | Community assistant sharing | Yes | Yes | Yes |
| **Plugin Marketplace** | Community plugin sharing | Yes | Yes | - |
| **Multi-window** | Multiple session windows | Yes | - | - |
| **Team Collaboration** | Shared sessions, knowledge bases | - | Yes | - |
| **API Service** | External API provision | - | Yes | - |
| **Monitoring Dashboard** | Usage statistics, cost analysis | - | Yes | - |

---

## Detailed Feature Design

### 1. Basic Chat Features

#### 1.1 Session Management

**Features**:
- Auto-group by time (Today, Yesterday, Earlier)
- Manual categorization (folders)
- Search and filter support
- Batch operations (delete, move)
- Pin and favorite support
- Auto-generate session titles

#### 1.2 Message Interaction

**Features**:
- Complete Markdown rendering
  - Code highlighting (multi-language support)
  - Table rendering
  - Math formulas (LaTeX)
  - Mermaid diagrams
- Message operations
  - Copy message
  - Edit message
  - Delete message
  - Regenerate
- Streaming typing effect
- One-click code block copy
- Image preview and zoom
- Long message collapse

#### 1.3 Input Enhancement

**Features**:
- Multi-line input (Shift+Enter for newline)
- File drag-and-drop upload
- Paste images
- @mentions (switch models, reference knowledge bases)
- Quick commands (starting with /)
- History navigation (up/down arrows)

---

### 2. Multi-model Support

#### 2.1 Supported Model Providers

| Provider | Models | Priority |
|----------|--------|----------|
| **OpenAI** | GPT-4o, GPT-4, GPT-3.5 | P0 |
| **Anthropic** | Claude 3.5, Claude 3 | P0 |
| **Google** | Gemini Pro, Gemini Flash | P1 |
| **Alibaba Cloud** | Qwen | P1 |
| **DeepSeek** | DeepSeek Chat, Coder | P1 |
| **Ollama** | Llama, Mistral, other local models | P0 |
| **OpenRouter** | Aggregates multiple models | P1 |
| **Custom** | OpenAI-compatible endpoints | P0 |

#### 2.2 Model Configuration

**Features**:
- API Key configuration (encrypted storage)
- Custom endpoints
- Model parameter configuration (temperature, max tokens, etc.)
- Model group management
- Quick model switching

---

### 3. Knowledge Base RAG

#### 3.1 Knowledge Base Management

**Features**:
- Create/delete knowledge bases
- Knowledge base description
- Configure embedding model
- Configure chunking parameters

#### 3.2 Document Management

**Supported Formats**:

| Format | Description | Priority |
|--------|-------------|----------|
| Markdown | .md | P0 |
| Plain Text | .txt | P0 |
| PDF | .pdf | P0 |
| Word | .docx | P1 |
| Web Page | URL scraping | P1 |
| Code | Various programming languages | P2 |

**Features**:
- Document upload (drag-and-drop/select)
- Document preview
- Document deletion
- Processing status display
- Error notifications

#### 3.3 RAG Retrieval

**Flow**:
```
User question -> Question vectorization -> Similarity search -> Reranking -> Context assembly -> AI answer
```

**Features**:
- Similarity search (Top-K)
- Reranking (Reranker)
- Context window control
- Source citation display

---

### 4. Assistant Presets

#### 4.1 Assistant Configuration

**Configuration Items**:
- Name, description, avatar
- Default model
- System prompt
- Temperature, max tokens
- Associated knowledge bases
- Available tools

#### 4.2 Preset Assistants

| Assistant | Purpose |
|-----------|---------|
| General Assistant | Daily conversation |
| Code Expert | Programming assistance |
| Writing Assistant | Content creation |
| Translation Expert | Multi-language translation |
| Data Analyst | Data analysis |

---

### 5. Cloud Sync Feature

#### 5.1 Sync Scope

| Data Type | Synced |
|-----------|--------|
| Conversation records | Yes |
| Assistant configuration | Yes |
| Model configuration | Yes |
| Knowledge bases | Yes |
| App settings | Yes |

#### 5.2 Sync Strategy

- **Real-time sync**: Sync immediately after message sent
- **Incremental sync**: Only sync changed data
- **Conflict handling**: Latest modification wins
- **Offline support**: Store locally when offline, auto-sync when online

---

### 6. Keyboard Shortcuts

#### 6.1 Global Shortcuts (Desktop)

| Shortcut | Function |
|----------|----------|
| `Cmd/Ctrl + Shift + Space` | Show/hide window |
| `Cmd/Ctrl + N` | New session |
| `Cmd/Ctrl + W` | Close current session |
| `Cmd/Ctrl + ,` | Open settings |

#### 6.2 Chat Shortcuts

| Shortcut | Function |
|----------|----------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Cmd/Ctrl + Enter` | Send and create new session |
| `Up Arrow` | Edit previous message |
| `Cmd/Ctrl + R` | Regenerate |
| `Cmd/Ctrl + C` | Copy selected/last reply |
| `Cmd/Ctrl + K` | Quick model switch |
| `Escape` | Stop generation |

---

## Confirmed Decisions

| # | Decision Item | Conclusion |
|---|---------------|------------|
| 1 | Cloud sync | Required |
| 2 | Mobile | Required (later) |
| 3 | Ollama integration | Required |
| 4 | UI component library | shadcn/ui |
| 5 | Desktop framework | Electron |

## Pending Features

| # | Feature | Question |
|---|---------|----------|
| 1 | Team collaboration | Does Web version need team features? |
| 2 | Offline mode | Feature scope when desktop is offline? |
| 3 | Paid features | Any commercialization plans? |
