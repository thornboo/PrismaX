"use client";

import { useEffect, useState } from "react";

type HelloResult = {
  insertedFolderId: string;
  folderCount: number;
  folders: Array<{ id: string; name: string; createdAt: string }>;
};

export default function Page() {
  const [result, setResult] = useState<HelloResult | null>(null);
  const [canUseDb, setCanUseDb] = useState(false);

  useEffect(() => {
    setCanUseDb(!!window.electron?.db);
  }, []);

  const onClick = async () => {
    if (!window.electron?.db) return;
    const next = await window.electron.db.hello();
    setResult(next);
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>Hello Desktop</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        Electron + Next.js（Renderer）已初始化。点击按钮将往 SQLite 写入并读回数据。
      </p>

      <button
        type="button"
        onClick={onClick}
        disabled={!canUseDb}
        style={{
          marginTop: 12,
          height: 40,
          padding: "0 14px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: canUseDb ? "#111" : "#999",
          color: "#fff",
          cursor: canUseDb ? "pointer" : "not-allowed",
        }}
      >
        插入并读取 SQLite
      </button>

      {!canUseDb ? (
        <div style={{ marginTop: 12, color: "#b45309" }}>
          当前未检测到 IPC Bridge（请从 Electron 启动 Renderer）。
        </div>
      ) : null}

      {result ? (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#0b0b0b",
            color: "#e5e5e5",
            borderRadius: 10,
            overflow: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
