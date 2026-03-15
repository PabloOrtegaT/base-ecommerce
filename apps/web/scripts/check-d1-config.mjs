#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const wranglerConfigPath = path.resolve(process.cwd(), "wrangler.jsonc");

function fail(message) {
  console.error(`[cf:preflight] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(wranglerConfigPath)) {
  fail(`Could not find wrangler config at "${wranglerConfigPath}".`);
}

const configContent = fs.readFileSync(wranglerConfigPath, "utf8");

const captureValue = (key) => {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`);
  const match = configContent.match(keyPattern);
  return match?.[1]?.trim() ?? "";
};

const databaseId = captureValue("database_id");
const previewDatabaseId = captureValue("preview_database_id");

if (!databaseId) {
  fail('Missing "database_id" in wrangler.jsonc.');
}

if (!previewDatabaseId) {
  fail('Missing "preview_database_id" in wrangler.jsonc.');
}

if (databaseId === PLACEHOLDER_ID) {
  fail('Production "database_id" is still the placeholder value. Replace it with your real D1 database ID.');
}

if (previewDatabaseId === PLACEHOLDER_ID) {
  fail('Preview "preview_database_id" is still the placeholder value. Replace it with your real D1 preview database ID.');
}

if (!UUID_RE.test(databaseId)) {
  fail(`Production "database_id" is not a valid UUID: "${databaseId}".`);
}

if (!UUID_RE.test(previewDatabaseId)) {
  fail(`Preview "preview_database_id" is not a valid UUID: "${previewDatabaseId}".`);
}

if (databaseId === previewDatabaseId) {
  fail("Production and preview D1 IDs must be different for the selected topology.");
}

console.log("[cf:preflight] D1 configuration looks valid.");
