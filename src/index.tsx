import React from "react";
import { render } from "ink";
import { bootstrapApp } from "./bootstrap/index.js";
import { App } from "./ui/App.js";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    "Kodo TUI requires an interactive terminal. Run `pnpm dev` in a TTY-enabled terminal session."
  );
  process.exit(1);
}

const { agent } = bootstrapApp();

render(<App agent={agent} />);
