# Development Environment

> This document describes the PrismaX development environment setup guide

---

## Requirements

### Required Software

| Software | Version | Description |
|----------|---------|-------------|
| Node.js | 20+ | JavaScript runtime |
| pnpm | 8+ | Package manager |
| Git | 2.x | Version control |

### Optional Software

| Software | Version | Description |
|----------|---------|-------------|
| Docker | 24+ | Containerized deployment |
| PostgreSQL | 16+ | Database (Web development) |
| Redis | 7+ | Cache (Web development) |
| Ollama | latest | Local model testing |

---

## Installation Steps

### 1. Install Node.js

Recommended to use nvm for Node.js version management:

```bash
# macOS / Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Windows (use nvm-windows)
# Download and install from https://github.com/coreybutler/nvm-windows
nvm install 20
nvm use 20
```

### 2. Install pnpm

```bash
# Install via npm
npm install -g pnpm

# Or use corepack (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

### 3. Clone Project

```bash
git clone https://github.com/your-username/PrismaX.git
cd PrismaX
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Configure Environment Variables

```bash
# Copy environment variable template
cp .env.example .env.local

# Edit environment variables
# Configure API Keys as needed
```

---

## Development Server

### Web Development

```bash
# Start development server
pnpm dev:web

# Access http://localhost:3000
```

### Desktop Development

```bash
# Start desktop app development
pnpm dev:desktop

# Electron window will open automatically
```

### Simultaneous Development

```bash
# Start both Web and desktop versions
pnpm dev
```

---

## Database Configuration

### Local PostgreSQL

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name prismax-postgres \
  -e POSTGRES_DB=prismax \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Configure environment variable
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prismax
```

### Local Redis

```bash
# Start Redis with Docker
docker run -d \
  --name prismax-redis \
  -p 6379:6379 \
  redis:7-alpine

# Configure environment variable
REDIS_URL=redis://localhost:6379
```

### Using Docker Compose

```bash
# Start all services
cd docker
docker-compose -f docker-compose.dev.yml up -d
```

---

## IDE Configuration

### VS Code

Recommended extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- GitLens

Recommended `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### WebStorm / IntelliJ IDEA

- Enable ESLint and Prettier
- Configure TypeScript to use project version
- Enable Tailwind CSS support

---

## Troubleshooting

### pnpm install fails

```bash
# Clear cache and retry
pnpm store prune
rm -rf node_modules
pnpm install
```

### Electron fails to start

```bash
# Reinstall Electron
cd apps/desktop
pnpm rebuild electron
```

### Database connection fails

1. Check if PostgreSQL is running
2. Check environment variable configuration
3. Check firewall settings

### Port already in use

```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```
