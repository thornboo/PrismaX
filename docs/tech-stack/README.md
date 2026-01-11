# Tech Stack Documentation

> This directory contains PrismaX tech stack analysis and decision documents

---

## Document Index

| Document | Description |
|----------|-------------|
| [comparison.md](./comparison.md) | Electron vs Tauri comparison |
| [details.md](./details.md) | Detailed tech stack for each layer |
| [project-structure.md](./project-structure.md) | Monorepo project structure |

---

## Final Decisions

### Confirmed Tech Stack

| Category | Choice | Notes |
|----------|--------|-------|
| **Desktop Framework** | Electron | Mature ecosystem, consistent cross-platform UI |
| **Web Framework** | Next.js 15 | App Router + RSC |
| **UI Components** | shadcn/ui + Radix | Highly customizable |
| **Styling** | Tailwind CSS | Atomic CSS |
| **State Management** | Zustand | Lightweight |
| **API Layer** | tRPC | End-to-end type safety |
| **Database** | PostgreSQL + pgvector | Vector search |
| **Local Database** | SQLite | Desktop version |
| **Mobile** | React Native (later) | Code reuse |

### Decision Rationale

Main reasons for choosing **Electron + Next.js**:

1. **Highest code reuse** - 95%+ code sharing, lowest maintenance cost
2. **Highest development efficiency** - Pure TypeScript full-stack, no need to learn Rust
3. **Consistent cross-platform UI** - Unified Chromium rendering, no WebView differences
4. **Most mature ecosystem** - Almost all problems have existing solutions
5. **Mobile extension** - React Native can reuse significant React code
