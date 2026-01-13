# IPC 契约（通道 + 响应格式）

本文档描述 PrismaX-Desktop 的 IPC 约定（通道命名、事件、返回值形态），用于保证渲染进程与主进程之间的**可维护性与一致性**。

## 1. 分层与单一来源

- **通道常量**：`electron/ipc/channels.ts`
  - `IPC_CHANNELS`：所有 `ipcRenderer.invoke(...)` / `ipcMain.handle(...)` 通道名
  - `IPC_EVENTS`：主进程推送到渲染进程的事件名（`webContents.send(...)` / `ipcRenderer.on(...)`）
- **主进程 handlers**：`electron/ipc/handlers.ts`
  - 统一通过封装注册（`handleIpc()`）保证返回值形态一致、异常不外泄到渲染进程
- **桥接层（Preload）**：`electron/preload.ts`
  - 仅负责透传（invoke/on），不在 preload 中做业务逻辑
- **渲染进程辅助**：`src/lib/ipc.ts`
  - 提供取消操作识别（`isIpcCancelled`）

## 2. Invoke/Handle 统一响应格式

所有 `ipcRenderer.invoke(...)` 返回值统一为：

```ts
type IpcResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };
```

约定：

- `success: true` 时：`data` 为业务数据，`error` 固定为 `null`
- `success: false` 时：`error` 为可展示的中文错误信息，`data` 固定为 `null`
- 渲染进程**不依赖抛异常**来控制流程；通过 `success` 分支处理即可

对应类型定义位于：`src/types/electron.d.ts`。

## 3. 取消操作（Dialog/Confirm）约定

对于用户可取消的交互（例如选择目录、导入/导出弹窗、危险操作确认等）：

- 主进程会将“用户取消”视为 `success: false`，并使用统一错误字符串：
  - `error === "操作已取消"`
- 渲染进程推荐使用 `src/lib/ipc.ts`：

```ts
import { isIpcCancelled } from "@/lib/ipc";

const res = await window.electron.system.selectDirectory();
if (!res.success) {
  if (isIpcCancelled(res)) return;
  alert(res.error);
  return;
}
```

## 4. 渲染进程调用范式

### 4.1 读取数据

```ts
const res = await window.electron.db.getConversations();
if (!res.success) {
  console.error(res.error);
  return;
}
setConversations(res.data);
```

### 4.2 执行命令（无返回）

对“命令型”操作，通常使用 `IpcResponse<null>`：

```ts
const res = await window.electron.chat.cancel(requestId);
if (!res.success) console.error(res.error);
```

## 5. 事件（Streaming/JobUpdate）不使用 IpcResponse

主进程推送事件（例如 `chat:token`、`chat:done`、`kb:jobUpdate`）属于 **push**，不走 `invoke/handle`，因此不包裹 `IpcResponse<T>`。

事件通道名统一在 `electron/ipc/channels.ts` 的 `IPC_EVENTS` 中维护。

## 6. 主进程新增 handler 的约定

在 `electron/ipc/handlers.ts` 内新增 IPC 能力时：

- 使用 `IPC_CHANNELS` 定义通道名（避免字符串散落）
- 通过 `handleIpc(channel, handler, fallbackError)` 注册
- handler 内直接 `return T` 表示成功；遇到错误 `throw new Error("...")`，由封装统一转为 `{ success:false, error }`
