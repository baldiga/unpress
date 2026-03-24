import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionManager } from "../session-manager.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("SessionManager", () => {
  let tempDir: string;
  let manager: SessionManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "unpress-session-"));
    manager = new SessionManager(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a new session", async () => {
    const session = await manager.create("https://example.com");
    expect(session.session_id).toBeTruthy();
    expect(session.wp_url).toBe("https://example.com");
    expect(session.status).toBe("in_progress");
  });

  it("loads an existing session", async () => {
    const created = await manager.create("https://example.com");
    const loaded = await manager.load(created.session_id);
    expect(loaded).not.toBeNull();
    expect(loaded!.session_id).toBe(created.session_id);
  });

  it("returns null for nonexistent session", async () => {
    const loaded = await manager.load("nonexistent");
    expect(loaded).toBeNull();
  });

  it("records created resources", async () => {
    const session = await manager.create("https://example.com");
    await manager.addResource(session.session_id, "sanity_document_ids", ["doc1", "doc2"]);
    const updated = await manager.load(session.session_id);
    expect(updated!.created_resources.sanity_document_ids).toEqual(["doc1", "doc2"]);
  });

  it("marks phase complete", async () => {
    const session = await manager.create("https://example.com");
    await manager.completePhase(session.session_id, "scan");
    const updated = await manager.load(session.session_id);
    expect(updated!.phases_completed).toContain("scan");
  });
});
