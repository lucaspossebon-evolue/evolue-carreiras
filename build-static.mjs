import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const files = [
  "index.html",
  "app.js",
  "auth.js",
  "config.js",
  "styles.css",
  "ats-score.html",
  "admin.html",
  "admin.css",
  "admin.js",
  "supabase-admin-setup.sql"
];

const folders = ["Ativos", "assets"];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of files) {
  if (existsSync(file)) await cp(file, `dist/${file}`);
}

for (const folder of folders) {
  if (existsSync(folder)) await cp(folder, `dist/${folder}`, { recursive: true });
}

console.log("Build estatico gerado em dist/");
