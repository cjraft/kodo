import { describe, expect, it } from "vitest";
import { resolveAppLayout } from "../../../src/ui/app/layout.js";
import { getBusyLabel } from "../../../src/ui/app/status.js";

describe("app layout helpers", () => {
  it("derives transcript rows from shell chrome and live state", () => {
    expect(
      resolveAppLayout({
        stdoutWidth: 120,
        stdoutHeight: 36,
        busy: true,
        commandMessageVisible: true,
        helpOpen: true,
        expandHintVisible: false,
      }),
    ).toEqual({
      headerCompactLayout: true,
      conversationRows: 15,
    });
  });

  it("builds stable busy labels from the run phase", () => {
    expect(getBusyLabel("tool-running", "bash")).toBe("Running bash...");
    expect(getBusyLabel("streaming", null)).toBe("Streaming response...");
    expect(getBusyLabel("thinking", null)).toBe("Thinking...");
  });
});
