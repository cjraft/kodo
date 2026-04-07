import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SessionStore } from "../../../src/core/session/store.js";
import { ReplayRuntime } from "../../../src/core/replay/runtime.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("ReplayRuntime", () => {
  it("lists replay sessions with the first user input preview", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-replay-list-"));
    tempDirs.push(dir);

    const store = new SessionStore(dir);
    await store.create({
      id: "s1",
      cwd: "/tmp/project",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      provider: "test/provider",
    });
    await store.appendMessage("s1", {
      id: "m1",
      role: "user",
      text: "inspect the failing layout",
      createdAt: "2026-01-01T00:00:01.000Z",
    });

    const runtime = new ReplayRuntime(store);
    const sessions = await runtime.listReplaySessions();

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: "s1",
      firstUserInput: "inspect the failing layout",
      messageCount: 1,
    });
  });

  it("reconstructs transcript state step by step from persisted messages", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-replay-step-"));
    tempDirs.push(dir);

    const store = new SessionStore(dir);
    await store.create({
      id: "s1",
      cwd: "/tmp/project",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      provider: "test/provider",
    });
    await store.appendMessage("s1", {
      id: "m1",
      role: "user",
      text: "read readme",
      createdAt: "2026-01-01T00:00:01.000Z",
    });
    await store.appendMessage("s1", {
      id: "m2",
      role: "assistant",
      text: "",
      createdAt: "2026-01-01T00:00:02.000Z",
      toolCalls: [{ id: "tool-1", toolName: "file_read", input: { path: "README.md" } }],
    });
    await store.appendToolCall("s1", {
      id: "tool-1",
      toolName: "file_read",
      input: { path: "README.md" },
      createdAt: "2026-01-01T00:00:02.100Z",
      output: { success: true },
      isError: false,
    });
    await store.appendMessage("s1", {
      id: "m3",
      role: "tool",
      text: "# README",
      toolName: "file_read",
      toolCallId: "tool-1",
      toolError: false,
      createdAt: "2026-01-01T00:00:02.200Z",
    });

    const runtime = new ReplayRuntime(store);
    const session = await runtime.loadSession("s1");

    expect(session.read()?.messages.map((message) => message.id)).toEqual(["m1"]);
    expect(session.read()?.toolCalls).toHaveLength(0);

    session.stepForward();

    expect(session.read()?.messages.map((message) => message.id)).toEqual(["m1", "m2"]);
    expect(session.read()?.toolCalls).toHaveLength(0);

    session.stepForward();

    expect(session.read()?.messages.map((message) => message.id)).toEqual(["m1", "m2", "m3"]);
    expect(session.read()?.toolCalls.map((toolCall) => toolCall.id)).toEqual(["tool-1"]);

    session.stepBackward();
    session.stepBackward();

    expect(session.read()?.messages).toHaveLength(1);
  });
});
