import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  db: {
    hello: () => ipcRenderer.invoke("db:hello"),
  },
});

