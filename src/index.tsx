#!/usr/bin/env node
import React from "react";
import os from "node:os";
import { createRequire } from "node:module";
import { render } from "ink";
import { bootstrapAgent, resolveAppConfig } from "./bootstrap/index.js";
import { SessionStore } from "./core/session/store.js";
import { ReplayRuntime } from "./core/replay/runtime.js";
import { App } from "./ui/App.js";
import { formatHomeRelativePath, type AppShellInfo } from "./ui/app/shell.js";
import { ReplayRoot } from "./ui/replay/ReplayRoot.js";
import { disableTerminalMouseTracking } from "./ui/terminal/mouse-tracking.js";
import { ThemeProvider } from "./ui/theme/context.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    "Kodo TUI requires an interactive terminal. Run `pnpm dev` in a TTY-enabled terminal session.",
  );
  process.exit(1);
}

disableTerminalMouseTracking((value) => {
  process.stdout.write(value);
});

const config = resolveAppConfig();

const shell: AppShellInfo = {
  version: packageJson.version,
  modelLabel: [config.llm.model, config.llm.reasoning].filter(Boolean).join(" "),
  directoryLabel: formatHomeRelativePath(config.cwd, os.homedir()),
};

const liveShell: AppShellInfo = {
  ...shell,
  hintLabel: "/help for commands",
};

const replayShell: AppShellInfo = {
  ...shell,
  modelLabel: `replay debugger · ${shell.modelLabel}`.trim(),
  hintLabel: "j/k to step · Enter to open session",
};

render(
  <ThemeProvider theme={config.ui}>
    {config.debug.replay ? (
      <ReplayRoot
        runtime={new ReplayRuntime(new SessionStore(config.storeRoot))}
        shell={replayShell}
      />
    ) : (
      <App agent={bootstrapAgent(config)} startup={{ type: "create" }} shell={liveShell} />
    )}
  </ThemeProvider>,
);
