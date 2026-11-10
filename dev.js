/**
 * TIỆM BÁNH MITU – dev.js
 * Server chạy web trên máy, giống Vercel: phục vụ file tĩnh và chạy các hàm trong api/ (AI agent).
 * Thường không cần gọi tay: nháy đúp start.bat (trang khách) hoặc admin.bat (trang admin).
 *
 *   node dev.js                    chạy server
 *   node dev.js --open admin.html  chạy server (hoặc dùng server đang chạy) rồi mở trình duyệt
 *
 * Cần file .env.local (không commit) với:
 *   GEMINI_API_KEY=...
 *   ADMIN_EMAILS=email-admin@gmail.com
 */
const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const FIRST_PORT = Number(process.env.PORT) || 3000;
const PING_PATH = "/__mitu-dev";

const openArg = process.argv.indexOf("--open");
const OPEN_PAGE = openArg === -1 ? null : (process.argv[openArg + 1] || "").replace(/^\/+/, "");

// ── Nạp .env.local (KEY=VALUE mỗi dòng) ─────────────────────
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ── Giống Vercel: không phục vụ file trong .vercelignore, file ẩn (.env.local, .git…) ──
const IGNORED = new Set(
  fs.existsSync(path.join(ROOT, ".vercelignore"))
    ? fs.readFileSync(path.join(ROOT, ".vercelignore"), "utf8").split(/\r?\n/)
        .map(s => s.trim().replace(/^\/+|\/+$/g, "")).filter(s => s && !s.startsWith("#"))
    : []
);
function isPrivate(rel) {
  const parts = rel.split("/").filter(Boolean);
  if (parts.some(p => p.startsWith("."))) return true;               // .env.local, .git, .firebase…
  if (parts[0] === "api" || parts[0] === "node_modules") return true;  // mã nguồn server
  return parts.some((_, i) => IGNORED.has(parts.slice(0, i + 1).join("/")));
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

const MAX_BODY = 4.5 * 1024 * 1024; // giới hạn request của Vercel
const notFound = res => { res.statusCode = 404; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("404 – Không tìm thấy"); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === PING_PATH) {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ mitu: true }));
  }

  // ── Hàm serverless: /api/<tên> → api/<tên>.js ──
  if (url.pathname.startsWith("/api/")) {
    const name = url.pathname.slice(5).replace(/\.js$/, "");
    if (!/^[a-z0-9-]+$/i.test(name)) return notFound(res);
    const file = path.join(ROOT, "api", `${name}.js`);
    if (!fs.existsSync(file)) return notFound(res);

    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > MAX_BODY) { res.statusCode = 413; return res.end(JSON.stringify({ error: "Dữ liệu gửi lên quá lớn." })); }
      chunks.push(c);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
    try {
      await require(file)(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: "Lỗi server" })); }
    }
    return;
  }

  // ── File tĩnh ──
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return notFound(res); }
  if (rel.endsWith("/")) rel += "index.html";
  const filePath = path.normalize(path.join(ROOT, rel));
  const relPosix = path.relative(ROOT, filePath).split(path.sep).join("/");
  if (relPosix.startsWith("..") || path.isAbsolute(relPosix) || isPrivate(relPosix)) return notFound(res);

  fs.readFile(filePath, (err, buf) => {
    if (err) return notFound(res);
    res.setHeader("Content-Type", TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(buf);
  });
});

// ── Khởi động: dùng lại server đang chạy, hoặc tìm cổng trống ──
function openBrowser(port) {
  // "localhost" (không phải 127.0.0.1) vì Firebase Auth mặc định chỉ cho phép localhost
  const url = `http://localhost:${port}/${OPEN_PAGE || ""}`;
  console.log(`Mở trình duyệt: ${url}`);
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
}

const HOSTS = ["127.0.0.1", "[::1]"]; // "localhost" trên Windows có thể là một trong hai

async function findRunning(port) {
  for (const host of HOSTS) {
    try {
      const r = await fetch(`http://${host}:${port}${PING_PATH}`, { signal: AbortSignal.timeout(800) });
      if ((await r.json()).mitu === true) return true;
    } catch { /* không phải server Mitu */ }
  }
  return false;
}

// Windows cho 2 chương trình cùng giữ một cổng (một bên IPv4, một bên IPv6), nên phải
// tự hỏi xem có ai đang nghe ở cổng này chưa, kể cả khi listen() không báo lỗi.
function portTaken(port) {
  return Promise.all(HOSTS.map(h => new Promise(resolve => {
    const sock = net.connect({ host: h.replace(/[[\]]/g, ""), port });
    sock.setTimeout(500);
    sock.once("connect", () => { sock.destroy(); resolve(true); });
    sock.once("timeout", () => { sock.destroy(); resolve(false); });
    sock.once("error", () => resolve(false));
  }))).then(r => r.some(Boolean));
}

function listen(port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    // Chỉ nghe trên máy này: máy khác trong cùng Wi-Fi không truy cập được
    server.listen(port, "127.0.0.1", () => { server.off("error", reject); resolve(); });
  });
}

(async () => {
  for (let port = FIRST_PORT; port < FIRST_PORT + 10; port++) {
    if (await findRunning(port)) {
      console.log(`Web Tiệm bánh Mitu đang chạy sẵn ở cổng ${port}.`);
      if (OPEN_PAGE !== null) openBrowser(port);
      return;
    }
    if (await portTaken(port)) continue; // phần mềm khác đang dùng cổng này
    try {
      await listen(port);
    } catch (err) {
      if (err.code === "EADDRINUSE") continue; // cổng bị phần mềm khác dùng → thử cổng kế
      throw err;
    }
    console.log("============================================================");
    console.log(`  Trang khách : http://localhost:${port}/`);
    console.log(`  Trang admin : http://localhost:${port}/admin.html`);
    console.log("  ĐỪNG TẮT cửa sổ này khi đang dùng web. Tắt cửa sổ = tắt web.");
    console.log("============================================================");
    if (!process.env.GEMINI_API_KEY) console.log("⚠️  Thiếu file .env.local (GEMINI_API_KEY) – web vẫn chạy nhưng nút AI sẽ báo lỗi.");
    if (OPEN_PAGE !== null) openBrowser(port);
    return;
  }
  console.error(`Không tìm được cổng trống từ ${FIRST_PORT} đến ${FIRST_PORT + 9}.`);
  process.exitCode = 1;
})();
