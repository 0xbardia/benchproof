import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, ".vercel/output/functions/__server.func/_libs");
const assets = ["pglite.data", "pglite.wasm", "initdb.wasm"];

await mkdir(target, { recursive: true });
await Promise.all(
  assets.map((asset) =>
    copyFile(join(root, "node_modules/@electric-sql/pglite/dist", asset), join(target, asset)),
  ),
);
console.log(`[build] copied ${assets.length} PGlite runtime assets`);
