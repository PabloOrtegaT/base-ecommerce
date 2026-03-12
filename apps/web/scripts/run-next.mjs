#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-next.mjs <next-command>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextCli, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_IGNORE_INCORRECT_LOCKFILE: process.env.NEXT_IGNORE_INCORRECT_LOCKFILE ?? "1",
  },
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
