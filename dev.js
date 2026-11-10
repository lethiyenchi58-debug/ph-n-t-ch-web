/**
 * TIỆM BÁNH MITU – dev.js
 * Server chạy thử trên máy, giống Vercel: phục vụ file tĩnh và chạy các hàm trong api/.
 *   1. Tạo file .env.local (không commit) với:
 *        GEMINI_API_KEY=...
 *        ADMIN_EMAILS=email-admin@gmail.com
 *   2. node dev.js   → mở http://localhost:3000/admin.html
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

// Nạp .env.local (KEY=VALUE mỗi dòng)
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, "");
    const file = path.join(ROOT, "api", `${name}.js`);
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end("Not found"); }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    try {
      await require(file)(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Lỗi server" }));
    }
    return;
  }

  let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`Tiệm bánh Mitu (dev) chạy tại http://localhost:${PORT}/  –  admin: http://localhost:${PORT}/admin.html`);
  if (!process.env.GEMINI_API_KEY) console.log("⚠️  Chưa có GEMINI_API_KEY trong .env.local – AI agent sẽ báo lỗi.");
});
