import React from "react";
import os from "node:os";
import { createRequire } from "node:module";
import { render } from "ink";
import { bootstrapApp } from "./bootstrap/index.js";
import { App } from "./ui/App.js";
import { formatHomeRelativePath } from "./ui/launch-screen.js";
import type { AppShellInfo } from "./ui/shell-info.js";
import { ThemeProvider } from "./ui/theme-context.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    "Kodo TUI requires an interactive terminal. Run `pnpm dev` in a TTY-enabled terminal session."
  );
  process.exit(1);
}

const { agent, config } = bootstrapApp();
const shell: AppShellInfo = {
  version: packageJson.version,
  modelLabel: [config.llm.model, config.llm.reasoning].filter(Boolean).join(" "),
  directoryLabel: formatHomeRelativePath(config.cwd, os.homedir())
};

render(
  <ThemeProvider theme={config.ui}>
    <App agent={agent} shell={shell} />
  </ThemeProvider>
);
