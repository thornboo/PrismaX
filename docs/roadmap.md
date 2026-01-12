# Development Roadmap

> This document describes PrismaX version planning and development milestones

---

## Version Overview

```
v0.1.0 (Web MVP)      v0.2.0 (Desktop)    v0.3.0              v0.4.0              v1.0.0
────────────────────────────────────────────────────────────────────────────────────────►
   │                     │                   │                   │                   │
   │ Basic Chat          │ Desktop Shell     │ Knowledge RAG     │ Agent System      │ Release
   │ Multi-model         │ IPC/Permissions   │ Doc Upload/Parse  │ Tool Calling      │ Plugin Market
   │ Session Mgmt        │ Auto-update (opt) │ Vector Search     │ MCP Protocol      │ Cloud Sync
   │ Web Persistence     │ Desktop Storage   │ Context Enhance   │ Built-in Tools    │ Mobile
   │                     │                   │                   │ Plugin System     │
   └─ 4-6 weeks          └─ 3-5 weeks        └─ 4-6 weeks        └─ 6-8 weeks        └─ Ongoing
```

---

## v0.1.0 - Web MVP

**Goal:** A functional Web AI chat application to validate core architecture

**Estimated Duration:** 4-6 weeks

### Feature Scope

| Feature             | Priority | Description                                        |
| ------------------- | -------- | -------------------------------------------------- |
| Basic Chat          | P0       | Single/multi-turn conversation, streaming response |
| Multi-model Support | P0       | OpenAI, Claude, Ollama                             |
| Session Management  | P0       | Create, delete, rename, history                    |
| Web Persistence     | P0       | PostgreSQL for sessions and messages               |
| API Key Management  | P0       | Secure storage, multiple providers                 |
| Basic Settings      | P1       | Theme toggle, default model, temperature           |
| Markdown Rendering  | P1       | Code highlighting, math formulas                   |
| Message Actions     | P1       | Copy, regenerate, edit                             |

### Development Plan

#### Week 1-2: Project Foundation

- [ ] Monorepo initialization (pnpm + Turbo)
- [ ] Next.js Web app initialization
- [ ] tRPC basic framework setup
- [ ] Basic UI framework (shadcn/ui)
- [ ] PostgreSQL + Drizzle ORM integration (Schema + migrations)
- [ ] State management (Zustand)

#### Week 3-4: Core Features

- [ ] AI SDK wrapper (OpenAI, Claude, Ollama)
- [ ] Streaming response handling
- [ ] Session CRUD
- [ ] Message list rendering
- [ ] API Key secure storage

#### Week 5-6: Polish Experience

- [ ] Markdown rendering (code highlighting)
- [ ] Settings page
- [ ] Theme toggle
- [ ] Message actions (copy, regenerate)
- [ ] Docker deployment testing (dev/prod)

---

## v0.2.0 - Desktop (Electron)

**Goal:** Provide a distributable desktop application shell while reusing Web UI

**Estimated Duration:** 3-5 weeks

### Feature Scope

| Feature                            | Description                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Electron Shell                     | Main process/preload/window management                                          |
| Renderer Reuse                     | Reuse `apps/web` as renderer (dev: load dev server, prod: load build artifacts) |
| IPC/Permission Boundary            | Main process capabilities exposed via IPC with strict permission control        |
| Auto-update (optional)             | Keep toggle available, ensure MVP path is controllable                          |
| Desktop Storage Adapter (optional) | Optional SQLite for desktop (isolated from Web data layer)                      |

---

## v0.3.0 - Knowledge Base

**Goal:** Support document upload and RAG retrieval enhancement

**Estimated Duration:** 4-6 weeks

### Feature Scope

| Feature                   | Description                               |
| ------------------------- | ----------------------------------------- |
| Document Upload           | Support PDF, TXT, MD, DOCX formats        |
| Document Parsing          | Text extraction and intelligent chunking  |
| Vector Embedding          | Local embedding model or API              |
| Vector Storage            | SQLite + sqlite-vss                       |
| RAG Retrieval             | Similarity search and context enhancement |
| Knowledge Base Management | Create, delete, document management UI    |

### Development Plan

- [ ] Document upload component
- [ ] Document parsers (PDF, DOCX, etc.)
- [ ] Text chunking strategy
- [ ] Embedding model integration
- [ ] Vector database integration
- [ ] Retrieval API implementation
- [ ] RAG flow integration
- [ ] Knowledge base management UI

---

## v0.4.0 - Agent System

**Goal:** Support tool calling and Agent capabilities

**Estimated Duration:** 6-8 weeks

### Feature Scope

| Feature                | Description                           |
| ---------------------- | ------------------------------------- |
| Tool Calling Framework | Function Calling support              |
| Built-in Tools         | Web search, URL fetch, code execution |
| MCP Protocol           | Model Context Protocol client         |
| Agent Runtime          | ReAct mode execution engine           |
| Plugin System          | Basic plugin architecture             |
| Plugin API             | Tool, UI, Storage API                 |

### Development Plan

- [ ] Tool definition and registration mechanism
- [ ] Tool executor
- [ ] Built-in tools implementation
- [ ] MCP client
- [ ] Agent runtime
- [ ] Plugin loader
- [ ] Plugin sandbox
- [ ] Plugin API implementation

---

## v1.0.0 - Official Release

**Goal:** Feature-complete, stable and reliable official version

### Feature Scope

| Feature                  | Description                              |
| ------------------------ | ---------------------------------------- |
| Plugin Marketplace       | Plugin discovery, installation, updates  |
| Cloud Sync               | Optional data synchronization service    |
| Web Version              | Browser access support                   |
| Assistant System         | Preset and custom assistants             |
| Multi-language           | Internationalization support             |
| Performance Optimization | Startup speed, memory usage optimization |

### Future Plans

- Mobile support (React Native)
- Team collaboration features
- Enterprise edition features
- API open platform

---

## Tech Stack Versions

| Dependency     | Version | Notes             |
| -------------- | ------- | ----------------- |
| Node.js        | 20 LTS  | Long-term support |
| pnpm           | 10.x    | Package manager   |
| Turbo          | 2.x     | Monorepo build    |
| Electron       | 30.x    | Latest stable     |
| Next.js        | 15.x    | App Router        |
| React          | 19.x    | Stable            |
| TypeScript     | 5.4+    | Latest features   |
| Zustand        | 4.x     | State management  |
| Drizzle ORM    | 0.30+   | Database ORM      |
| better-sqlite3 | 11.x    | SQLite driver     |
| shadcn/ui      | latest  | UI components     |
| Tailwind CSS   | 3.4+    | Styling           |

---

## Milestone Checkpoints

### MVP Release Checklist

- [ ] Core features complete
- [ ] No blocking bugs
- [ ] Basic documentation complete
- [ ] macOS / Windows / Linux packaging tested
- [ ] Performance benchmarks

### Official Release Checklist

- [ ] Feature completeness verified
- [ ] Security audit passed
- [ ] Performance optimization complete
- [ ] User documentation complete
- [ ] Auto-update mechanism
- [ ] Error reporting mechanism
