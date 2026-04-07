import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentService } from "../../../src/core/agent/service.js";
import { ContextBuilder } from "../../../src/core/context/builder.js";
import type { AgentEvent } from "../../../src/core/agent/types.js";
import type { LlmClient, ModelRequest, ModelResponseEvent } from "../../../src/core/llm/types.js";
import { SessionStore } from "../../../src/core/session/store.js";
import { ToolRegistry } from "../../../src/core/tools/registry.js";

const tempDirs: string[] = [];

class TestCommandClient implements LlmClient {
  readonly name = "test/command-client";

  async *stream(input: ModelRequest): AsyncIterable<ModelResponseEvent> {
    const latestMessage = input.messages.at(-1);
    const latestUserMessage = [...input.messages]
      .reverse()
      .find((message) => message.role === "user");
    const text = latestUserMessage?.text.trim() ?? "";

    if (latestMessage?.role === "tool") {
      yield { type: "text-delta", text: "I received the tool result.\n\n" };
      yield { type: "text-delta", text: latestMessage.text };
      yield { type: "done", stopReason: "end_turn" };
      return;
    }

    if (text.startsWith("/bash ")) {
      yield {
        type: "tool-call",
        toolCall: {
          id: "tool-call-1",
          toolName: "bash",
          input: text.slice(6),
        },
      };
      yield { type: "done", stopReason: "tool_use" };
      return;
    }

    yield { type: "text-delta", text: "No response." };
    yield { type: "done", stopReason: "end_turn" };
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

const createRuntime = (storeRoot: string) =>
  new AgentService({
    cwd: process.cwd(),
    store: new SessionStore(storeRoot),
    tools: new ToolRegistry(),
    llm: new TestCommandClient(),
    loop: {
      maxToolIterations: 8,
    },
    contextBuilder: new ContextBuilder({
      maxInputTokens: 8_000,
      maxMessages: 64,
    }),
  });

describe("AgentService", () => {
  it("runs a tool-backed turn and persists it", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-runtime-"));
    tempDirs.push(dir);

    const runtime = createRuntime(dir);
    const session = await runtime.loadLatestSession();
    const eventTypes: string[] = [];
    const unsubscribe = session.subscribe((event: AgentEvent) => {
      eventTypes.push(event.type);
    });

    await session.run("/bash pwd");
    unsubscribe();

    const snapshot = session.read();

    expect(snapshot?.toolCalls).toHaveLength(1);
    expect(snapshot?.messages.at(-1)?.text).toContain(process.cwd());
    expect(eventTypes).toContain("text-delta");
    expect(eventTypes).toContain("done");
  });

  it("can create and load an explicit session id", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-runtime-session-"));
    tempDirs.push(dir);

    const runtime = createRuntime(dir);
    const createdSession = await runtime.createSession();

    await createdSession.run("/bash pwd");

    const loadedSession = await runtime.loadSession(createdSession.id);

    expect(loadedSession.id).toBe(createdSession.id);
    expect(loadedSession.read()?.toolCalls).toHaveLength(1);
  });

  it("creates a fresh session even when previous sessions exist", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kodo-runtime-fresh-"));
    tempDirs.push(dir);

    const runtime = createRuntime(dir);
    const firstSession = await runtime.createSession();

    await firstSession.run("/bash pwd");

    const secondSession = await runtime.createSession();
    const sessions = await runtime.listSessions();

    expect(secondSession.id).not.toBe(firstSession.id);
    expect(secondSession.read()?.messages).toHaveLength(0);
    expect(sessions.map((sessionMeta) => sessionMeta.id)).toEqual([secondSession.id, firstSession.id]);
  });
});
