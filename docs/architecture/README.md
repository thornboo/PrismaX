# Architecture Documentation

> This directory contains PrismaX system architecture design documents

---

## Document Index

| Document                                 | Description                           |
| ---------------------------------------- | ------------------------------------- |
| [system.md](./system.md)                 | Overall system architecture design    |
| [database.md](./database.md)             | Database schema design                |
| [api.md](./api.md)                       | API interface design                  |
| [message-flow.md](./message-flow.md)     | Message processing flow design        |
| [plugin-system.md](./plugin-system.md)   | Plugin system architecture design     |
| [agent.md](./agent.md)                   | Agent system architecture design      |
| [security.md](./security.md)             | Security architecture design          |
| [cross-platform.md](./cross-platform.md) | Web/Desktop cross-platform adaptation |

---

## Architecture Overview

PrismaX adopts a **Monorepo + Multi-platform Sharing** architecture to maximize code reuse between Desktop and Web versions.

```
+-------------------------------------------------------------------------+
|                           PrismaX Architecture Overview                  |
+-------------------------------------------------------------------------+
|                                                                         |
|                        +---------------------+                          |
|                        |    User Interface   |                          |
|                        |  (React Components) |                          |
|                        +----------+----------+                          |
|                                   |                                     |
|                        +----------v----------+                          |
|                        |   State Management  |                          |
|                        |     (Zustand)       |                          |
|                        +----------+----------+                          |
|                                   |                                     |
|                        +----------v----------+                          |
|                        | Core Business Logic |                          |
|                        |   (packages/core)   |                          |
|                        +----------+----------+                          |
|                                   |                                     |
|              +--------------------+--------------------+                |
|              |                    |                    |                |
|   +----------v----------+ +-------v------+ +----------v----------+      |
|   |  Desktop Adapter    | |  AI SDK      | |    Web Adapter      |      |
|   |   (Electron IPC)    | | (providers)  | |   (tRPC + API)      |      |
|   +----------+----------+ +------+------+ +----------+----------+      |
|              |                   |                   |                  |
|   +----------v----------+        |        +----------v----------+      |
|   |   Local Storage     |        |        |   Server Storage    |      |
|   | - SQLite            |        |        | - PostgreSQL        |      |
|   | - Local filesystem  |        |        | - Redis             |      |
|   +---------------------+        |        | - Local/S3 files    |      |
|                                  |        +---------------------+      |
|                                  v                                      |
|                        +---------------------+                          |
|                        |    AI Model Service |                          |
|                        | OpenAI/Claude/Local |                          |
|                        +---------------------+                          |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## Design Principles

1. **Code Reuse** - Maximize shared code, reduce duplication
2. **Separation of Concerns** - Clear responsibilities for each layer, easy to maintain
3. **Type Safety** - Full-chain TypeScript, end-to-end type safety
4. **Extensibility** - Plugin-based design, easy to extend
5. **Performance First** - Streaming responses, lazy loading, cache optimization
