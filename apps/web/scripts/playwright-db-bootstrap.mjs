#!/usr/bin/env node

import { spawnSync } from "node:child_process";

function runOrExit(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: false,
  });

  if (result.status === 0) {
    return;
  }

  process.exit(result.status ?? 1);
}

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

runOrExit(npxCommand, ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--config", "wrangler.jsonc"]);
runOrExit(process.execPath, ["./scripts/seed-auth-dev.mjs"]);
