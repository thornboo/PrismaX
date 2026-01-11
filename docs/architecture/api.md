# Streaming Architecture

> How to implement framework-agnostic AI streaming in Clean Architecture.

---

## 1. The Challenge

Vercel AI SDK and most LLM libraries are tightly coupled with HTTP Responses (Web Streams API). However, in Clean Architecture, **Core Service Layer must not depend on HTTP or View layers**.

We need a unified streaming interface that works for both:
1.  **Next.js API Routes** (HTTP Response Stream)
2.  **Electron IPC** (Event-based Communication)

## 2. Core Abstraction: `AsyncGenerator`

We use TypeScript's standard `AsyncGenerator` as the protocol-agnostic stream carrier.

### 2.1 Stream Event Definition

Instead of yielding raw strings, we yield structured events to handle text, tool calls, and errors.

```typescript
// packages/core/src/types/stream.ts

export type StreamEventType = 
  | 'text-delta'      // Normal text generation
  | 'tool-call-start' // Agent is calling a tool
  | 'tool-call-end'   // Tool execution finished
  | 'error'           // Something went wrong
  | 'done';           // Generation complete

export interface StreamEvent {
  type: StreamEventType;
  payload: any;
}
```

### 2.2 Service Layer Implementation

`ChatService` consumes the raw stream from `IAIProvider`, processes business logic (e.g., saving to DB, executing tools), and yields events to the Adapter.

```typescript
// packages/core/src/services/ChatService.ts

export class ChatService {
  async *sendMessage(params: SendMessageParams): AsyncGenerator<StreamEvent> {
    // 1. Save User Message
    await this.repo.saveMessage(params.userMessage);

    // 2. Call AI Provider (Abstraction)
    const rawStream = await this.ai.chatStream(params.messages);

    let fullResponse = '';

    // 3. Process Stream
    for await (const chunk of rawStream) {
      fullResponse += chunk;
      
      // Pass-through to UI
      yield { type: 'text-delta', payload: chunk };
    }

    // 4. Save AI Response (After stream ends)
    await this.repo.saveMessage({ 
      role: 'assistant', 
      content: fullResponse 
    });
    
    yield { type: 'done', payload: null };
  }
}
```

## 3. Adapter Layer Implementation

Adapters convert the generic `AsyncGenerator` into platform-specific formats.

### 3.1 Web Adapter (Next.js / tRPC)

Converts `AsyncGenerator` to `ReadableStream` for HTTP response.

```typescript
// apps/web/src/app/api/chat/route.ts

export async function POST(req: Request) {
  const iterator = chatService.sendMessage({ ... });
  
  const stream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        // SSE Format
        controller.enqueue(`data: ${JSON.stringify(value)}

`);
      }
    }
  });

  return new Response(stream);
}
```

### 3.2 Desktop Adapter (Electron IPC)

Converts `AsyncGenerator` to IPC events.

```typescript
// apps/desktop/src/main/ipc/chat.ts

ipcMain.handle('chat:send', async (event, params) => {
  const iterator = chatService.sendMessage(params);
  
  for await (const eventPayload of iterator) {
    // Send to Renderer via WebContents
    event.sender.send('chat:stream-chunk', eventPayload);
  }
});
```

## 4. Handling Tool Calls (Agent Mode)

When the model decides to call a tool, the `ChatService` intercepts the stream:

1.  Model outputs tool call arguments (Stream paused).
2.  `ChatService` executes the tool (Server-side or via Gateway).
3.  `ChatService` yields `{ type: 'tool-call-start' }`.
4.  `ChatService` feeds tool result back to Model.
5.  Model continues generating text (Stream resumes).
6.  `ChatService` yields `{ type: 'text-delta' }`.

**Crucial**: The UI only sees "Status Updates" (Thinking...) and final Text. The complex loop of Tool Execution happens entirely inside `ChatService`, keeping the UI dumb and clean.
