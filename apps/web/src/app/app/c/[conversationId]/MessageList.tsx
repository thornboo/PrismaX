"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type MessageItem = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type MessageListProps = {
  messages: MessageItem[];
};

const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(6px)" },
};

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN");
}

export function MessageList({ messages }: MessageListProps) {
  const reduceMotion = useReducedMotion();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [messages.length, messages[messages.length - 1]?.content, reduceMotion]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => {
          const isUser = message.role === "user";
          const time = formatTime(message.createdAt);

          return (
            <motion.div
              key={message.id}
              variants={itemVariants}
              exit="exit"
              className={["flex", isUser ? "justify-end" : "justify-start"].join(
                " ",
              )}
              layout
            >
              <div className="group relative max-w-[85%]">
                <div
                  className={[
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                      ? "bg-white text-zinc-900"
                      : "border border-white/10 bg-white/[0.04] text-zinc-100",
                  ].join(" ")}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="mt-2 text-[11px] text-zinc-500">
                    {message.role}
                    {time ? ` · ${time}` : null}
                  </div>
                </div>

                <button
                  type="button"
                  className={[
                    "absolute -top-3 right-2 hidden h-7 rounded-full px-2 text-[11px]",
                    "border border-white/10 bg-zinc-950/70 text-zinc-200",
                    "backdrop-blur hover:bg-zinc-950/90 group-hover:inline-flex",
                  ].join(" ")}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(message.content);
                      setCopiedId(message.id);
                      window.setTimeout(() => setCopiedId(null), 800);
                    } catch {
                      setCopiedId(null);
                    }
                  }}
                >
                  {copiedId === message.id ? "已复制" : "复制"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </motion.div>
  );
}
