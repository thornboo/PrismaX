"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MessageList } from "./MessageList";

type MessageItem = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ChatClientProps = {
  conversationId: string;
  initialMessages: MessageItem[];
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (crypto as any).randomUUID() as string;
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ChatClient({ conversationId, initialMessages }: ChatClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  const send = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setInput("");

    const userId = makeId();
    const assistantId = makeId();
    const nowIso = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content, createdAt: nowIso },
      { id: assistantId, role: "assistant", content: "", createdAt: nowIso },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "发送失败";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `（${message}）` } : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <section className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
            还没有消息，发第一条吧。
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </section>

      <section className="border-t border-white/10 bg-zinc-950/60 px-6 py-4 backdrop-blur">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="h-11 max-h-40 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
            placeholder="输入消息…"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (event.shiftKey) return;
              event.preventDefault();
              void send();
            }}
            onInput={(event) => {
              const textarea = event.currentTarget;
              textarea.style.height = "0px";
              textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
            }}
            disabled={isSending}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className="h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-medium text-zinc-900 disabled:opacity-60"
          >
            {isSending ? "发送中…" : "发送"}
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">Enter 发送 · Shift+Enter 换行</div>
      </section>
    </div>
  );
}

