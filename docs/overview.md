# PrismaX Project Overview

> Next-generation AI chat assistant — Feature-rich, Flexible deployment, Excellent experience

---

## Vision

Build a feature-rich, flexibly deployable AI chat assistant application that supports:

- **Desktop App** - Local execution, offline capable, fast startup
- **Web Service** - Browser access, multi-user support, team collaboration
- **Mobile App** - iOS/Android support (planned)
- **Docker Deployment** - One-click deployment, simple maintenance

---

## Core Features

### Conversation Capabilities

- Multi-model chat (OpenAI, Claude, Gemini, local models, etc.)
- Streaming responses with real-time display
- Full Markdown rendering (code highlighting, tables, formulas, diagrams)
- Multi-turn conversation context management
- Conversation branching and history management

### Knowledge Enhancement

- Knowledge Base RAG (vector search, document Q&A)
- Multi-format document support (PDF, Markdown, Word, etc.)
- Intelligent chunking and retrieval optimization

### Extension Capabilities

- Agent system (tool calling, automated tasks)
- MCP protocol support (Model Context Protocol)
- Plugin system (third-party extensions)
- Ollama local model integration

### Deployment Options

- Desktop app (Windows/macOS/Linux)
- Web service (Docker one-click deployment)
- Multi-user support and permission management
- Cloud sync (cross-device data synchronization)

### User Experience

- Fast startup, smooth interaction
- Beautiful modern interface design
- Dark/Light themes
- Multi-language support
- Rich keyboard shortcuts

---

## Tech Stack

| Category | Technology | Description |
|----------|------------|-------------|
| Frontend Framework | Next.js 15 + React 19 | App Router + Server Components |
| UI Components | shadcn/ui + Radix UI | Highly customizable, no style lock-in |
| Styling | Tailwind CSS | Atomic CSS |
| State Management | Zustand | Lightweight, TypeScript friendly |
| Desktop Framework | Electron | Cross-platform desktop apps |
| Backend | Next.js API Routes + tRPC | End-to-end type safety |
| Database | PostgreSQL + pgvector | Vector search support |
| Local Database | SQLite | Lightweight storage for desktop |
| Cache | Redis | Agent state management |

For detailed tech stack analysis, see the [tech-stack](./tech-stack/) directory.

---

## Documentation Index

| Directory | Description |
|-----------|-------------|
| [tech-stack](./tech-stack/) | Technology comparison and decisions |
| [architecture](./architecture/) | System architecture and database design |
| [features](./features/) | Feature list and priorities |
| [guides](./guides/) | Development environment and code standards |

---

## Project Status

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements Analysis | Completed | Feature planning finalized |
| Tech Stack Selection | Completed | Electron + Next.js |
| Architecture Design | In Progress | Detailed design ongoing |
| Development | Pending | - |
| Testing & Deployment | Pending | - |

---

## Confirmed Decisions

| # | Decision | Conclusion | Notes |
|---|----------|------------|-------|
| 1 | Desktop Framework | Electron | Mature ecosystem, UI consistency |
| 2 | UI Component Library | shadcn/ui | Highly customizable |
| 3 | Mobile Support | Required (later) | React Native |
| 4 | Local Models | Ollama integration | P0 feature |
| 5 | Cloud Sync | Required | Cross-device data sync |
