import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileCheckpointManager } from "../checkpoint-manager.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("FileCheckpointManager", () => {
  let tempDir: string;
  let manager: FileCheckpointManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "unpress-test-"));
    manager = new FileCheckpointManager(tempDir, "test-session");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("saves and loads a checkpoint", async () => {
    await manager.save("migrate", "posts:42", {
      completed_items: ["1", "2", "3"],
      pending_items: ["42", "43"],
    });

    const checkpoint = await manager.load("migrate");
    expect(checkpoint).not.toBeNull();
    expect(checkpoint!.phase).toBe("migrate");
    expect(checkpoint!.step).toBe("posts:42");
    expect(checkpoint!.session_id).toBe("test-session");
  });

  it("returns null for missing checkpoint", async () => {
    const checkpoint = await manager.load("nonexistent");
    expect(checkpoint).toBeNull();
  });

  it("tracks completed items", async () => {
    await manager.save("migrate", "posts:1", {
      completed_items: ["1", "2"],
      pending_items: ["3"],
    });

    const completed = await manager.getCompletedItems("migrate");
    expect(completed).toEqual(["1", "2"]);
  });

  it("overwrites previous checkpoint for same phase", async () => {
    await manager.save("migrate", "posts:1", { completed_items: ["1"], pending_items: ["2", "3"] });
    await manager.save("migrate", "posts:2", { completed_items: ["1", "2"], pending_items: ["3"] });

    const checkpoint = await manager.load("migrate");
    expect(checkpoint!.step).toBe("posts:2");
    expect(checkpoint!.state.completed_items).toEqual(["1", "2"]);
  });
});
