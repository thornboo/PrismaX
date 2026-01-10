# API 设计

> 本文档描述 PrismaX 的 API 接口设计

---

## API 架构

PrismaX 使用 tRPC 实现端到端类型安全的 API：

```
+-------------------+     +-------------------+     +-------------------+
|    客户端          |     |    tRPC Router    |     |    数据库          |
|  (React Query)    | --> |   (Next.js API)   | --> |  (PostgreSQL)     |
+-------------------+     +-------------------+     +-------------------+
```

---

## Router 结构

```typescript
// server/routers/index.ts
export const appRouter = router({
  // 会话相关
  conversation: conversationRouter,

  // 消息相关
  message: messageRouter,

  // 知识库相关
  knowledge: knowledgeRouter,

  // 助手相关
  assistant: assistantRouter,

  // 模型配置相关
  model: modelRouter,

  // 用户相关
  user: userRouter,

  // 设置相关
  settings: settingsRouter,
});
```

---

## 会话 API

### conversation.list

获取会话列表

```typescript
// 输入
input: {
  folderId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

// 输出
output: {
  items: Conversation[];
  nextCursor?: string;
}
```

### conversation.create

创建新会话

```typescript
// 输入
input: {
  title?: string;
  model?: string;
  systemPrompt?: string;
  folderId?: string;
}

// 输出
output: Conversation
```

### conversation.update

更新会话

```typescript
// 输入
input: {
  id: string;
  title?: string;
  model?: string;
  systemPrompt?: string;
  folderId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

// 输出
output: Conversation
```

### conversation.delete

删除会话

```typescript
// 输入
input: {
  id: string;
}

// 输出
output: { success: boolean }
```

---

## 消息 API

### message.list

获取消息列表

```typescript
// 输入
input: {
  conversationId: string;
  limit?: number;
  cursor?: string;
}

// 输出
output: {
  items: Message[];
  nextCursor?: string;
}
```

### message.send

发送消息（流式响应）

```typescript
// 输入
input: {
  conversationId: string;
  content: string;
  model?: string;
  knowledgeBaseIds?: string[];
}

// 输出（流式）
output: AsyncIterable<{
  type: 'text' | 'done' | 'error';
  content?: string;
  message?: Message;
  error?: string;
}>
```

### message.regenerate

重新生成消息

```typescript
// 输入
input: {
  messageId: string;
}

// 输出（流式）
output: AsyncIterable<{
  type: 'text' | 'done' | 'error';
  content?: string;
  message?: Message;
}>
```

### message.update

更新消息

```typescript
// 输入
input: {
  id: string;
  content: string;
}

// 输出
output: Message
```

### message.delete

删除消息

```typescript
// 输入
input: {
  id: string;
}

// 输出
output: { success: boolean }
```

---

## 知识库 API

### knowledge.listBases

获取知识库列表

```typescript
// 输入
input: {}

// 输出
output: KnowledgeBase[]
```

### knowledge.createBase

创建知识库

```typescript
// 输入
input: {
  name: string;
  description?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

// 输出
output: KnowledgeBase
```

### knowledge.deleteBase

删除知识库

```typescript
// 输入
input: {
  id: string;
}

// 输出
output: { success: boolean }
```

### knowledge.listDocuments

获取文档列表

```typescript
// 输入
input: {
  knowledgeBaseId: string;
}

// 输出
output: Document[]
```

### knowledge.uploadDocument

上传文档

```typescript
// 输入
input: {
  knowledgeBaseId: string;
  file: File;
}

// 输出
output: Document
```

### knowledge.deleteDocument

删除文档

```typescript
// 输入
input: {
  id: string;
}

// 输出
output: { success: boolean }
```

### knowledge.search

搜索知识库

```typescript
// 输入
input: {
  knowledgeBaseIds: string[];
  query: string;
  topK?: number;
}

// 输出
output: {
  results: {
    content: string;
    score: number;
    documentId: string;
    documentName: string;
  }[];
}
```

---

## 助手 API

### assistant.list

获取助手列表

```typescript
// 输入
input: {
  includePublic?: boolean;
}

// 输出
output: Assistant[]
```

### assistant.create

创建助手

```typescript
// 输入
input: {
  name: string;
  description?: string;
  avatar?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  knowledgeBaseIds?: string[];
  tools?: string[];
  isPublic?: boolean;
}

// 输出
output: Assistant
```

### assistant.update

更新助手

```typescript
// 输入
input: {
  id: string;
  // ... 同 create
}

// 输出
output: Assistant
```

### assistant.delete

删除助手

```typescript
// 输入
input: {
  id: string;
}

// 输出
output: { success: boolean }
```

---

## 模型配置 API

### model.listProviders

获取模型提供商列表

```typescript
// 输入
input: {}

// 输出
output: ModelProvider[]
```

### model.updateProvider

更新模型提供商配置

```typescript
// 输入
input: {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

// 输出
output: ModelProvider
```

### model.listModels

获取可用模型列表

```typescript
// 输入
input: {
  provider?: string;
}

// 输出
output: Model[]
```

### model.testConnection

测试模型连接

```typescript
// 输入
input: {
  provider: string;
}

// 输出
output: {
  success: boolean;
  error?: string;
  models?: string[];
}
```

---

## 用户 API

### user.me

获取当前用户信息

```typescript
// 输入
input: {}

// 输出
output: User
```

### user.updateProfile

更新用户资料

```typescript
// 输入
input: {
  name?: string;
  avatar?: string;
}

// 输出
output: User
```

### user.updatePassword

更新密码

```typescript
// 输入
input: {
  currentPassword: string;
  newPassword: string;
}

// 输出
output: { success: boolean }
```

---

## 设置 API

### settings.get

获取用户设置

```typescript
// 输入
input: {}

// 输出
output: UserSettings
```

### settings.update

更新用户设置

```typescript
// 输入
input: {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  defaultModel?: string;
  sendOnEnter?: boolean;
  // ...
}

// 输出
output: UserSettings
```

---

## 错误处理

### 错误码

| 错误码 | 说明 |
|--------|------|
| `UNAUTHORIZED` | 未授权 |
| `FORBIDDEN` | 禁止访问 |
| `NOT_FOUND` | 资源不存在 |
| `BAD_REQUEST` | 请求参数错误 |
| `INTERNAL_ERROR` | 服务器内部错误 |
| `RATE_LIMITED` | 请求频率限制 |

### 错误响应格式

```typescript
{
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

---

## 认证

### 认证方式

- Web 版：JWT Token（存储在 HttpOnly Cookie）
- 桌面版：无需认证（单用户）

### 认证流程

```
1. 用户登录 -> 获取 JWT Token
2. 请求携带 Token -> 验证身份
3. Token 过期 -> 自动刷新
```

### 受保护的路由

所有 API 路由默认需要认证，除了：

- `auth.login`
- `auth.register`
- `auth.refreshToken`
