"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { authClient } from "@/lib/auth-client";

type SignInFormProps = {
  callbackURL: string;
};

export function SignInForm({ callbackURL }: SignInFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <motion.main
      className="space-y-6"
      initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">登录</h1>
        <p className="text-sm text-zinc-400">使用邮箱和密码登录 PrismaX。</p>
      </header>

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setErrorMessage(null);

          try {
            setIsPending(true);
            const { error } = await authClient.signIn.email({
              email,
              password,
              callbackURL,
              rememberMe: true,
            });

            if (error) {
              setErrorMessage(error.message ?? "登录失败，请重试。");
              return;
            }

            router.replace(callbackURL);
            router.refresh();
          } finally {
            setIsPending(false);
          }
        }}
      >
        <label className="block space-y-1">
          <div className="text-sm text-zinc-300">邮箱</div>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-white/20"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1">
          <div className="text-sm text-zinc-300">密码</div>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-white/20"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          登录
        </button>
      </form>

      <p className="text-sm text-zinc-400">
        还没有账号？{" "}
        <Link className="text-white underline underline-offset-4" href="/sign-up">
          去注册
        </Link>
      </p>
    </motion.main>
  );
}
