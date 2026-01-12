# Development Guides

> This directory contains PrismaX development guide documents

---

## Document Index

| Document                                                   | Description                         |
| ---------------------------------------------------------- | ----------------------------------- |
| [development-environment.md](./development-environment.md) | Development environment setup guide |
| [code-standards.md](./code-standards.md)                   | Code style and standards            |
| [git-workflow.md](./git-workflow.md)                       | Git workflow and commit conventions |
| [testing.md](./testing.md)                                 | Testing strategy and standards      |
| [deployment.md](./deployment.md)                           | Deployment solutions and processes  |

---

## Quick Start

### Requirements

- Node.js 20+
- pnpm 8+
- Git

### Installation Steps

```bash
# Clone project
git clone https://github.com/your-username/PrismaX.git
cd PrismaX

# Install dependencies
pnpm install

# Start development server
pnpm dev:web      # Web version
pnpm dev:desktop  # Desktop version
```

### Common Commands

```bash
# Development
pnpm dev:web        # Start Web development server
pnpm dev:desktop    # Start desktop app development

# Build
pnpm build          # Build all packages
pnpm build:web      # Build Web version
pnpm build:desktop  # Build desktop version

# Code Quality
pnpm lint           # Code linting
pnpm type-check     # Type checking
pnpm test           # Run tests
```
