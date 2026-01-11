# Tech Stack Details

> This document details the technology choices for each layer of PrismaX

---

## Frontend Tech Stack

| Category | Choice | Version | Notes |
|----------|--------|---------|-------|
| Framework | Next.js | 15+ | App Router + Server Components |
| UI Framework | React | 19 | Latest version |
| UI Components | shadcn/ui + Radix | - | Highly customizable, no style lock-in |
| Styling | Tailwind CSS | 3.x | Atomic CSS, high dev efficiency |
| State Management | Zustand | 4.x | Lightweight, TypeScript friendly |
| Data Fetching | TanStack Query | 5.x | Caching, retry, optimistic updates |
| Form Handling | React Hook Form + Zod | - | Type-safe form validation |
| i18n | next-intl | - | Native Next.js integration |
| Icons | Lucide React | - | Open source icon library |
| Animation | Framer Motion | - | Smooth animations |

### Why shadcn/ui?

| Comparison | shadcn/ui | Ant Design | Material UI |
|------------|-----------|------------|-------------|
| Customizability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Bundle Size | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Style Lock-in | None | Yes | Yes |
| Learning Curve | Low | Medium | Medium |
| Design Style | Modern minimal | Enterprise | Material |

---

## Backend Tech Stack

| Category | Choice | Notes |
|----------|--------|-------|
| Framework | Next.js API Routes | Integrated with frontend, high dev efficiency |
| API Layer | tRPC | End-to-end type safety, no manual API docs |
| Database ORM | Drizzle ORM | Lightweight, type-safe, performant |
| Database | PostgreSQL + pgvector | Vector search support, required for knowledge base |
| Cache | Redis | Agent Runtime state management |
| Authentication | Better Auth | Lightweight auth solution |
| File Storage | Local filesystem / S3 | Configurable |

### Why tRPC?

| Comparison | tRPC | REST API | GraphQL |
|------------|------|----------|---------|
| Type Safety | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| Dev Efficiency | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Learning Curve | Low | Low | High |
| Ecosystem | Medium | High | High |
| Use Case | Full-stack TypeScript | General | Complex queries |

### Why Drizzle ORM?

| Comparison | Drizzle | Prisma | TypeORM |
|------------|---------|--------|---------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Type Safety | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Bundle Size | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| SQL Control | Full control | Abstracted | Partial control |
| Learning Curve | Low | Low | Medium |

---

## Desktop Tech Stack

| Category | Choice | Notes |
|----------|--------|-------|
| Framework | Electron | Cross-platform desktop apps |
| Bundler | electron-builder | Multi-platform packaging |
| Local Database | SQLite (better-sqlite3) | Lightweight local storage |
| Auto Update | electron-updater | Application auto-update |
| IPC | Electron IPC | Main-renderer process communication |

### Electron Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron App                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Main Process                       │   │
│  │  • Window management                                 │   │
│  │  • System tray                                       │   │
│  │  • Local database (SQLite)                           │   │
│  │  • File system operations                            │   │
│  │  • Auto update                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │ IPC                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Preload Script                       │   │
│  │  • Secure API exposure                               │   │
│  │  • contextBridge                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Renderer Process                     │   │
│  │  • Next.js app                                       │   │
│  │  • React components                                  │   │
│  │  • User interface                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile Tech Stack (Planned)

| Category | Choice | Notes |
|----------|--------|-------|
| Framework | React Native | Cross-platform mobile apps |
| Navigation | React Navigation | Route management |
| State Management | Zustand | Consistent with Web |
| UI Components | Custom + NativeWind | Tailwind style |
| Local Storage | SQLite (expo-sqlite) | Local data |

---

## Development Toolchain

| Category | Choice | Notes |
|----------|--------|-------|
| Package Manager | pnpm | Fast, saves disk space |
| Build Tool | Turbo | Monorepo build optimization |
| Code Standards | ESLint + Prettier | Unified code style |
| Type Checking | TypeScript 5.x | Strict mode |
| Testing | Vitest + Playwright | Unit + E2E testing |
| Git Hooks | Husky + lint-staged | Pre-commit checks |
| Version Management | Changesets | Release management |

---

## AI Tech Stack

| Category | Choice | Notes |
|----------|--------|-------|
| AI SDK | Vercel AI SDK | Streaming response handling |
| Vector Database | pgvector | PostgreSQL extension |
| Embedding | OpenAI / Qwen | Text vectorization |
| Local Models | Ollama | Local LLM runtime |

---

## Deployment

| Category | Choice | Notes |
|----------|--------|-------|
| Containerization | Docker | Application containerization |
| Orchestration | Docker Compose | Multi-container orchestration |
| Database | pgvector/pgvector:pg17 | PostgreSQL + vector extension |
| Cache | redis:7-alpine | Redis cache |
