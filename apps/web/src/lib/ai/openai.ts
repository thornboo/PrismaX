export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAIClientConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/v1")) return `${normalized}/chat/completions`;
  return `${normalized}/v1/chat/completions`;
}

export async function generateAssistantReply(
  messages: OpenAIChatMessage[],
  config?: Partial<OpenAIClientConfig>,
): Promise<string> {
  const apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return "";

  const model = config?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const baseUrl = config?.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

  const response = await fetch(getChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  const data = (await response.json()) as OpenAIChatCompletionResponse;

  if (!response.ok) {
    const message = data.error?.message ?? "OpenAI request failed";
    throw new Error(message);
  }

  return (data.choices?.[0]?.message?.content ?? "").trim();
}

type OpenAIStreamChunk = {
  choices?: Array<{
    delta?: { content?: string | null };
  }>;
  error?: { message?: string };
};

export async function* streamAssistantReply(
  messages: OpenAIChatMessage[],
  signal?: AbortSignal,
  config?: Partial<OpenAIClientConfig>,
): AsyncGenerator<string> {
  const apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return;

  const model = config?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const baseUrl = config?.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com";

  const response = await fetch(getChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as OpenAIStreamChunk | null;
    const message = data?.error?.message ?? "OpenAI request failed";
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice("data:".length).trim();
      if (data === "[DONE]") return;

      const json = JSON.parse(data) as OpenAIStreamChunk;
      const token = json.choices?.[0]?.delta?.content ?? "";
      if (token) yield token;
    }
  }
}
