"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { UIMessage } from "@ai-sdk/react";

type MessageListProps = {
  messages: UIMessage[];
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

function toText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: (props) => (
            <a
              {...props}
              className="underline underline-offset-4 hover:text-white"
              target="_blank"
              rel="noreferrer"
            />
          ),
          pre: (props) => (
            <pre
              {...props}
              className="my-2 overflow-auto rounded-xl border border-white/10 bg-zinc-950/70 p-3"
            />
          ),
          code: (props) => {
            const { className, children, ...rest } = props;
            const isInline = !className;
            return (
              <code
                {...rest}
                className={[
                  className ?? "",
                  isInline
                    ? "rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5"
                    : "text-sm",
                ].join(" ")}
              >
                {children}
              </code>
            );
          },
          ul: (props) => <ul {...props} className="my-2 list-disc pl-5" />,
          ol: (props) => <ol {...props} className="my-2 list-decimal pl-5" />,
          li: (props) => <li {...props} className="my-1" />,
          p: (props) => <p {...props} className="my-2 whitespace-pre-wrap" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
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
  }, [messages.length, messages.length > 0 ? toText(messages[messages.length - 1]) : "", reduceMotion]);

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
          const content = toText(message);

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
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{content}</div>
                  ) : (
                    <MarkdownBlock content={content} />
                  )}
                  <div className="mt-2 text-[11px] text-zinc-500">
                    {message.role}
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
                      await navigator.clipboard.writeText(content);
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
