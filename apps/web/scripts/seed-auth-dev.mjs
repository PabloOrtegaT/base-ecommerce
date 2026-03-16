import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { hashSync } from "bcryptjs";

const require = createRequire(import.meta.url);
const wranglerCliPath = require.resolve("wrangler/bin/wrangler.js");
const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const useRemote = process.argv.includes("--remote");
const usePreview = process.argv.includes("--preview");

const email = process.env.DEV_OWNER_EMAIL ?? "owner@base-ecommerce.local";
const password = process.env.DEV_OWNER_PASSWORD ?? "ChangeMe123!";
const userId = process.env.DEV_OWNER_USER_ID ?? "b2b0caf8-3d7a-4e55-a8ff-7e19633208c7";
const cartId = process.env.DEV_OWNER_CART_ID ?? "aa38b784-84a3-4d9d-9981-eb758568c3a7";
const now = Date.now();
const passwordHash = hashSync(password, 10);

const escapedEmail = email.replace(/'/g, "''");
const escapedHash = passwordHash.replace(/'/g, "''");

const command = [
  `INSERT OR IGNORE INTO "user"`,
  `("id","email","name","role","passwordHash","emailVerified","createdAt","updatedAt")`,
  `VALUES ('${userId}','${escapedEmail}','Dev Owner','owner','${escapedHash}',${now},${now},${now});`,
  `UPDATE "user" SET "name"='Dev Owner',"role"='owner',"passwordHash"='${escapedHash}',"emailVerified"=${now},"updatedAt"=${now}`,
  `WHERE "email"='${escapedEmail}';`,
  `DELETE FROM "authRefreshSession"`,
  `WHERE "userId"=(SELECT "id" FROM "user" WHERE "email"='${escapedEmail}' LIMIT 1);`,
  `INSERT OR IGNORE INTO "cart" ("id","userId","createdAt","updatedAt")`,
  `SELECT '${cartId}', "id", ${now}, ${now} FROM "user" WHERE "email"='${escapedEmail}';`,
  `DELETE FROM "cartItem"`,
  `WHERE "cartId"=(SELECT "id" FROM "cart" WHERE "userId"=(SELECT "id" FROM "user" WHERE "email"='${escapedEmail}' LIMIT 1) LIMIT 1);`,
  `UPDATE "cart" SET "updatedAt"=${now}`,
  `WHERE "userId"=(SELECT "id" FROM "user" WHERE "email"='${escapedEmail}' LIMIT 1);`,
].join(" ");

try {
  const d1Args = [wranglerCliPath, "d1", "execute", "DB", "--config", "wrangler.jsonc"];
  if (useRemote) {
    d1Args.push("--remote");
    if (usePreview) {
      d1Args.push("--preview");
    }
  } else {
    d1Args.push("--local");
  }
  d1Args.push("--command", command);

  execFileSync(
    process.execPath,
    d1Args,
    {
      stdio: "inherit",
      cwd: workspaceDir,
    },
  );
  const targetLabel = useRemote ? (usePreview ? "remote preview" : "remote production") : "local";
  console.log(`[seed] Seeded ${targetLabel} owner user: ${email}`);
  console.log(`[seed] Password: ${password}`);
} catch (error) {
  console.error("[seed] Failed to seed auth data.");
  throw error;
}
