import { describe, expect, it, vi } from "vitest";
import { appCommandDefinitions, matchAppCommand } from "../../../src/ui/app/commands.js";

describe("app commands", () => {
  it("matches slash commands and aliases from the shared registry", () => {
    expect(matchAppCommand("/help")).toMatchObject({
      command: expect.objectContaining({ name: "help" }),
      args: "",
    });
    expect(matchAppCommand("/commands")).toMatchObject({
      command: expect.objectContaining({ name: "help" }),
      args: "",
    });
    expect(matchAppCommand("/resume abc123")).toMatchObject({
      command: expect.objectContaining({ name: "resume" }),
      args: "abc123",
    });
  });

  it("exposes stable help metadata for every registered command", () => {
    expect(
      appCommandDefinitions.map((command) => ({
        name: command.name,
        usage: command.usage,
        summary: command.summary,
      })),
    ).toEqual([
      {
        name: "help",
        usage: "/help",
        summary: "Toggle the command reference panel.",
      },
      {
        name: "focus",
        usage: "/focus",
        summary: "Close open panels and return to the transcript.",
      },
      {
        name: "resume",
        usage: "/resume [session-id-prefix]",
        summary: "Load the previous session or a specific session prefix.",
      },
      {
        name: "exit",
        usage: "/exit",
        summary: "Leave the application.",
      },
    ]);
  });

  it("runs command handlers through the semantic command context", async () => {
    const context = {
      exit: vi.fn(),
      toggleHelp: vi.fn(),
      focusTranscript: vi.fn(),
      resume: vi.fn(async () => {}),
    };

    await appCommandDefinitions[0]?.execute("", context);
    await appCommandDefinitions[1]?.execute("", context);
    await appCommandDefinitions[2]?.execute("abc123", context);
    await appCommandDefinitions[3]?.execute("", context);

    expect(context.toggleHelp).toHaveBeenCalledTimes(1);
    expect(context.focusTranscript).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledWith("abc123");
    expect(context.exit).toHaveBeenCalledTimes(1);
  });
});
