import { randomUUID } from "node:crypto";
import path from "node:path";
import { ipcMain } from "electron";

import { DesktopChatRepository, createDesktopDb, ensureDesktopSchema } from "@prismax/database";

export function registerIpc(options: { userDataPath: string }) {
  const dbPath = path.join(options.userDataPath, "prismax.sqlite");

  const { db, sqlite } = createDesktopDb(dbPath);
  ensureDesktopSchema(sqlite);

  const chatRepository = new DesktopChatRepository(db);

  ipcMain.handle("db:hello", async () => {
    const folderId = randomUUID();
    await chatRepository.createFolder({
      id: folderId,
      name: "Hello Desktop",
      parentId: null,
    });

    const folders = await chatRepository.listFolders({ parentId: null });
    return {
      insertedFolderId: folderId,
      folderCount: folders.length,
      folders: folders.map((f) => ({ id: f.id, name: f.name, createdAt: f.createdAt.toISOString() })),
    };
  });
}
