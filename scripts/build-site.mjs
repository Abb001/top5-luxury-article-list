import fs from "node:fs/promises";
import path from "node:path";

const SITE_DIR = path.resolve("_site");
const filesToCopy = ["index.html", "style.css", "app.js"];

async function copyFile(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await copyFile(from, to);
  }
}

await fs.rm(SITE_DIR, { recursive: true, force: true });
await fs.mkdir(SITE_DIR, { recursive: true });
for (const file of filesToCopy) {
  await copyFile(path.resolve(file), path.join(SITE_DIR, file));
}
await copyDir(path.resolve("data"), path.join(SITE_DIR, "data"));
console.log("Built _site");
