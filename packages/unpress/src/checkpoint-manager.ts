import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import type { Checkpoint, CheckpointManager } from "@unpress/shared";

export class FileCheckpointManager implements CheckpointManager {
  private dir: string;

  private static validateId(id: string): void {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(`Invalid identifier: ${id}`);
    }
  }

  constructor(baseDir: string, private sessionId: string) {
    FileCheckpointManager.validateId(sessionId);
    this.dir = join(baseDir, ".unpress", "checkpoints", sessionId);
  }

  async save(phase: string, step: string, state: Record<string, unknown>): Promise<void> {
    FileCheckpointManager.validateId(phase);
    await mkdir(this.dir, { recursive: true });
    const checkpoint: Checkpoint = {
      id: uuid(),
      session_id: this.sessionId,
      phase,
      step,
      timestamp: new Date().toISOString(),
      state,
      completed_items: (state.completed_items as string[]) ?? [],
      pending_items: (state.pending_items as string[]) ?? [],
    };
    const filename = `${phase}-latest.json`;
    await writeFile(join(this.dir, filename), JSON.stringify(checkpoint, null, 2));
  }

  async load(phase: string): Promise<Checkpoint | null> {
    FileCheckpointManager.validateId(phase);
    try {
      const data = await readFile(join(this.dir, `${phase}-latest.json`), "utf-8");
      return JSON.parse(data) as Checkpoint;
    } catch {
      return null;
    }
  }

  async getCompletedItems(phase: string): Promise<string[]> {
    const checkpoint = await this.load(phase);
    return checkpoint?.completed_items ?? [];
  }
}
