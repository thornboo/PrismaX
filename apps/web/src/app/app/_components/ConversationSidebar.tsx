import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { createConversationAction } from "../actions";
import type {
  ConversationMeta,
  ConversationRow,
} from "../_lib/conversation-sidebar-data";

function formatUpdatedAt(date: Date) {
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ConversationSidebarProps = {
  sessionEmail: string;
  conversationList: ConversationRow[];
  selectedConversationId?: string;
  metaByConversationId?: Record<string, ConversationMeta>;
  searchQuery?: string;
  searchActionPath: string;
};

export function ConversationSidebar({
  sessionEmail,
  conversationList,
  selectedConversationId,
  metaByConversationId,
  searchQuery,
  searchActionPath,
}: ConversationSidebarProps) {
  return (
    <aside className="flex w-80 flex-col border-r border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">PrismaX</div>
          <div className="truncate text-xs text-zinc-400">{sessionEmail}</div>
        </div>
        <SignOutButton />
      </div>

      <div className="px-4 pb-3">
        <form action={createConversationAction} className="flex gap-2">
          <input
            name="title"
            className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
            placeholder="新建会话（可选标题）"
          />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-md bg-white px-3 text-sm font-medium text-zinc-900"
          >
            新建
          </button>
        </form>
      </div>

      <div className="px-4 pb-3">
        <form method="GET" action={searchActionPath} className="flex gap-2">
          <input
            name="q"
            defaultValue={searchQuery ?? ""}
            className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
            placeholder="搜索会话/消息…"
          />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 hover:bg-white/10"
          >
            搜索
          </button>
        </form>
        {searchQuery ? (
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <div className="truncate">筛选：{searchQuery}</div>
            <Link className="underline underline-offset-4" href={searchActionPath}>
              清除
            </Link>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="px-2 pb-2 text-xs font-medium text-zinc-400">会话</div>
        <div className="space-y-1">
          {conversationList.map((conversation) => {
            const isActive = conversation.id === selectedConversationId;
            const meta = metaByConversationId?.[conversation.id];
            const preview = meta?.lastMessagePreview;
            const messageCount = meta?.messageCount ?? 0;
            return (
              <Link
                key={conversation.id}
                href={`/app/c/${conversation.id}`}
                className={[
                  "block rounded-xl border px-3 py-2",
                  "border-transparent hover:bg-white/[0.06]",
                  isActive ? "bg-white/[0.08] border-white/10" : "bg-transparent",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {conversation.title ?? "未命名会话"}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {preview ? preview : formatUpdatedAt(conversation.updatedAt)}
                    </div>
                  </div>
                  {messageCount > 0 ? (
                    <div className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
                      {messageCount}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}

          {conversationList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
              还没有会话，先创建一个吧。
            </div>
          ) : null}
        </div>
      </nav>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 p-4">
        <Link
          href="/settings"
          className="text-sm text-zinc-300 underline underline-offset-4"
        >
          设置
        </Link>
        <div className="text-xs text-zinc-500">OpenAI / 第三方</div>
      </div>
    </aside>
  );
}
