# 技术选型文档

> 本目录包含 PrismaX 项目的技术选型分析与决策文档

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [技术方案对比.md](./技术方案对比.md) | Electron vs Tauri 等方案对比 |
| [技术栈详情.md](./技术栈详情.md) | 各层技术栈详细选型 |
| [项目结构.md](./项目结构.md) | Monorepo 项目结构规划 |

---

## 最终决策

### 已确认的技术选型

| 类别 | 选型 | 说明 |
|------|------|------|
| **桌面框架** | Electron | 生态成熟，跨平台 UI 一致 |
| **Web 框架** | Next.js 15 | App Router + RSC |
| **UI 组件库** | shadcn/ui + Radix | 可定制性强 |
| **样式方案** | Tailwind CSS | 原子化 CSS |
| **状态管理** | Zustand | 轻量级 |
| **API 层** | tRPC | 端到端类型安全 |
| **数据库** | PostgreSQL + pgvector | 向量搜索 |
| **本地数据库** | SQLite | 桌面版 |
| **移动端** | React Native（后期） | 代码复用 |

### 决策理由

选择 **Electron + Next.js** 方案的主要原因：

1. **代码复用率最高** - 95%+ 代码共享，维护成本最低
2. **开发效率最高** - 纯 TypeScript 全栈，无需学习 Rust
3. **跨平台 UI 一致** - 统一 Chromium 渲染，无 WebView 差异
4. **生态最成熟** - 几乎所有问题都有现成解决方案
5. **移动端扩展** - React Native 可复用大量 React 代码
