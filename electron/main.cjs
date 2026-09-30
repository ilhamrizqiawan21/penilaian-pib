// Proses utama Electron: menjalankan server Next.js (standalone) sebagai proses anak
// pada 127.0.0.1, lalu menampilkannya di jendela aplikasi. Data disimpan di
// %APPDATA%\PIB-Penilaian, terpisah dari folder instalasi sehingga aman saat update/uninstall.
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const PREFERRED_PORT = 43117; // port tetap agar localStorage (draft penilaian) tidak hilang antar sesi
const dataDir = process.env.PIB_DATA_DIR ? path.resolve(process.env.PIB_DATA_DIR) : path.join(app.getPath("appData"), "PIB-Penilaian");
const logDir = path.join(dataDir, "logs");
app.setPath("userData", path.join(dataDir, "electron"));

let child = null;
let win = null;
let origin = "";
let quitting = false;

const serverDir = () => (app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "server"));

function sessionSecret() {
  const file = path.join(dataDir, "session-secret");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 32) return existing;
  } catch {}
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

function freePort(port) {
  return new Promise((resolve) => {
    const probe = net.createServer().once("error", () => resolve(0)).once("listening", () => probe.close(() => resolve(port)));
    probe.listen(port, "127.0.0.1");
  });
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (!child) return reject(new Error("Server berhenti sebelum siap"));
      const req = http.get(url, (res) => { res.resume(); resolve(); });
      req.on("error", () => (Date.now() > deadline ? reject(new Error("Server tidak merespons")) : setTimeout(attempt, 250)));
      req.setTimeout(2000, () => req.destroy());
    };
    attempt();
  });
}

async function startServer() {
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, "server.log");
  try { if (fs.statSync(logFile).size > 2_000_000) fs.rmSync(logFile); } catch {}
  const log = fs.createWriteStream(logFile, { flags: "a" });
  const port = (await freePort(PREFERRED_PORT)) || (await new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); }));
  origin = `http://127.0.0.1:${port}`;
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", PIB_DATA_DIR: dataDir, SESSION_SECRET: sessionSecret() };
  delete env.DATABASE_URL;
  child = spawn(process.execPath, [path.join(serverDir(), "server.js")], { cwd: serverDir(), env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  child.once("exit", (code) => {
    child = null;
    log.end();
    if (!quitting) {
      dialog.showErrorBox("PIB Penilaian", `Server aplikasi berhenti (kode ${code}).\nRincian: ${logFile}`);
      app.quit();
    }
  });
  await waitForServer(origin + "/", 45_000);
}

function createWindow() {
  win = new BrowserWindow({ width: 1280, height: 820, minWidth: 900, minHeight: 600, title: "PIB Penilaian", backgroundColor: "#ffffff", show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) return { action: "allow" };
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(origin)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });
  win.on("closed", () => { win = null; });
  return win.loadURL(origin + "/");
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Berkas", submenu: [
      { label: "Buka folder data", click: () => shell.openPath(dataDir) },
      { label: "Buka folder backup", click: () => shell.openPath(process.env.PIB_BACKUP_DIR || path.join(dataDir, "backups")) },
      { type: "separator" },
      { role: "quit", label: "Keluar" },
    ] },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "Tampilan", submenu: [{ role: "reload" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "togglefullscreen" }] },
  ]));
}

if (!app.requestSingleInstanceLock()) {
  app.quit(); // dua instance akan berebut database yang sama
} else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    fs.mkdirSync(dataDir, { recursive: true });
    buildMenu();
    try {
      await startServer();
      await createWindow();
    } catch (error) {
      dialog.showErrorBox("PIB Penilaian", `Aplikasi gagal dimulai: ${error.message}\nRincian: ${path.join(logDir, "server.log")}`);
      app.quit();
    }
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => { quitting = true; if (child) child.kill(); });
}
