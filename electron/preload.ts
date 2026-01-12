import { contextBridge, ipcRenderer } from "electron";

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld("electron", {
  // 系统相关
  system: {
    getAppVersion: () => ipcRenderer.invoke("system:getAppVersion"),
    checkUpdate: () => ipcRenderer.invoke("system:checkUpdate"),
    openExternal: (url: string) => ipcRenderer.invoke("system:openExternal", url),
    minimize: () => ipcRenderer.invoke("system:minimize"),
    close: () => ipcRenderer.invoke("system:close"),
  },

  // 聊天相关
  chat: {
    send: (input: { conversationId: string; content: string; modelId?: string }) =>
      ipcRenderer.invoke("chat:send", input),
    history: (conversationId: string) => ipcRenderer.invoke("chat:history", { conversationId }),
    onToken: (callback: (payload: { requestId: string; token: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string; token: string }) =>
        callback(payload);
      ipcRenderer.on("chat:token", listener);
      return () => ipcRenderer.removeListener("chat:token", listener);
    },
    onDone: (callback: (payload: { requestId: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string }) => callback(payload);
      ipcRenderer.on("chat:done", listener);
      return () => ipcRenderer.removeListener("chat:done", listener);
    },
    onError: (callback: (payload: { requestId: string; message: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string; message: string }) =>
        callback(payload);
      ipcRenderer.on("chat:error", listener);
      return () => ipcRenderer.removeListener("chat:error", listener);
    },
  },

  // 数据库相关
  db: {
    getConversations: () => ipcRenderer.invoke("db:getConversations"),
    createConversation: (title?: string) => ipcRenderer.invoke("db:createConversation", title),
    deleteConversation: (id: string) => ipcRenderer.invoke("db:deleteConversation", id),
    getMessages: (conversationId: string) => ipcRenderer.invoke("db:getMessages", conversationId),
  },

  // 设置相关
  settings: {
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: unknown) => ipcRenderer.invoke("settings:set", key, value),
    getAll: () => ipcRenderer.invoke("settings:getAll"),
  },

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ["new-conversation", "open-settings"];
    if (validChannels.includes(channel)) {
      const listener = (_event: unknown, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
});
