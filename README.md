# PrismaX-Desktop

> Next-generation AI chat assistant desktop app — Feature-rich, Local-first, Excellent experience

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](./README.md) | [简体中文](./docs/zh/README.md)

## Features

- **Multi-model Support** - OpenAI, Claude, Gemini, Qwen, DeepSeek, Ollama local models, and more
- **Local-first** - Data stored locally, privacy protected
- **Streaming Response** - Real-time AI reply display
- **Multi-tab** - Manage multiple conversations simultaneously
- **System Tray** - Background running, quick access
- **Cross-platform** - Windows / macOS / Linux

## Tech Stack

| Category          | Technology              |
| ----------------- | ----------------------- |
| Desktop Framework | Electron 33             |
| Frontend Build    | Vite 6                  |
| UI Framework      | React 19                |
| UI Components     | shadcn/ui               |
| Styling           | Tailwind CSS 3.4        |
| State Management  | Zustand 5               |
| Local Database    | SQLite (better-sqlite3) |
| ORM               | Drizzle                 |
| AI SDK            | @ai-sdk/openai          |

## Documentation

See the [docs/](./docs/) directory for detailed documentation:

- [Project Overview](./docs/项目概述.md)
- [Tech Stack](./docs/技术栈/)
- [Architecture](./docs/架构文档/)
- [Feature Planning](./docs/功能规划/)
- [Development Guide](./docs/开发指南/)

## Quick Start

> Project is under development, stay tuned...

```bash
# Clone the repository
git clone https://github.com/your-username/PrismaX-Desktop.git

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Start Electron development environment
pnpm dev:electron

# Package application
pnpm package
```

## Contributing

Contributions are welcome! Please see [Contributing Guide](./CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE)
