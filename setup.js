/**
 * TIỆM BÁNH MITU – setup.js
 * Điền email admin (firestore.rules) và Cloudinary (js/config.js) mà không phải sửa code tay.
 * Chạy:  node setup.js
 * Chạy lại bất cứ lúc nào để đổi; để trống câu trả lời = giữ giá trị hiện tại.
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const RULES  = path.join(__dirname, "firestore.rules");
const CONFIG = path.join(__dirname, "js", "config.js");

// Đọc từng dòng qua iterator để không rơi dòng khi dán/pipe nhiều dòng một lúc
const rl = readline.createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
const ask = async (q, cur) => {
  process.stdout.write(cur ? `${q} [${cur}]: ` : `${q}: `);
  const { value, done } = await lines.next();
  return (done ? "" : value.trim()) || cur || "";
};

(async () => {
  let rules  = fs.readFileSync(RULES, "utf8");
  let config = fs.readFileSync(CONFIG, "utf8");

  // Danh sách email hiện có trong rules
  const listRe = /(request\.auth\.token\.email in \[)([\s\S]*?)(\];)/;
  const curEmails = (rules.match(listRe)?.[2].match(/"([^"]+)"/g) || [])
    .map(s => s.slice(1, -1)).filter(e => e !== "ADMIN_EMAIL@example.com");
  const cloudRe  = /(cloudName:\s*")([^"]*)(")/;
  const presetRe = /(uploadPreset:\s*")([^"]*)(")/;

  console.log("\n— Tiệm bánh Mitu: cấu hình —\n");
  const emailsRaw = await ask("Email admin (nhiều email cách nhau dấu phẩy)", curEmails.join(", "));
  const cloudName = await ask("Cloudinary Cloud name", config.match(cloudRe)?.[2]);
  const preset    = await ask("Cloudinary upload preset", config.match(presetRe)?.[2] || "mitu_upload");
  rl.close();

  const emails = emailsRaw.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const bad = emails.filter(e => !/^[^@\s"]+@[^@\s"]+\.[^@\s"]+$/.test(e));
  if (emails.length === 0 || bad.length) {
    console.error(`\n✗ Email không hợp lệ: ${bad.join(", ") || "(trống)"}`);
    process.exit(1);
  }
  if (!/^[a-z0-9_-]*$/i.test(cloudName) || !/^[a-z0-9_-]+$/i.test(preset)) {
    console.error("\n✗ Cloud name / preset chỉ gồm chữ, số, dấu - và _");
    process.exit(1);
  }

  const list = "\n" + emails.map(e => `          "${e}"`).join(",\n") + "\n        ";
  rules  = rules.replace(listRe, `$1${list}$3`);
  config = config.replace(cloudRe, `$1${cloudName}$3`).replace(presetRe, `$1${preset}$3`);
  fs.writeFileSync(RULES, rules);
  fs.writeFileSync(CONFIG, config);

  console.log("\n✓ Đã ghi firestore.rules và js/config.js");
  if (!cloudName) console.log("! Chưa có Cloud name: admin sẽ chưa upload được ảnh.");
  console.log("\nBước tiếp theo:  firebase deploy --only firestore:rules");
  console.log("(Đổi Cloudinary thì cần commit & push js/config.js để Vercel cập nhật.)\n");
})();
