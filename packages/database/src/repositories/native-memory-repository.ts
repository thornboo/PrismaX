import type { IMemoryProvider } from "@prismax/core";
import { and, desc, eq, like } from "drizzle-orm";

import { agentMemories, archivalMemories } from "../desktop/schema";

type DesktopDb = {
  insert: (table: unknown) => any;
  select: (...args: any[]) => any;
};

export class NativeMemoryRepository implements IMemoryProvider {
  constructor(private readonly db: DesktopDb) {}

  async getCoreMemory(input: { assistantId: string; label: string }) {
    const rows = await this.db
      .select()
      .from(agentMemories)
      .where(
        and(eq(agentMemories.assistantId, input.assistantId), eq(agentMemories.label, input.label)),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      assistantId: row.assistantId,
      label: row.label,
      content: row.content,
      lastUpdated: row.lastUpdated,
    };
  }

  async updateCoreMemory(input: { assistantId: string; label: string; content: string }) {
    const now = new Date();

    await this.db
      .insert(agentMemories)
      .values({
        assistantId: input.assistantId,
        label: input.label,
        content: input.content,
        lastUpdated: now,
      })
      .onConflictDoUpdate({
        target: [agentMemories.assistantId, agentMemories.label],
        set: {
          content: input.content,
          lastUpdated: now,
        },
      });

    const updated = await this.getCoreMemory({
      assistantId: input.assistantId,
      label: input.label,
    });

    if (!updated) {
      throw new Error("NativeMemoryRepository: failed to update core memory");
    }

    return updated;
  }

  async searchArchivalMemory(input: { assistantId: string; query: string; limit?: number }) {
    const q = input.query.trim();
    if (!q) return [];

    const limit = typeof input.limit === "number" ? input.limit : 10;
    const pattern = `%${q}%`;

    const rows = await this.db
      .select()
      .from(archivalMemories)
      .where(
        and(
          eq(archivalMemories.assistantId, input.assistantId),
          like(archivalMemories.content, pattern),
        ),
      )
      .orderBy(desc(archivalMemories.createdAt))
      .limit(Math.max(1, Math.min(limit, 50)));

    return rows.map((row: any) => ({
      id: row.id,
      assistantId: row.assistantId,
      content: row.content,
      score: 0,
      createdAt: row.createdAt,
    }));
  }
}
