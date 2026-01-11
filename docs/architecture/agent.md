# Agent Architecture Design

> This document describes the PrismaX Agent system architecture design

---

## Overview

The Agent system is one of PrismaX's core capabilities, allowing AI models to call tools, execute tasks, and interact with external systems.

---

## Agent Architecture

```
+-------------------------------------------------------------------------+
|                           Agent Runtime                                  |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------+     +-------------------+     +-------------------+
|  |  Task Planner     |     |  Tool Executor    |     |  State Manager    |
|  |                   |     |                   |     |                   |
|  +-------------------+     +-------------------+     +-------------------+
|           |                        |                        |           |
|           v                        v                        v           |
|  +-------------------------------------------------------------------+  |
|  |                         Tool Registry                             |  |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  |  | Built-in    |  | Plugin      |  | MCP Tools   |  | Custom      | |
|  |  | Tools       |  | Tools       |  |             |  | Tools       | |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## Core Components

### 1. Agent Runtime

```typescript
// agent/runtime.ts
class AgentRuntime {
  private planner: Planner;
  private executor: ToolExecutor;
  private stateManager: StateManager;
  private toolRegistry: ToolRegistry;

  constructor(config: AgentConfig) {
    this.toolRegistry = new ToolRegistry();
    this.planner = new Planner(config.model);
    this.executor = new ToolExecutor(this.toolRegistry);
    this.stateManager = new StateManager();
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const sessionId = generateId();
    this.stateManager.createSession(sessionId);

    try {
      // 1. Initialize context
      const context: AgentContext = {
        sessionId,
        messages: input.messages,
        tools: this.toolRegistry.getAvailableTools(),
        maxIterations: input.maxIterations || 10,
      };

      // 2. Execution loop
      let iteration = 0;
      while (iteration < context.maxIterations) {
        iteration++;

        // 3. Plan next step
        const plan = await this.planner.plan(context);

        // 4. Check if complete
        if (plan.type === 'final_answer') {
          return {
            success: true,
            answer: plan.content,
            steps: this.stateManager.getSteps(sessionId),
          };
        }

        // 5. Execute tool call
        if (plan.type === 'tool_call') {
          const result = await this.executor.execute(plan.toolCall);

          // 6. Update state
          this.stateManager.addStep(sessionId, {
            type: 'tool_call',
            tool: plan.toolCall.name,
            input: plan.toolCall.arguments,
            output: result,
          });

          // 7. Update context
          context.messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [plan.toolCall],
          });
          context.messages.push({
            role: 'tool',
            tool_call_id: plan.toolCall.id,
            content: result,
          });
        }
      }

      // Max iterations reached
      return {
        success: false,
        error: 'Max iterations reached',
        steps: this.stateManager.getSteps(sessionId),
      };
    } finally {
      this.stateManager.endSession(sessionId);
    }
  }
}
```

### 2. Task Planner

```typescript
// agent/planner.ts
class Planner {
  private model: AIProvider;

  constructor(modelConfig: ModelConfig) {
    this.model = createProvider(modelConfig);
  }

  async plan(context: AgentContext): Promise<PlanResult> {
    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(context.tools);

    // Call model
    const response = await this.model.chat([
      { role: 'system', content: systemPrompt },
      ...context.messages,
    ], {
      tools: context.tools.map(this.formatTool),
      tool_choice: 'auto',
    });

    // Parse response
    if (response.tool_calls?.length) {
      return {
        type: 'tool_call',
        toolCall: response.tool_calls[0],
      };
    }

    return {
      type: 'final_answer',
      content: response.content,
    };
  }

  private buildSystemPrompt(tools: Tool[]): string {
    return `You are a helpful AI assistant with access to the following tools:

${tools.map((t) => `- ${t.name}: ${t.description}`).join('\n')}

When you need to use a tool, call it with the appropriate parameters.
When you have enough information to answer the user's question, provide a final answer.
Think step by step and explain your reasoning.`;
  }

  private formatTool(tool: Tool): OpenAITool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }
}
```

### 3. Tool Executor

```typescript
// agent/executor.ts
class ToolExecutor {
  private registry: ToolRegistry;
  private timeout: number = 30000;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  async execute(toolCall: ToolCall): Promise<string> {
    const tool = this.registry.getTool(toolCall.name);
    if (!tool) {
      return JSON.stringify({ error: `Tool ${toolCall.name} not found` });
    }

    try {
      // Parse arguments
      const args = JSON.parse(toolCall.arguments);

      // Validate arguments
      const validation = this.validateArgs(tool, args);
      if (!validation.valid) {
        return JSON.stringify({ error: validation.error });
      }

      // Execute tool (with timeout)
      const result = await Promise.race([
        tool.execute(args),
        this.createTimeout(tool.timeout || this.timeout),
      ]);

      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private validateArgs(tool: Tool, args: unknown): ValidationResult {
    // Use JSON Schema validation
    const ajv = new Ajv();
    const validate = ajv.compile(tool.parameters);

    if (validate(args)) {
      return { valid: true };
    }

    return {
      valid: false,
      error: ajv.errorsText(validate.errors),
    };
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tool execution timeout')), ms);
    });
  }
}
```

### 4. State Manager

```typescript
// agent/state.ts
class StateManager {
  private sessions: Map<string, AgentSession> = new Map();
  private redis?: Redis;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
  }

  createSession(sessionId: string): void {
    const session: AgentSession = {
      id: sessionId,
      steps: [],
      startTime: Date.now(),
      status: 'running',
    };

    this.sessions.set(sessionId, session);
    this.persistSession(session);
  }

  addStep(sessionId: string, step: AgentStep): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    step.timestamp = Date.now();
    session.steps.push(step);
    this.persistSession(session);
  }

  getSteps(sessionId: string): AgentStep[] {
    return this.sessions.get(sessionId)?.steps || [];
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.endTime = Date.now();
    this.persistSession(session);
  }

  private async persistSession(session: AgentSession): Promise<void> {
    if (this.redis) {
      await this.redis.set(
        `agent:session:${session.id}`,
        JSON.stringify(session),
        'EX',
        3600 // 1 hour expiry
      );
    }
  }
}
```

---

## Tool System

### Tool Definition

```typescript
interface Tool {
  // Tool name
  name: string;

  // Tool description
  description: string;

  // Parameter definition (JSON Schema)
  parameters: JSONSchema;

  // Execute function
  execute: (args: unknown) => Promise<unknown>;

  // Requires confirmation
  requireConfirmation?: boolean;

  // Timeout
  timeout?: number;

  // Permission requirements
  permissions?: string[];
}
```

### Built-in Tools

#### Web Search

```typescript
const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results',
        default: 5,
      },
    },
    required: ['query'],
  },
  async execute({ query, maxResults = 5 }) {
    const results = await searchEngine.search(query, maxResults);
    return results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));
  },
};
```

#### URL Fetch

```typescript
const urlFetchTool: Tool = {
  name: 'url_fetch',
  description: 'Fetch and parse content from a URL',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch',
      },
    },
    required: ['url'],
  },
  async execute({ url }) {
    const response = await fetch(url);
    const html = await response.text();
    const content = extractMainContent(html);
    return { url, content };
  },
};
```

#### Code Interpreter

```typescript
const codeInterpreterTool: Tool = {
  name: 'code_interpreter',
  description: 'Execute Python code in a sandboxed environment',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Python code to execute',
      },
    },
    required: ['code'],
  },
  requireConfirmation: true,
  timeout: 60000,
  async execute({ code }) {
    const result = await sandbox.execute(code);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      returnValue: result.returnValue,
    };
  },
};
```

#### File Operations

```typescript
const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Read content from a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path to read',
      },
    },
    required: ['path'],
  },
  permissions: ['file:read'],
  async execute({ path }) {
    const content = await fs.readFile(path, 'utf-8');
    return { path, content };
  },
};
```

---

## MCP Protocol Support

### MCP Client

```typescript
// mcp/client.ts
class MCPClient {
  private transport: MCPTransport;
  private tools: Map<string, MCPTool> = new Map();

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    // Establish connection
    this.transport = await createTransport(serverConfig);

    // Get tool list
    const response = await this.transport.request('tools/list', {});
    for (const tool of response.tools) {
      this.tools.set(tool.name, tool);
    }
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    const response = await this.transport.request('tools/call', {
      name,
      arguments: args,
    });
    return response.content;
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values()).map((mcpTool) => ({
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema,
      execute: (args) => this.callTool(mcpTool.name, args),
    }));
  }

  async disconnect(): Promise<void> {
    await this.transport.close();
  }
}
```

### MCP Server

```typescript
// mcp/server.ts
class MCPServer {
  private tools: Map<string, Tool> = new Map();

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    switch (request.method) {
      case 'tools/list':
        return {
          tools: Array.from(this.tools.values()).map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.parameters,
          })),
        };

      case 'tools/call':
        const tool = this.tools.get(request.params.name);
        if (!tool) {
          throw new Error(`Tool ${request.params.name} not found`);
        }
        const result = await tool.execute(request.params.arguments);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };

      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  }
}
```

---

## Agent Modes

### ReAct Mode

```
Thought: I need to search for the latest information
Action: web_search
Action Input: {"query": "latest news"}
Observation: [Search results]
Thought: I found relevant information, now I can answer
Final Answer: Based on the search results...
```

### Plan-and-Execute Mode

```
Plan:
1. Search for relevant information
2. Analyze search results
3. Summarize and answer

Execute Step 1: web_search(...)
Execute Step 2: analyze(...)
Execute Step 3: summarize(...)

Final Answer: ...
```

### Implementation

```typescript
// agent/modes/react.ts
class ReActAgent extends AgentRuntime {
  protected buildSystemPrompt(): string {
    return `You are a helpful assistant that uses the ReAct framework.

For each step:
1. Thought: Think about what you need to do
2. Action: Choose a tool to use
3. Action Input: Provide the input for the tool
4. Observation: See the result

When you have enough information, provide:
Final Answer: Your response to the user

Available tools:
${this.formatTools()}`;
  }
}

// agent/modes/plan-execute.ts
class PlanExecuteAgent extends AgentRuntime {
  async run(input: AgentInput): Promise<AgentOutput> {
    // 1. Generate plan
    const plan = await this.generatePlan(input);

    // 2. Execute each step
    const results: StepResult[] = [];
    for (const step of plan.steps) {
      const result = await this.executeStep(step);
      results.push(result);

      // Check if replanning needed
      if (result.needsReplan) {
        const newPlan = await this.replan(plan, results);
        plan.steps = newPlan.steps;
      }
    }

    // 3. Generate final answer
    return this.generateFinalAnswer(input, results);
  }
}
```

---

## Error Handling

### Error Types

| Error Type | Description | Handling |
|------------|-------------|----------|
| ToolNotFound | Tool doesn't exist | Return error message to model |
| ToolExecutionError | Tool execution failed | Retry or return error |
| ToolTimeout | Tool execution timeout | Terminate execution, return timeout error |
| MaxIterationsReached | Max iterations reached | Return partial results |
| PermissionDenied | Insufficient permissions | Request user authorization |

### Retry Strategy

```typescript
class RetryExecutor {
  private maxRetries = 3;
  private backoff = [1000, 2000, 4000];

  async executeWithRetry(tool: Tool, args: unknown): Promise<unknown> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await tool.execute(args);
      } catch (error) {
        lastError = error as Error;

        // Check if retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Wait before retry
        await sleep(this.backoff[i]);
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('timeout') ||
        error.message.includes('rate limit') ||
        error.message.includes('network')
      );
    }
    return false;
  }
}
```

---

## Security Considerations

### Tool Permissions

```typescript
// Permission check
async function checkToolPermission(
  tool: Tool,
  user: User
): Promise<boolean> {
  if (!tool.permissions?.length) {
    return true;
  }

  for (const permission of tool.permissions) {
    if (!user.permissions.includes(permission)) {
      return false;
    }
  }

  return true;
}
```

### User Confirmation

```typescript
// Tools requiring confirmation
if (tool.requireConfirmation) {
  const confirmed = await showConfirmDialog({
    title: `Confirm execution of ${tool.name}`,
    message: `About to execute:\n${JSON.stringify(args, null, 2)}`,
  });

  if (!confirmed) {
    return { cancelled: true };
  }
}
```

### Resource Limits

```typescript
// Limit concurrent execution
const semaphore = new Semaphore(5);

async function executeWithLimit(tool: Tool, args: unknown) {
  await semaphore.acquire();
  try {
    return await tool.execute(args);
  } finally {
    semaphore.release();
  }
}
```
