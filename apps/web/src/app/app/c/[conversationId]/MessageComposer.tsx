"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "framer-motion";

import { sendMessageAction } from "./actions";

function SendButton() {
  const { pending } = useFormStatus();

  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileTap={{ scale: 0.98 }}
      className="h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-medium text-zinc-900 disabled:opacity-60"
    >
      {pending ? "发送中…" : "发送"}
    </motion.button>
  );
}

type MessageComposerProps = {
  conversationId: string;
};

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <form
      ref={formRef}
      action={sendMessageAction}
      className="flex items-end gap-3"
      onSubmit={() => {
        const textarea = textareaRef.current;
        if (textarea) textarea.style.height = "44px";
      }}
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <textarea
        ref={textareaRef}
        name="content"
        className="h-11 max-h-40 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
        placeholder="输入消息…"
        required
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          if (event.shiftKey) return;
          event.preventDefault();
          formRef.current?.requestSubmit();
        }}
        onInput={(event) => {
          const textarea = event.currentTarget;
          textarea.style.height = "0px";
          textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
        }}
      />
      <SendButton />
    </form>
  );
}
