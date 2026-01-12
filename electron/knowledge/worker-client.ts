import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fork, ChildProcess } from "node:child_process";
import type {
  KnowledgeWorkerEvent,
  KnowledgeWorkerRequest,
  KnowledgeWorkerResponse,
} from "./worker-protocol";

type PendingCall = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export type KnowledgeWorkerClient = {
  call: <TResult = unknown>(
    method: string,
    params: unknown,
    timeoutMs?: number,
  ) => Promise<TResult>;
  onEvent: (handler: (event: KnowledgeWorkerEvent) => void) => () => void;
  dispose: () => void;
};

let singleton: KnowledgeWorkerClient | null = null;

function resolveWorkerScriptPath(): string {
  // 运行时 main/preload bundle 都在 electron-dist 下；argv[1] 指向入口脚本路径
  const bundleDir = path.dirname(process.argv[1] ?? "");
  const candidate = path.join(bundleDir, "knowledge", "kb-worker.cjs");

  // asar 打包场景：child_process 无法直接执行 asar 内脚本，需要走 app.asar.unpacked
  const asarSegment = `${path.sep}app.asar${path.sep}`;
  if (candidate.includes(asarSegment)) {
    const unpacked = candidate.replace(asarSegment, `${path.sep}app.asar.unpacked${path.sep}`);
    if (unpacked !== candidate && fs.existsSync(unpacked)) return unpacked;
  }

  if (fs.existsSync(candidate)) return candidate;
  return candidate;
}

export function getKnowledgeWorkerClient(userDataPath: string): KnowledgeWorkerClient {
  if (singleton) return singleton;

  const workerScript = resolveWorkerScriptPath();
  const pending = new Map<string, PendingCall>();
  const eventHandlers = new Set<(event: KnowledgeWorkerEvent) => void>();

  const child: ChildProcess = fork(workerScript, [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PRISMAX_USER_DATA: userDataPath,
    },
    stdio: ["pipe", "pipe", "pipe", "ipc"],
  });

  child.on("message", (msg: KnowledgeWorkerResponse | KnowledgeWorkerEvent) => {
    if (!msg || typeof msg !== "object") return;

    if ((msg as KnowledgeWorkerEvent).type === "event") {
      const event = msg as KnowledgeWorkerEvent;
      for (const handler of eventHandlers) {
        try {
          handler(event);
        } catch {
          // ignore
        }
      }
      return;
    }

    const res = msg as KnowledgeWorkerResponse;
    const call = pending.get(res.id);
    if (!call) return;
    pending.delete(res.id);
    clearTimeout(call.timeout);

    if (res.ok) {
      call.resolve(res.result);
      return;
    }

    const err = new Error(res.error.message);
    if (res.error.stack) {
      err.stack = res.error.stack;
    }
    call.reject(err);
  });

  const dispose = () => {
    for (const call of pending.values()) {
      clearTimeout(call.timeout);
      call.reject(new Error("知识库工作进程已退出"));
    }
    pending.clear();
    try {
      child.disconnect();
    } catch {
      // ignore
    }
    try {
      child.kill();
    } catch {
      // ignore
    }
    singleton = null;
  };

  child.on("exit", dispose);
  child.on("error", dispose);

  singleton = {
    call: (method, params, timeoutMs = 60_000) => {
      const id = crypto.randomUUID();
      const request: KnowledgeWorkerRequest = { id, method, params };
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`知识库任务超时: ${method}`));
        }, timeoutMs);

        pending.set(id, { resolve, reject, timeout });
        child.send(request);
      });
    },
    onEvent: (handler) => {
      eventHandlers.add(handler);
      return () => eventHandlers.delete(handler);
    },
    dispose,
  };

  return singleton;
}
