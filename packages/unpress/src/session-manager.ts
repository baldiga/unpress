import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import type { SessionSummary } from "@unpress/shared";

export class SessionManager {
  private dir: string;

  constructor(baseDir: string) {
    this.dir = join(baseDir, ".unpress", "sessions");
  }

  async create(wpUrl: string): Promise<SessionSummary> {
    const session: SessionSummary = {
      session_id: uuid(),
      started_at: new Date().toISOString(),
      status: "in_progress",
      wp_url: wpUrl,
      created_resources: {
        sanity_document_ids: [],
      },
      phases_completed: [],
      errors: [],
    };
    await this.save(session);
    return session;
  }

  async load(sessionId: string): Promise<SessionSummary | null> {
    try {
      const data = await readFile(join(this.dir, sessionId, "summary.json"), "utf-8");
      return JSON.parse(data) as SessionSummary;
    } catch {
      return null;
    }
  }

  async addResource(sessionId: string, key: keyof SessionSummary["created_resources"], value: unknown): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    (session.created_resources as Record<string, unknown>)[key] = value;
    await this.save(session);
  }

  async completePhase(sessionId: string, phase: string): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (!session.phases_completed.includes(phase)) {
      session.phases_completed.push(phase);
    }
    await this.save(session);
  }

  async updateStatus(sessionId: string, status: SessionSummary["status"]): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.status = status;
    if (status === "completed") {
      session.completed_at = new Date().toISOString();
    }
    await this.save(session);
  }

  private async save(session: SessionSummary): Promise<void> {
    const sessionDir = join(this.dir, session.session_id);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, "summary.json"), JSON.stringify(session, null, 2));
  }
}
