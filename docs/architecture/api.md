# API Design

> This document describes the PrismaX API interface design

---

## API Architecture

PrismaX uses tRPC for end-to-end type-safe APIs:

```
+-------------------+     +-------------------+     +-------------------+
|      Client       |     |    tRPC Router    |     |     Database      |
|  (React Query)    | --> |   (Next.js API)   | --> |   (PostgreSQL)    |
+-------------------+     +-------------------+     +-------------------+
```

---

## Router Structure

```typescript
// server/routers/index.ts
export const appRouter = router({
  // Conversation related
  conversation: conversationRouter,

  // Message related
  message: messageRouter,

  // Knowledge base related
  knowledge: knowledgeRouter,

  // Assistant related
  assistant: assistantRouter,

  // Model configuration related
  model: modelRouter,

  // User related
  user: userRouter,

  // Settings related
  settings: settingsRouter,
});
```

---

## Conversation API

### conversation.list

Get conversation list

```typescript
// Input
input: {
  folderId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

// Output
output: {
  items: Conversation[];
  nextCursor?: string;
}
```

### conversation.create

Create new conversation

```typescript
// Input
input: {
  title?: string;
  model?: string;
  systemPrompt?: string;
  folderId?: string;
}

// Output
output: Conversation
```

### conversation.update

Update conversation

```typescript
// Input
input: {
  id: string;
  title?: string;
  model?: string;
  systemPrompt?: string;
  folderId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

// Output
output: Conversation
```

### conversation.delete

Delete conversation

```typescript
// Input
input: {
  id: string;
}

// Output
output: { success: boolean }
```

---

## Message API

### message.list

Get message list

```typescript
// Input
input: {
  conversationId: string;
  limit?: number;
  cursor?: string;
}

// Output
output: {
  items: Message[];
  nextCursor?: string;
}
```

### message.send

Send message (streaming response)

```typescript
// Input
input: {
  conversationId: string;
  content: string;
  model?: string;
  knowledgeBaseIds?: string[];
}

// Output (streaming)
output: AsyncIterable<{
  type: 'text' | 'done' | 'error';
  content?: string;
  message?: Message;
  error?: string;
}>
```

### message.regenerate

Regenerate message

```typescript
// Input
input: {
  messageId: string;
}

// Output (streaming)
output: AsyncIterable<{
  type: 'text' | 'done' | 'error';
  content?: string;
  message?: Message;
}>
```

### message.update

Update message

```typescript
// Input
input: {
  id: string;
  content: string;
}

// Output
output: Message
```

### message.delete

Delete message

```typescript
// Input
input: {
  id: string;
}

// Output
output: { success: boolean }
```

---

## Knowledge Base API

### knowledge.listBases

Get knowledge base list

```typescript
// Input
input: {}

// Output
output: KnowledgeBase[]
```

### knowledge.createBase

Create knowledge base

```typescript
// Input
input: {
  name: string;
  description?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

// Output
output: KnowledgeBase
```

### knowledge.deleteBase

Delete knowledge base

```typescript
// Input
input: {
  id: string;
}

// Output
output: { success: boolean }
```

### knowledge.listDocuments

Get document list

```typescript
// Input
input: {
  knowledgeBaseId: string;
}

// Output
output: Document[]
```

### knowledge.uploadDocument

Upload document

```typescript
// Input
input: {
  knowledgeBaseId: string;
  file: File;
}

// Output
output: Document
```

### knowledge.deleteDocument

Delete document

```typescript
// Input
input: {
  id: string;
}

// Output
output: { success: boolean }
```

### knowledge.search

Search knowledge base

```typescript
// Input
input: {
  knowledgeBaseIds: string[];
  query: string;
  topK?: number;
}

// Output
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

## Assistant API

### assistant.list

Get assistant list

```typescript
// Input
input: {
  includePublic?: boolean;
}

// Output
output: Assistant[]
```

### assistant.create

Create assistant

```typescript
// Input
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

// Output
output: Assistant
```

### assistant.update

Update assistant

```typescript
// Input
input: {
  id: string;
  // ... same as create
}

// Output
output: Assistant
```

### assistant.delete

Delete assistant

```typescript
// Input
input: {
  id: string;
}

// Output
output: { success: boolean }
```

---

## Model Configuration API

### model.listProviders

Get model provider list

```typescript
// Input
input: {}

// Output
output: ModelProvider[]
```

### model.updateProvider

Update model provider configuration

```typescript
// Input
input: {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

// Output
output: ModelProvider
```

### model.listModels

Get available model list

```typescript
// Input
input: {
  provider?: string;
}

// Output
output: Model[]
```

### model.testConnection

Test model connection

```typescript
// Input
input: {
  provider: string;
}

// Output
output: {
  success: boolean;
  error?: string;
  models?: string[];
}
```

---

## User API

### user.me

Get current user info

```typescript
// Input
input: {}

// Output
output: User
```

### user.updateProfile

Update user profile

```typescript
// Input
input: {
  name?: string;
  avatar?: string;
}

// Output
output: User
```

### user.updatePassword

Update password

```typescript
// Input
input: {
  currentPassword: string;
  newPassword: string;
}

// Output
output: { success: boolean }
```

---

## Settings API

### settings.get

Get user settings

```typescript
// Input
input: {}

// Output
output: UserSettings
```

### settings.update

Update user settings

```typescript
// Input
input: {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  defaultModel?: string;
  sendOnEnter?: boolean;
  // ...
}

// Output
output: UserSettings
```

---

## Error Handling

### Error Codes

| Error Code | Description |
|------------|-------------|
| `UNAUTHORIZED` | Unauthorized |
| `FORBIDDEN` | Access forbidden |
| `NOT_FOUND` | Resource not found |
| `BAD_REQUEST` | Invalid request parameters |
| `INTERNAL_ERROR` | Internal server error |
| `RATE_LIMITED` | Rate limit exceeded |

### Error Response Format

```typescript
{
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

---

## Authentication

### Authentication Methods

- Web Version: JWT Token (stored in HttpOnly Cookie)
- Desktop Version: No authentication needed (single user)

### Authentication Flow

```
1. User login -> Get JWT Token
2. Request with Token -> Verify identity
3. Token expired -> Auto refresh
```

### Protected Routes

All API routes require authentication by default, except:

- `auth.login`
- `auth.register`
- `auth.refreshToken`
