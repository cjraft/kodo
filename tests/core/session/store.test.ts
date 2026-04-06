import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SessionStore } from "../../../src/core/session/store.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("SessionStore", () => {
  it("creates and reloads the latest session", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-session-"));
    tempDirs.push(dir);

    const store = new SessionStore(dir);
    await store.create({
      id: "s1",
      cwd: "/tmp/project",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      provider: "test/provider",
    });

    await store.appendMessage("s1", {
      id: "m1",
      role: "user",
      text: "hello",
      createdAt: "2025-01-01T00:00:01.000Z",
    });

    const latest = await store.loadLatest();

    expect(latest?.meta.id).toBe("s1");
    expect(latest?.messages).toHaveLength(1);
    expect(latest?.messages[0]?.text).toBe("hello");
  });

  it("orders sessions by updatedAt when resolving recency", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-session-order-"));
    tempDirs.push(dir);

    const store = new SessionStore(dir);
    await store.create({
      id: "s1",
      cwd: "/tmp/project",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      provider: "test/provider",
    });
    await store.create({
      id: "s2",
      cwd: "/tmp/project",
      createdAt: "2025-01-01T00:00:01.000Z",
      updatedAt: "2025-01-01T00:00:01.000Z",
      provider: "test/provider",
    });

    await store.saveMeta({
      id: "s1",
      cwd: "/tmp/project",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:02.000Z",
      provider: "test/provider",
    });

    const metas = await store.listMetas();
    const latest = await store.loadLatest();

    expect(metas.map((meta) => meta.id)).toEqual(["s1", "s2"]);
    expect(latest?.meta.id).toBe("s1");
  });

  it("writes artifact content and metadata", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-artifact-"));
    tempDirs.push(dir);

    const store = new SessionStore(dir);
    await store.create({
      id: "s1",
      cwd: "/tmp/project",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      provider: "test/provider",
    });

    const artifactPath = await store.writeArtifact("s1", "a1", "artifact body");
    const saved = await readFile(artifactPath, "utf8");

    expect(saved).toBe("artifact body");
  });
});
