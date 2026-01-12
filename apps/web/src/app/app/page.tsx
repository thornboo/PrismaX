import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { AppShell } from "./_components/AppShell";
import { ConversationSidebar } from "./_components/ConversationSidebar";
import { getConversationSidebarData } from "./_lib/conversation-sidebar-data";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickSearchQuery(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  return "";
}

export default async function AppHomePage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/app");
  }

  const params = await searchParams;
  const q = pickSearchQuery(params.q);

  const { conversationList, metaByConversationId } = await getConversationSidebarData(
    session.user.id,
    q,
  );

  return (
    <AppShell
      sidebar={
        <ConversationSidebar
          sessionEmail={session.user.email}
          conversationList={conversationList}
          metaByConversationId={metaByConversationId}
          searchQuery={q}
          searchActionPath="/app"
        />
      }
    >
      <div className="flex h-full flex-col">
        <header className="border-b border-white/10 bg-zinc-950/60 px-6 py-4 backdrop-blur">
          <div className="text-sm font-medium text-zinc-200">开始对话</div>
          <div className="mt-1 text-xs text-zinc-500">从左侧选择会话，或创建一个新的会话。</div>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-base font-semibold">欢迎来到 PrismaX</div>
            <div className="mt-2 text-sm text-zinc-400">
              这是一个最小可用版本：登录 → 新建会话 → 发送消息。
            </div>
            <div className="mt-4 text-xs text-zinc-500">
              你喜欢 lobe-chat 的风格，所以我们会优先把布局、交互和信息密度做得更像它。
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
