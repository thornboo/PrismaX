# PrismaX

> 新一代 AI 聊天助手 - 功能完善、部署灵活、体验优秀

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](./README.md) | [简体中文](./README.zh-CN.md)

## 特性

- **多模型支持** - OpenAI、Claude、Gemini、通义千问、DeepSeek、Ollama 本地模型等
- **知识库 RAG** - 向量搜索、文档问答、智能检索
- **Agent 系统** - 工具调用、自动化任务、MCP 协议支持
- **插件系统** - 第三方插件扩展
- **多端支持** - 桌面应用、Web 服务、移动端（规划中）
- **云同步** - 跨设备数据同步
- **Docker 部署** - 一键部署，简单运维

## 部署方式

| 方式 | 说明 | 状态 |
|------|------|------|
| 桌面应用 | Windows / macOS / Linux | 开发中 |
| Web 服务 | Docker 一键部署 | 开发中 |
| 移动应用 | iOS / Android | 规划中 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 15 + React 19 |
| UI 组件 | shadcn/ui + Radix UI + Tailwind CSS |
| 状态管理 | Zustand |
| 桌面框架 | Electron |
| 后端 | Next.js API Routes + tRPC |
| 数据库 | PostgreSQL + pgvector / SQLite |
| 缓存 | Redis |

## 文档

详细文档请查看 [docs/](./docs/) 目录：

- [项目概述](./docs/项目概述.md)
- [技术选型](./docs/技术选型/)
- [架构设计](./docs/架构设计/)
- [功能规划](./docs/功能规划/)
- [开发指南](./docs/开发指南/)

## 快速开始

> 项目正在开发中，敬请期待...

```bash
# 克隆项目
git clone https://github.com/your-username/PrismaX.git

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 贡献指南

欢迎贡献代码！请查看 [贡献指南](./CONTRIBUTING.md) 了解详情。

## 许可证

[MIT](./LICENSE)
