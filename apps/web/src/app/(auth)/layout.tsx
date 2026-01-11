import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-zinc-950 via-zinc-950 to-slate-900 px-6 py-10 text-zinc-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold tracking-tight">PrismaX</div>
          <div className="mt-1 text-sm text-zinc-400">登录后开始你的对话。</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
