import path from "node:path";
import { app, BrowserWindow, dialog } from "electron";

import { registerIpc } from "./ipc";

const rendererUrl = process.env.DESKTOP_RENDERER_URL ?? "http://localhost:3001";

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void win.loadURL(rendererUrl);
}

app.whenReady().then(() => {
  try {
    registerIpc({ userDataPath: app.getPath("userData") });
    createMainWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Desktop 主进程初始化失败（未知错误）";
    dialog.showErrorBox(
      "PrismaX Desktop 启动失败",
      `${message}\n\n如果是 better-sqlite3 ABI 不匹配，请执行：pnpm --filter "desktop" rebuild:native`,
    );
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
