# Agent 架构设计

> 本文档描述 PrismaX 的 Agent 系统架构设计

---

## 概述

Agent 系统是 PrismaX 的核心能力之一，允许 AI 模型调用工具、执行任务、与外部系统交互。

---

## Agent 架构

```
+-------------------------------------------------------------------------+
|                           Agent 运行时                                   |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------+     +-------------------+     +-------------------+
|  |   任务规划器       |     |   工具执行器       |     |   状态管理器      |
|  |   (Planner)       |     |   (Executor)      |     |   (StateManager) |
|  +-------------------+     +-------------------+     +-------------------+
|           |                        |                        |           |
|           v                        v                        v           |
|  +-------------------------------------------------------------------+  |
|  |                         工具注册表                                  |  |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  |  | 内置工具     |  | 插件工具    |  | MCP 工具    |  | 自定义工具   | |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 核心组件

### 1. Agent 运行时

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
      // 1. 初始化上下文
      const context: AgentContext = {
        sessionId,
        messages: input.messages,
        tools: this.toolRegistry.getAvailableTools(),
        maxIterations: input.maxIterations || 10,
      };

      // 2. 执行循环
      let iteration = 0;
      while (iteration < context.maxIterations) {
        iteration++;

        // 3. 规划下一步
        const plan = await this.planner.plan(context);

        // 4. 检查是否完成
        if (plan.type === 'final_answer') {
          return {
            success: true,
            answer: plan.content,
            steps: this.stateManager.getSteps(sessionId),
          };
        }

        // 5. 执行工具调用
        if (plan.type === 'tool_call') {
          const result = await this.executor.execute(plan.toolCall);

          // 6. 更新状态
          this.stateManager.addStep(sessionId, {
            type: 'tool_call',
            tool: plan.toolCall.name,
            input: plan.toolCall.arguments,
            output: result,
          });

          // 7. 更新上下文
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

      // 达到最大迭代次数
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

### 2. 任务规划器

```typescript
// agent/planner.ts
class Planner {
  private model: AIProvider;

  constructor(modelConfig: ModelConfig) {
    this.model = createProvider(modelConfig);
  }

  async plan(context: AgentContext): Promise<PlanResult> {
    // 构建系统提示
    const systemPrompt = this.buildSystemPrompt(context.tools);

    // 调用模型
    const response = await this.model.chat([
      { role: 'system', content: systemPrompt },
      ...context.messages,
    ], {
      tools: context.tools.map(this.formatTool),
      tool_choice: 'auto',
    });

    // 解析响应
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

### 3. 工具执行器

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
      // 解析参数
      const args = JSON.parse(toolCall.arguments);

      // 验证参数
      const validation = this.validateArgs(tool, args);
      if (!validation.valid) {
        return JSON.stringify({ error: validation.error });
      }

      // 执行工具（带超时）
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
    // 使用 JSON Schema 验证
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

### 4. 状态管理器

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
        3600 // 1 小时过期
      );
    }
  }
}
```

---

## 工具系统

### 工具定义

```typescript
interface Tool {
  // 工具名称
  name: string;

  // 工具描述
  description: string;

  // 参数定义（JSON Schema）
  parameters: JSONSchema;

  // 执行函数
  execute: (args: unknown) => Promise<unknown>;

  // 是否需要确认
  requireConfirmation?: boolean;

  // 超时时间
  timeout?: number;

  // 权限要求
  permissions?: string[];
}
```

### 内置工具

#### Web 搜索

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

#### URL 抓取

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

#### 代码执行

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

#### 文件操作

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

## MCP 协议支持

### MCP 客户端

```typescript
// mcp/client.ts
class MCPClient {
  private transport: MCPTransport;
  private tools: Map<string, MCPTool> = new Map();

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    // 建立连接
    this.transport = await createTransport(serverConfig);

    // 获取工具列表
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

### MCP 服务端

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

## Agent 模式

### ReAct 模式

```
Thought: 我需要搜索最新的信息
Action: web_search
Action Input: {"query": "latest news"}
Observation: [搜索结果]
Thought: 我找到了相关信息，现在可以回答
Final Answer: 根据搜索结果...
```

### Plan-and-Execute 模式

```
Plan:
1. 搜索相关信息
2. 分析搜索结果
3. 总结并回答

Execute Step 1: web_search(...)
Execute Step 2: analyze(...)
Execute Step 3: summarize(...)

Final Answer: ...
```

### 实现

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
    // 1. 生成计划
    const plan = await this.generatePlan(input);

    // 2. 执行每个步骤
    const results: StepResult[] = [];
    for (const step of plan.steps) {
      const result = await this.executeStep(step);
      results.push(result);

      // 检查是否需要重新规划
      if (result.needsReplan) {
        const newPlan = await this.replan(plan, results);
        plan.steps = newPlan.steps;
      }
    }

    // 3. 生成最终答案
    return this.generateFinalAnswer(input, results);
  }
}
```

---

## 错误处理

### 错误类型

| 错误类型 | 说明 | 处理方式 |
|----------|------|----------|
| ToolNotFound | 工具不存在 | 返回错误信息给模型 |
| ToolExecutionError | 工具执行失败 | 重试或返回错误 |
| ToolTimeout | 工具执行超时 | 终止执行，返回超时错误 |
| MaxIterationsReached | 达到最大迭代次数 | 返回部分结果 |
| PermissionDenied | 权限不足 | 请求用户授权 |

### 重试策略

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

        // 判断是否可重试
        if (!this.isRetryable(error)) {
          throw error;
        }

        // 等待后重试
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

## 安全考虑

### 工具权限

```typescript
// 权限检查
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

### 用户确认

```typescript
// 需要确认的工具
if (tool.requireConfirmation) {
  const confirmed = await showConfirmDialog({
    title: `确认执行 ${tool.name}`,
    message: `即将执行以下操作：\n${JSON.stringify(args, null, 2)}`,
  });

  if (!confirmed) {
    return { cancelled: true };
  }
}
```

### 资源限制

```typescript
// 限制并发执行
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
