# Message Flow Design

> This document describes the PrismaX message processing flow design

---

## Overview

Message flow is the core functionality of PrismaX, involving user input, AI model calls, streaming responses, message storage, and more.

---

## Message Sending Flow

### Overall Flow

```
+--------+     +--------+     +--------+     +--------+     +--------+
|  User  | --> |   UI   | --> | Store  | --> |  Core  | --> | AI SDK |
| Input  |     | Layer  |     | Action |     | Process|     |  Call  |
+--------+     +--------+     +--------+     +--------+     +----+---+
                                                                 |
                                                                 v
+--------+     +--------+     +--------+     +--------+     +--------+
|   UI   | <-- | Store  | <-- |  Core  | <-- | Stream | <-- |AI Model|
| Update |     | Update |     |  Parse |     |Response|     |Service |
+--------+     +--------+     +--------+     +--------+     +--------+
```

### Detailed Steps

#### 1. User Input

```typescript
// ChatInput component
function ChatInput() {
  const handleSubmit = async (content: string) => {
    // 1. Validate input
    if (!content.trim()) return;

    // 2. Call Store Action
    await chatStore.sendMessage(content);
  };
}
```

#### 2. Store Processing

```typescript
// chatStore.ts
const useChatStore = create<ChatStore>((set, get) => ({
  sendMessage: async (content: string) => {
    const { activeConversationId, settings } = get();

    // 1. Create user message
    const userMessage: Message = {
      id: generateId(),
      conversationId: activeConversationId,
      role: 'user',
      content,
      createdAt: new Date(),
    };

    // 2. Add to message list
    set((state) => ({
      messages: {
        ...state.messages,
        [activeConversationId]: [
          ...state.messages[activeConversationId],
          userMessage,
        ],
      },
    }));

    // 3. Create placeholder AI message
    const assistantMessage: Message = {
      id: generateId(),
      conversationId: activeConversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [activeConversationId]: [
          ...state.messages[activeConversationId],
          assistantMessage,
        ],
      },
      isGenerating: true,
    }));

    // 4. Call AI service
    try {
      const stream = await chatService.sendMessage({
        conversationId: activeConversationId,
        messages: get().messages[activeConversationId],
        model: settings.defaultModel,
      });

      // 5. Handle streaming response
      for await (const chunk of stream) {
        set((state) => ({
          messages: {
            ...state.messages,
            [activeConversationId]: state.messages[activeConversationId].map(
              (msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: msg.content + chunk.content }
                  : msg
            ),
          },
        }));
      }
    } finally {
      set({ isGenerating: false });
    }
  },
}));
```

#### 3. AI SDK Call

```typescript
// ai-sdk/chat.ts
async function* sendMessage(params: SendMessageParams) {
  const { messages, model, knowledgeBaseIds } = params;

  // 1. Knowledge base retrieval (if enabled)
  let context = '';
  if (knowledgeBaseIds?.length) {
    const results = await knowledgeService.search({
      query: messages[messages.length - 1].content,
      knowledgeBaseIds,
    });
    context = formatContext(results);
  }

  // 2. Build request messages
  const requestMessages = buildMessages(messages, context);

  // 3. Get Provider
  const provider = getProvider(model);

  // 4. Call model
  const stream = await provider.chatStream(requestMessages, {
    model,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  });

  // 5. Forward streaming response
  for await (const chunk of stream) {
    yield chunk;
  }
}
```

---

## Streaming Response Handling

### SSE Parsing

```typescript
// streaming/parser.ts
async function* parseSSEStream(
  response: Response
): AsyncIterable<ChatChunk> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          yield {
            type: 'text',
            content: parsed.choices[0]?.delta?.content || '',
          };
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}
```

### Response Transformation

```typescript
// streaming/transformer.ts
function transformResponse(chunk: ProviderChunk): ChatChunk {
  // Unify response format from different providers
  switch (chunk.provider) {
    case 'openai':
      return {
        type: 'text',
        content: chunk.choices[0]?.delta?.content || '',
      };
    case 'anthropic':
      return {
        type: 'text',
        content: chunk.delta?.text || '',
      };
    default:
      return {
        type: 'text',
        content: chunk.content || '',
      };
  }
}
```

---

## Message Storage

### Web Version (PostgreSQL)

```typescript
// services/message.ts
class MessageService {
  async saveMessage(message: Message): Promise<Message> {
    const result = await db
      .insert(messages)
      .values({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        model: message.model,
        tokensUsed: message.tokensUsed,
        metadata: message.metadata,
      })
      .returning();

    return result[0];
  }

  async updateMessage(id: string, content: string): Promise<Message> {
    const result = await db
      .update(messages)
      .set({ content })
      .where(eq(messages.id, id))
      .returning();

    return result[0];
  }
}
```

### Desktop Version (SQLite)

```typescript
// desktop/database.ts
class LocalMessageService {
  saveMessage(message: Message): Message {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.model,
      message.createdAt.toISOString()
    );

    return message;
  }
}
```

---

## Message Regeneration

### Flow

```
1. User clicks "Regenerate"
2. Delete current AI response
3. Get context messages
4. Re-call AI service
5. Update message content
```

### Implementation

```typescript
// chatStore.ts
regenerateMessage: async (messageId: string) => {
  const { activeConversationId } = get();
  const messages = get().messages[activeConversationId];

  // 1. Find the message to regenerate
  const messageIndex = messages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return;

  // 2. Get context (all messages before this one)
  const contextMessages = messages.slice(0, messageIndex);

  // 3. Clear current message content
  set((state) => ({
    messages: {
      ...state.messages,
      [activeConversationId]: state.messages[activeConversationId].map((msg) =>
        msg.id === messageId ? { ...msg, content: '' } : msg
      ),
    },
    isGenerating: true,
  }));

  // 4. Re-call AI
  try {
    const stream = await chatService.sendMessage({
      conversationId: activeConversationId,
      messages: contextMessages,
    });

    for await (const chunk of stream) {
      set((state) => ({
        messages: {
          ...state.messages,
          [activeConversationId]: state.messages[activeConversationId].map(
            (msg) =>
              msg.id === messageId
                ? { ...msg, content: msg.content + chunk.content }
                : msg
          ),
        },
      }));
    }
  } finally {
    set({ isGenerating: false });
  }
};
```

---

## Message Editing

### Flow

```
1. User edits message
2. Update message content
3. Delete all messages after this one
4. If editing user message, regenerate AI response
```

### Implementation

```typescript
// chatStore.ts
editMessage: async (messageId: string, newContent: string) => {
  const { activeConversationId } = get();
  const messages = get().messages[activeConversationId];

  // 1. Find message position
  const messageIndex = messages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return;

  const message = messages[messageIndex];

  // 2. Update message content, delete subsequent messages
  set((state) => ({
    messages: {
      ...state.messages,
      [activeConversationId]: state.messages[activeConversationId]
        .slice(0, messageIndex + 1)
        .map((msg) =>
          msg.id === messageId ? { ...msg, content: newContent } : msg
        ),
    },
  }));

  // 3. If user message, regenerate AI response
  if (message.role === 'user') {
    await get().sendMessage(newContent, { skipUserMessage: true });
  }
};
```

---

## Stop Generation

### Implementation

```typescript
// chatStore.ts
const abortControllerRef = { current: null as AbortController | null };

sendMessage: async (content: string) => {
  // Create AbortController
  abortControllerRef.current = new AbortController();

  try {
    const stream = await chatService.sendMessage({
      // ...
      signal: abortControllerRef.current.signal,
    });

    for await (const chunk of stream) {
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }
      // Process chunk
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      // User stopped, not an error
      return;
    }
    throw error;
  }
};

stopGeneration: () => {
  abortControllerRef.current?.abort();
  set({ isGenerating: false });
};
```

---

## Error Handling

### Error Types

| Error Type | Description | Handling |
|------------|-------------|----------|
| NetworkError | Network error | Prompt retry |
| AuthError | Authentication error | Prompt to check API Key |
| RateLimitError | Rate limit | Prompt to retry later |
| ModelError | Model error | Display error message |
| TimeoutError | Timeout | Prompt retry |

### Error Handling

```typescript
// chatStore.ts
sendMessage: async (content: string) => {
  try {
    // ... send message
  } catch (error) {
    // Update message status to error
    set((state) => ({
      messages: {
        ...state.messages,
        [activeConversationId]: state.messages[activeConversationId].map(
          (msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  error: {
                    type: getErrorType(error),
                    message: getErrorMessage(error),
                  },
                }
              : msg
        ),
      },
      isGenerating: false,
    }));

    // Show error toast
    toast.error(getErrorMessage(error));
  }
};
```

---

## Performance Optimization

### Virtual List

For long conversations, use virtual list to optimize rendering:

```typescript
// ChatList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function ChatList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ChatMessage message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Message Caching

```typescript
// Use React Query to cache messages
const useMessages = (conversationId: string) => {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messageService.getMessages(conversationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### Debounced Input

```typescript
// Debounce save draft while typing
const debouncedSaveDraft = useMemo(
  () =>
    debounce((content: string) => {
      localStorage.setItem(`draft-${conversationId}`, content);
    }, 500),
  [conversationId]
);
```
