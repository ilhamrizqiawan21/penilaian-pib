// Membangun aplikasi desktop: next build (standalone) -> staging -> rebuild modul native
// untuk Electron -> electron-builder.  Pemakaian: node scripts/build-electron.mjs [--dir]
// --dir hanya menghasilkan folder aplikasi tanpa installer (lebih cepat, untuk uji coba).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const stage = path.join(root, "dist-electron", "stage");
const server = path.join(stage, "server");
const dirOnly = process.argv.includes("--dir");
const reuseStage = process.argv.includes("--reuse-stage"); // lewati next build + staging (iterasi cepat)

function run(label, args, env = {}, cwd = root) {
  console.log(`\n[electron] ${label}`);
  const result = spawnSync(process.execPath, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) { console.error(`[electron] Gagal: ${label}`); process.exit(result.status ?? 1); }
}

if (!reuseStage) {
  // next build menulis ulang tsconfig.json/next-env.d.ts sesuai distDir; kembalikan agar build biasa tetap utuh.
  const touched = ["tsconfig.json", "next-env.d.ts"].map((f) => [path.join(root, f), fs.readFileSync(path.join(root, f))]);
  run("next build (standalone)", [path.join(root, "node_modules/next/dist/bin/next"), "build"], { PIB_STANDALONE: "1" });
  for (const [file, content] of touched) fs.writeFileSync(file, content);

  console.log("\n[electron] menyusun folder staging");
  fs.rmSync(stage, { recursive: true, force: true });
  fs.cpSync(path.join(root, ".next-electron/standalone"), server, { recursive: true, dereference: true });
  fs.cpSync(path.join(root, ".next-electron/static"), path.join(server, ".next-electron/static"), { recursive: true });
  fs.cpSync(path.join(root, "public"), path.join(server, "public"), { recursive: true });
  fs.copyFileSync(path.join(root, "electron/main.cjs"), path.join(stage, "main.cjs"));

  // Jaga-jaga: jangan pernah menyertakan database atau berkas rahasia ke dalam paket.
  const forbidden = /(\.sqlite(-wal|-shm)?$|^\.env)/;
  (function purge(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) purge(full);
      else if (forbidden.test(entry.name) && !full.includes(`${path.sep}node_modules${path.sep}`)) { console.log(`[electron] dibuang dari paket: ${path.relative(stage, full)}`); fs.rmSync(full); }
    }
  })(server);

  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ name: "pib-penilaian", productName: "PIB Penilaian", version: pkg.version, description: "Aplikasi lokal Penilaian Praktik Ibadah", author: "PIB Penilaian", main: "main.cjs" }, null, 2));

  // better-sqlite3 hasil standalone dibuat untuk Node biasa; ambil binary prebuilt untuk ABI Electron.
  const electronVersion = require("electron/package.json").version;
  const sqliteDir = path.join(server, "node_modules/better-sqlite3");
  run(`better-sqlite3 untuk Electron ${electronVersion}`, [path.join(root, "node_modules/prebuild-install/bin.js"), "--runtime", "electron", "--target", electronVersion, "--arch", "x64", "--platform", "win32"], {}, sqliteDir);
}

// electron-builder tidak menyalin node_modules pada extraResources, jadi paket dibuat dua tahap:
// (1) folder aplikasi, (2) salin server/node_modules secara manual, (3) installer dari folder itu.
const builder = path.join(root, "node_modules/electron-builder/cli.js");
const unpacked = path.join(root, "dist-electron/release/win-unpacked");
fs.rmSync(path.join(root, "dist-electron/release"), { recursive: true, force: true });
run("electron-builder (folder aplikasi)", [builder, "--config", "electron-builder.yml", "--win", "dir", "--x64"]);
fs.cpSync(path.join(server, "node_modules"), path.join(unpacked, "resources/server/node_modules"), { recursive: true });
if (!dirOnly) run("electron-builder (installer)", [builder, "--config", "electron-builder.yml", "--win", "nsis", "--x64", "--prepackaged", unpacked]);
console.log("\n[electron] selesai: dist-electron/release");
