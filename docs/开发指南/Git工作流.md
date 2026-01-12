# Git 工作流

> 本文档描述 PrismaX-Desktop Git 工作流和提交规范

---

## 分支策略

### 主要分支

| 分支      | 说明                   | 保护规则              |
| --------- | ---------------------- | --------------------- |
| `main`    | 主分支，生产代码       | 禁止直接推送，需要 PR |
| `develop` | 开发分支，最新开发代码 | 禁止直接推送，需要 PR |

### 功能分支

| 分支类型 | 命名规范          | 示例                           |
| -------- | ----------------- | ------------------------------ |
| 功能开发 | `feature/<描述>`  | `feature/add-knowledge-base`   |
| Bug 修复 | `fix/<描述>`      | `fix/message-render-error`     |
| 紧急修复 | `hotfix/<描述>`   | `hotfix/critical-security-fix` |
| 重构     | `refactor/<描述>` | `refactor/chat-store`          |
| 文档     | `docs/<描述>`     | `docs/api-documentation`       |

---

## 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| 类型       | 说明                          |
| ---------- | ----------------------------- |
| `feat`     | 新功能                        |
| `fix`      | Bug 修复                      |
| `docs`     | 文档更新                      |
| `style`    | 代码格式（不影响功能）        |
| `refactor` | 重构（非新功能、非 Bug 修复） |
| `perf`     | 性能优化                      |
| `test`     | 测试相关                      |
| `chore`    | 构建/工具相关                 |
| `ci`       | CI/CD 相关                    |

### Scope 范围

| 范围       | 说明     |
| ---------- | -------- |
| `chat`     | 聊天功能 |
| `ui`       | UI 组件  |
| `db`       | 数据库   |
| `ipc`      | IPC 通信 |
| `settings` | 设置功能 |

### 示例

```bash
# 新功能
feat(chat): 添加知识库管理页面

# Bug 修复
fix(ui): 修复窗口关闭事件处理

# 文档
docs: 更新 API 文档

# 重构
refactor(chat): 简化消息处理逻辑

# 性能优化
perf(ui): 使用虚拟列表优化聊天列表渲染
```

---

## 工作流程

### 1. 开始新功能

```bash
# 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/add-knowledge-base
```

### 2. 开发过程

```bash
# 定期提交
git add .
git commit -m "feat(chat): 添加知识库列表组件"

# 保持与 develop 同步
git fetch origin
git rebase origin/develop
```

### 3. 完成功能

```bash
# 推送到远程
git push origin feature/add-knowledge-base

# 创建 Pull Request
# - 目标分支: develop
# - 填写 PR 描述
# - 请求 Code Review
```

### 4. Code Review

- 需要至少 1 个 Approve
- 所有 CI 检查通过
- 解决所有 Review 意见

### 5. 合并

```bash
# 使用 Squash and Merge
# 合并后删除功能分支
```

---

## Pull Request 规范

### PR 标题

遵循 Commit Message 格式：

```
feat(chat): 添加知识库管理功能
```

### PR 描述模板

```markdown
## 概述

简要描述这个 PR 做了什么。

## 改动内容

- 添加了知识库列表页面
- 实现了文档上传功能
- 添加了相关测试

## 测试

- [ ] 单元测试通过
- [ ] E2E 测试通过
- [ ] 手动测试通过

## 截图（如有 UI 改动）

[添加截图]

## 关联 Issue

Closes #123
```

---

## Git Hooks

项目使用 Husky + lint-staged 进行提交前检查：

### pre-commit

```bash
# 运行 lint-staged
pnpm lint-staged
```

### commit-msg

```bash
# 验证提交信息格式
pnpm commitlint --edit $1
```

### lint-staged 配置

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

---

## 版本发布

### 版本号规范

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- `MAJOR.MINOR.PATCH`
- `1.0.0` -> `1.0.1` (Patch: Bug 修复)
- `1.0.0` -> `1.1.0` (Minor: 新功能，向后兼容)
- `1.0.0` -> `2.0.0` (Major: 破坏性变更)

### 发布流程

```bash
# 1. 创建发布分支
git checkout develop
git checkout -b release/v1.0.0

# 2. 更新版本号
pnpm changeset version

# 3. 更新 CHANGELOG
# 自动生成

# 4. 提交
git add .
git commit -m "chore: 发布 v1.0.0"

# 5. 合并到 main
git checkout main
git merge release/v1.0.0

# 6. 打标签
git tag v1.0.0
git push origin v1.0.0

# 7. 合并回 develop
git checkout develop
git merge main
```

---

## 常用命令

```bash
# 查看提交历史
git log --oneline --graph

# 修改最后一次提交
git commit --amend

# 交互式变基
git rebase -i HEAD~3

# 暂存当前改动
git stash
git stash pop

# 丢弃未提交的改动
git checkout -- .

# 撤销已提交的改动（创建新提交）
git revert <commit-hash>

# 重置到某个提交（谨慎使用）
git reset --hard <commit-hash>
```
