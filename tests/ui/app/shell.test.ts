import { describe, expect, it } from "vitest";
import { formatHomeRelativePath } from "../../../src/ui/app/shell.js";
import { getPhaseLabel } from "../../../src/ui/app/status.js";

describe("app shell helpers", () => {
  it("formats paths relative to the home directory when possible", () => {
    expect(
      formatHomeRelativePath(
        "/Users/bytedance/Documents/projects/personal/kodo",
        "/Users/bytedance",
      ),
    ).toBe("~/Documents/projects/personal/kodo");
    expect(formatHomeRelativePath("/Users/bytedance", "/Users/bytedance")).toBe("~");
  });

  it("maps runtime state to readable phase labels", () => {
    expect(getPhaseLabel(false, "idle")).toBe("standby");
    expect(getPhaseLabel(true, "thinking")).toBe("planning");
    expect(getPhaseLabel(true, "tool-running")).toBe("toolchain");
    expect(getPhaseLabel(true, "streaming")).toBe("transmitting");
  });
});
