import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const wranglerCliPath = require.resolve("wrangler/bin/wrangler.js");
const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const useRemote = process.argv.includes("--remote");
const usePreview = process.argv.includes("--preview");
const profile = process.env.STORE_PROFILE ?? "pc-components";
const now = Date.now();

const inventorySeedsByProfile = {
  "pc-components": [
    {
      variantId: "d4ac5f5e-c432-4667-937f-7f1356e7674a",
      onHandQty: 9,
    },
  ],
  "prints-3d": [
    {
      variantId: "a3e99316-c66b-44eb-8f22-f7ec22a4329d",
      onHandQty: 14,
    },
    {
      variantId: "36d3a95a-e2e4-4332-8085-31f62f471f31",
      onHandQty: 7,
    },
  ],
  "plant-seeds": [
    {
      variantId: "49f3192f-e4c6-4262-8dda-614e92db9e3f",
      onHandQty: 0,
    },
  ],
};

const seedRows = inventorySeedsByProfile[profile];
if (!seedRows) {
  const validProfiles = Object.keys(inventorySeedsByProfile).join(", ");
  throw new Error(`Unsupported STORE_PROFILE "${profile}". Supported values: ${validProfiles}`);
}

const valuesClause = seedRows
  .map((row) => `('${row.variantId}', ${row.onHandQty}, ${row.onHandQty}, ${now}, ${now})`)
  .join(", ");

const command = [
  `INSERT INTO "inventoryStock" ("variantId","onHandQty","availableQty","createdAt","updatedAt")`,
  `VALUES ${valuesClause}`,
  `ON CONFLICT("variantId") DO UPDATE SET`,
  `"onHandQty"=excluded."onHandQty",`,
  `"availableQty"=excluded."availableQty",`,
  `"updatedAt"=excluded."updatedAt";`,
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

  execFileSync(process.execPath, d1Args, {
    stdio: "inherit",
    cwd: workspaceDir,
  });

  const targetLabel = useRemote ? (usePreview ? "remote preview" : "remote production") : "local";
  console.log(`[seed] Seeded ${targetLabel} inventory for profile: ${profile}`);
  console.log(`[seed] Variants seeded: ${seedRows.length}`);
} catch (error) {
  console.error("[seed] Failed to seed inventory data.");
  throw error;
}
