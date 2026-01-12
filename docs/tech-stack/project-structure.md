# Project Structure

> This document describes the PrismaX Monorepo project structure

---

## Directory Structure

```
PrismaX/
├── apps/                        # Application layer
│   ├── web/                     # Web version (priority)
│       ├── src/
│       │   ├── app/             # App Router pages
│       │   │   ├── (auth)/      # Auth-related pages
│       │   │   ├── (main)/      # Main app pages
│       │   │   └── api/         # API routes
│       │   ├── server/          # Server-side logic
│       │   │   ├── routers/     # tRPC routers
│       │   │   └── services/    # Business services
│       │   └── components/
│       └── package.json
│
│   └── desktop/                 # Electron desktop shell (later)
│       ├── electron/            # Electron main process
│       │   ├── main.ts          # Main process entry
│       │   ├── preload.ts       # Preload script
│       │   ├── ipc/             # IPC handlers
│       │   │   ├── index.ts
│       │   │   ├── chat.ts
│       │   │   ├── settings.ts
│       │   │   └── database.ts
│       │   ├── window.ts        # Window management
│       │   ├── tray.ts          # System tray
│       │   ├── updater.ts       # Auto update
│       │   └── store.ts         # Local config storage
│       ├── resources/           # Resource files
│       │   └── icons/
│       ├── electron-builder.json
│       └── package.json
│
├── packages/                    # Shared packages
│   ├── ui/                      # Shared UI component library
│   │   ├── components/          # Common components
│   │   │   ├── chat/            # Chat components
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   └── ChatList.tsx
│   │   │   ├── knowledge/       # Knowledge base components
│   │   │   ├── settings/        # Settings components
│   │   │   └── common/          # Common components
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Modal.tsx
│   │   ├── hooks/               # Common hooks
│   │   └── styles/              # Shared styles
│   │
│   ├── core/                    # Core business logic
│   │   ├── chat/                # Chat core logic
│   │   │   ├── conversation.ts
│   │   │   ├── message.ts
│   │   │   └── streaming.ts
│   │   ├── knowledge/           # Knowledge base logic
│   │   │   ├── embedding.ts
│   │   │   ├── retrieval.ts
│   │   │   └── chunking.ts
│   │   ├── agent/               # Agent logic
│   │   │   ├── runtime.ts
│   │   │   ├── tools.ts
│   │   │   └── planning.ts
│   │   ├── mcp/                 # MCP protocol
│   │   │   ├── client.ts
│   │   │   └── protocol.ts
│   │   └── plugins/             # Plugin system
│   │       ├── loader.ts
│   │       └── registry.ts
│   │
│   ├── database/                # Database layer
│   │   ├── schema/              # Database schema
│   │   │   ├── users.ts
│   │   │   ├── conversations.ts
│   │   │   ├── messages.ts
│   │   │   └── knowledge.ts
│   │   ├── migrations/          # Database migrations
│   │   └── index.ts
│   │
│   ├── ai-sdk/                  # AI model wrapper
│   │   ├── providers/           # Model providers
│   │   │   ├── openai/
│   │   │   ├── anthropic/
│   │   │   ├── google/
│   │   │   ├── qwen/
│   │   │   ├── deepseek/
│   │   │   ├── ollama/
│   │   │   └── custom/
│   │   ├── streaming/           # Streaming response handling
│   │   │   ├── parser.ts
│   │   │   └── transformer.ts
│   │   └── types/               # Type definitions
│   │
│   └── shared/                  # Shared utilities
│       ├── types/               # Type definitions
│       ├── utils/               # Utility functions
│       └── constants/           # Constants
│
├── docker/                      # Docker configuration
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── docs/                        # Project documentation
│   ├── overview.md
│   ├── tech-stack/
│   ├── architecture/
│   ├── features/
│   └── guides/
│
├── scripts/                     # Build scripts
│   ├── build.ts
│   ├── dev.ts
│   └── release.ts
│
├── .notes/                      # Dev notes (not committed)
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

---

## Package Dependencies

```
                    ┌─────────────────┐
                    │    apps/web     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  packages/ui  │   │ packages/core │   │packages/ai-sdk│
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                   ┌───────────────┐
                   │packages/shared│
                   └───────────────┘
```

---

## Package Responsibilities

### apps/web

Next.js Web application (priority implementation), includes:

- Page routing
- API routes
- Server-side logic
- Web-specific features

### apps/desktop

Electron desktop shell (later implementation), includes:

- Main process logic
- Window management
- System integration
- Local database

### packages/ui

Shared UI component library, includes:

- Common UI components
- Business components
- Custom hooks
- Style themes

### packages/core

Core business logic, includes:

- Chat logic
- Knowledge base logic
- Agent logic
- Plugin system

### packages/database

Database layer, includes:

- Schema definitions
- Database migrations
- Query wrappers

### packages/ai-sdk

AI model wrapper, includes:

- Model provider adapters
- Streaming response handling
- Unified interface

### packages/shared

Shared utilities, includes:

- Type definitions
- Utility functions
- Constants

---

## Configuration Files

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start Web dev server
pnpm dev:web

# Start desktop app development
pnpm dev:desktop

# Build all packages
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm test
```
