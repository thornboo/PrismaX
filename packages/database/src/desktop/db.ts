import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export function createDesktopDb(filePath: string): { db: any; sqlite: any } {
  const sqlite = new Database(filePath);
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}
