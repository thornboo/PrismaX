export {};

declare global {
  interface Window {
    electron?: {
      db: {
        hello: () => Promise<{
          insertedFolderId: string;
          folderCount: number;
          folders: Array<{ id: string; name: string; createdAt: string }>;
        }>;
      };
    };
  }
}

