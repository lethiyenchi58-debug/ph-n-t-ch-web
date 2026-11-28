/**
 * Sinh 3 file workflow n8n trong n8n/workflows/ từ một nguồn duy nhất.
 * Người dùng KHÔNG cần chạy file này – các file .json đã có sẵn.
 * Chỉ chạy lại khi sửa logic:   node n8n/tools/build-workflows.js
 *
 * Mọi khoá / ID đọc từ biến môi trường ($env), do n8n.bat nạp từ .env.local,
 * nên workflow không chứa bí mật và không cần tạo "Credentials" trong n8n.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OUT = path.join(__dirname, "..", "workflows");
const uid = () => crypto.randomUUID();
/** Lấy thân hàm làm mã cho Code node (viết JS thật, khỏi lo escape chuỗi). */
const body = fn => {
  const s = fn.toString();
  return s.slice(s.indexOf("{") + 1, s.lastIndexOf("}")).replace(/^\n/, "").replace(/\n {4}/g, "\n").trim() + "\n";
};

// ───────────────────────── Mã dùng chung trong các Code node ─────────────────────────
const SHARED = body(function () {
    // ===== Hàm dùng chung (giống nhau ở mọi workflow Mitu) =====
    const FIRESTORE = "https://firestore.googleapis.com/v1/projects/mitu-bakery/databases/(default)/documents";
    function fsVal(v) {
      if (!v) return null;
      if ("stringValue" in v) return v.stringValue;
      if ("integerValue" in v) return Number(v.integerValue);
      if ("doubleValue" in v) return v.doubleValue;
      if ("booleanValue" in v) return v.booleanValue;
      if ("arrayValue" in v) return (v.arrayValue.values || []).map(fsVal);
      if ("mapValue" in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = fsVal(x); return o; }
      if ("timestampValue" in v) return v.timestampValue;
      return null;
    }
    function fsDoc(d) { const o = { id: d.name.split("/").pop() }; for (const [k, x] of Object.entries(d.fields || {})) o[k] = fsVal(x); return o; }
    async function loadShop(helpers) {
      const get = url => helpers.httpRequest({ url, json: true });
      const [cakesRes, todayRes, shopRes] = await Promise.all([
        get(FIRESTORE + "/cakes?pageSize=300"), get(FIRESTORE + "/settings/today"), get(FIRESTORE + "/settings/shop"),
      ]);
      const cakes = (cakesRes.documents || []).map(fsDoc).filter(c => c.name);
      return { cakes, today: fsDoc(todayRes), shop: fsDoc(shopRes) };
    }
    function readConfig(file) {
      const fsm = require("fs"), p = require("path");
      const full = p.join($env.MITU_DIR || "", "n8n", "cau-hinh", file);
      try {
        return fsm.readFileSync(full, "utf8").split(/\r?\n/).filter(l => !l.trim().startsWith("#")).join("\n").trim();
      } catch (e) { throw new Error("Không đọc được file " + full + " (mở n8n bằng n8n.bat nhé). " + e.message); }
    }
    /** doi-thu.txt: dòng "@khu-vuc: …", "@tu-tim: 5", còn lại là "Tên | link" */
    function parseDoiThu(text) {
      const cfg = { khu_vuc: "Vạn Phúc, Hà Đông, Hà Nội", tu_tim: 5, thu_cong: [] };
      for (const raw of String(text || "").split("\n")) {
        const l = raw.trim();
        if (!l) continue;
        const m = l.match(/^@\s*([^:]+?)\s*:\s*(.*)$/);
        if (m) {
          const key = norm(m[1]).replace(/[\s_]/g, "-");
          if (key === "khu-vuc" && m[2].trim()) cfg.khu_vuc = m[2].trim();
          if (key === "tu-tim") cfg.tu_tim = Math.max(0, Math.min(8, parseInt(m[2], 10) || 0));
          continue;
        }
        const [ten, link = ""] = l.split("|").map(s => s.trim());
        if (ten) cfg.thu_cong.push({ ten, link: link.replace(/\s+#.*$/, "") });
      }
      return cfg;
    }
    const CATEGORY = { birthday: "Bánh sinh nhật", mini: "Bánh Mini", fruit: "Bánh Hoa quả", square: "Bánh Vuông", male: "Bánh cho Nam", female: "Bánh cho Nữ", boy: "Bánh cho Bé Trai", girl: "Bánh cho Bé Gái", troll: "Bánh Troll & Vui nhộn" };
    const vnd = n => Number(n || 0).toLocaleString("vi-VN") + "đ";
    const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();
    const escHtml = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cakeLine = c => `${c.name} | ${CATEGORY[c.category] || c.category || ""} | ${vnd(c.price)}${c.bestseller ? " | bán chạy" : ""}${c.desc ? " | " + String(c.desc).slice(0, 90) : ""}`;
    function geminiText(r) {
      const parts = (r && r.candidates && r.candidates[0] && r.candidates[0].content && r.candidates[0].content.parts) || [];
      return parts.filter(p => p.text && !p.thought).map(p => p.text).join("").trim();
    }
    function geminiJson(r) {
      const t = geminiText(r).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      return JSON.parse(t);
    }
    /** Tìm số tiền trong câu: 350.000đ, 350k, 350 nghìn, 1.2tr … → số VNĐ */
    function moneyIn(text) {
      const out = [];
      const re = /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|đ|vnđ|vnd|đồng)(?![a-zà-ỹ])/gi;
      let m;
      while ((m = re.exec(String(text || "")))) {
        const unit = m[2].toLowerCase();
        let n = /[.,]\d{3}(?!\d)/.test(m[1]) && !/^(k|nghìn|ngàn|tr|triệu)$/.test(unit)
          ? Number(m[1].replace(/[.,]/g, "")) : Number(m[1].replace(",", "."));
        if (/^(k|nghìn|ngàn)$/.test(unit)) n *= 1000;
        if (/^(tr|triệu)$/.test(unit)) n *= 1000000;
        if (n >= 1000) out.push(Math.round(n));
      }
      return out;
    }
    // Trạng thái lưu ra file (n8n-data/mitu-trang-thai.json) – giữ được cả khi bấm chạy tay
    function stateFile() { return require("path").join($env.MITU_DIR || "", "n8n-data", "mitu-trang-thai.json"); }
    function readState() { try { return JSON.parse(require("fs").readFileSync(stateFile(), "utf8")); } catch (e) { return {}; } }
    function writeState(patch) {
      const s = { ...readState(), ...patch };
      try { require("fs").mkdirSync(require("path").dirname(stateFile()), { recursive: true }); require("fs").writeFileSync(stateFile(), JSON.stringify(s, null, 2)); } catch (e) { /* bỏ qua */ }
      return s;
    }
    const sameDay = (a, b) => { const p = s => String(s || "").split("/").map(Number).join("/"); return p(a) === p(b); };
    // ===== Hết phần dùng chung =====
});

// ───────────────────────── Dựng node ─────────────────────────
function node(name, type, typeVersion, parameters, position, extra = {}) {
  return { parameters, id: uid(), name, type, typeVersion, position, ...extra };
}
const code = (name, fn, pos, extra = {}) =>
  node(name, "n8n-nodes-base.code", 2, { jsCode: SHARED + "\n" + body(fn) }, pos, extra);
const sticky = (content, pos, width, height, color = 7) =>
  node("Ghi chú " + uid().slice(0, 6), "n8n-nodes-base.stickyNote", 1, { content, width, height, color }, pos);
const manual = pos => node("▶️ Bấm để chạy thử", "n8n-nodes-base.manualTrigger", 1, {}, pos);

function http(name, { method = "POST", url, json, headers, batch, timeout = 60000, onError, retry = true }, pos) {
  const p = { method, url, options: { timeout } };
  if (headers) p.sendHeaders = true, p.headerParameters = { parameters: Object.entries(headers).map(([n, v]) => ({ name: n, value: v })) };
  if (json) p.sendBody = true, p.specifyBody = "json", p.jsonBody = json;
  if (batch) p.options.batching = { batch: { batchSize: 1, batchInterval: batch } };
  const extra = {};
  if (retry) Object.assign(extra, { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 });
  if (onError) extra.onError = onError;
  return node(name, "n8n-nodes-base.httpRequest", 4.2, p, pos, extra);
}
const gemini = (name, pos, opts = {}) => http(name, {
  url: "=https://generativelanguage.googleapis.com/v1beta/models/{{ $json.model || $env.GEMINI_MODEL || 'gemini-3.6-flash' }}:generateContent",
  headers: { "x-goog-api-key": "={{ $env.GEMINI_API_KEY }}" },
  json: "={{ JSON.stringify($json.gemini_body) }}",
  timeout: opts.timeout || 90000, batch: opts.batch, onError: opts.onError,
}, pos);
const telegram = (name, pos) => http(name, {
  url: "=https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage",
  json: "={{ JSON.stringify({ chat_id: $env.TELEGRAM_CHAT_ID, text: $json.telegram_text, parse_mode: 'HTML', disable_web_page_preview: true }) }}",
  timeout: 20000, onError: "continueRegularOutput",
}, pos);
const fbUrl = edge => `=https://graph.facebook.com/{{ $env.FACEBOOK_GRAPH_VERSION || 'v23.0' }}/${edge}`;

function ifNode(name, leftValue, pos) {
  return node(name, "n8n-nodes-base.if", 2.2, {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{ id: uid(), leftValue, rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
      combinator: "and",
    },
    looseTypeValidation: true,
    options: {},
  }, pos);
}
function switchNode(name, leftValue, cases, pos) {
  return node(name, "n8n-nodes-base.switch", 3.2, {
    rules: {
      values: cases.map(([value, label]) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
          conditions: [{ id: uid(), leftValue, rightValue: value, operator: { type: "string", operation: "equals" } }],
          combinator: "and",
        },
        renameOutput: true, outputKey: label,
      })),
    },
    looseTypeValidation: true,
    options: {},
  }, pos);
}
function webhook(name, method, pathName, responseMode, pos, options = {}) {
  return node(name, "n8n-nodes-base.webhook", 2, { httpMethod: method, path: pathName, responseMode, options }, pos, { webhookId: uid() });
}
const respond = (name, respondWith, responseBody, pos) =>
  node(name, "n8n-nodes-base.respondToWebhook", 1.1, { respondWith, responseBody, options: {} }, pos);

/** connections: [[from, to, fromOutput=0]] */
function wire(list) {
  const c = {};
  for (const [from, to, out = 0] of list) {
    c[from] ??= { main: [] };
    while (c[from].main.length <= out) c[from].main.push([]);
    c[from].main[out].push({ node: to, type: "main", index: 0 });
  }
  return c;
}
function save(file, wf) {
  fs.mkdirSync(OUT, { recursive: true });
  const data = {
    id: wf.id, name: wf.name, active: false, nodes: wf.nodes, connections: wire(wf.wires),
    settings: { executionOrder: "v1", timezone: "Asia/Ho_Chi_Minh", saveManualExecutions: true, callerPolicy: "workflowsFromSameOwner" },
    pinData: {}, tags: [],
  };
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(data, null, 2) + "\n");
  console.log("✓", file, `(${wf.nodes.length} node)`);
}

const X = i => 240 + i * 240;

// ═════════════════════════════════════════════════════════════
// WF2 – Theo dõi đối thủ hằng tuần
// ═════════════════════════════════════════════════════════════
{
  const nodes = [
    sticky("## WF2 · Theo dõi đối thủ mỗi tuần\nThứ Hai 7:00, n8n tự:\n1. **Tự tìm** tiệm bánh quanh khu vực (Tavily + AI lọc) và gộp với danh sách trong **n8n/cau-hinh/doi-thu.txt**\n2. Tìm trên web (Tavily) tin mới về từng tiệm + xu hướng bánh\n3. So với kho bánh Mitu → báo cáo + 5 ý tưởng bài đăng\n4. Gửi Telegram, lưu file vào **n8n/bao-cao/**, chuyển ý tưởng sang **WF3** để lên lịch đăng\n\nMuốn đổi giờ chạy: bấm vào ô ⏰.", [0, -260], 520, 300, 4),
    node("⏰ Thứ Hai 7:00", "n8n-nodes-base.scheduleTrigger", 1.2, { rule: { interval: [{ field: "weeks", triggerAtDay: [1], triggerAtHour: 7 }] } }, [X(0), 0]),
    manual([X(0), 200]),
    // ── Tự tìm đối thủ quanh tiệm ──
    code("🧭 Đọc cấu hình + từ khoá tìm đối thủ", function () {
      if (!$env.TAVILY_API_KEY) throw new Error("Thiếu TAVILY_API_KEY trong .env.local (đăng ký miễn phí ở tavily.com) – xem WORKFLOW_N8N.md.");
      const cfg = parseDoiThu(readConfig("doi-thu.txt"));
      const k = cfg.khu_vuc;
      const qs = [`tiệm bánh kem ${k}`, `bánh sinh nhật ${k} đặt bánh review`, `tiệm bánh ngọt gần ${k}`];
      return qs.map(q => ({ json: { cfg, tu_tim: cfg.tu_tim > 0, tavily_body: { query: q, search_depth: "basic", max_results: 10, country: "vietnam" } } }));
    }, [X(1), 100]),
    ifNode("Có bật tự tìm?", "={{ $json.tu_tim }}", [X(2), 100]),
    http("🔎 Tìm tiệm bánh quanh khu vực", {
      url: "https://api.tavily.com/search",
      headers: { Authorization: "=Bearer {{ $env.TAVILY_API_KEY }}" },
      json: "={{ JSON.stringify($json.tavily_body) }}",
      batch: 1500, timeout: 30000, onError: "continueRegularOutput",
    }, [X(3), -60]),
    code("🧠 Nhờ AI lọc ra đối thủ", function () {
      const cfg = $("🧭 Đọc cấu hình + từ khoá tìm đối thủ").first().json.cfg;
      const seen = new Set();
      const results = $input.all().flatMap(i => i.json.results || []).filter(r => r.url && !seen.has(r.url) && seen.add(r.url))
        .map(r => `- ${r.title} | ${r.url} | ${String(r.content || "").replace(/\s+/g, " ").slice(0, 300)}`);
      const prompt = `Tiệm bánh Mitu (bánh kem handmade, 173 Vạn Phúc, Hà Đông, Hà Nội) muốn biết đối thủ cạnh tranh trực tiếp quanh khu: ${cfg.khu_vuc}.
Dưới đây là kết quả tìm kiếm trên web. Hãy chọn tối đa ${cfg.tu_tim} tiệm đối thủ.

Tiêu chí:
- Là MỘT tiệm bánh cụ thể có tên riêng (bán bánh kem / bánh sinh nhật / bánh ngọt), ở trong hoặc gần khu vực trên.
- Lấy được tên tiệm từ bài "top tiệm bánh…" cũng được, nhưng bản thân bài tổng hợp, trang review, sàn giao hàng, siêu thị KHÔNG phải đối thủ.
- Bỏ Tiệm bánh Mitu.
- Ưu tiên tiệm cùng phân khúc (bánh kem đặt theo mẫu, bánh sinh nhật giá bình dân – trung bình).
- link: Fanpage, web hoặc Google Maps của chính tiệm nếu CÓ trong kết quả; không có thì để trống, không bịa.
- Không tìm được tiệm nào phù hợp thì trả danh sách rỗng.

Kết quả tìm kiếm:
${results.join("\n") || "(không có kết quả)"}`;
      const STR = { type: "STRING" };
      return [{ json: { gemini_body: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" },
          responseSchema: { type: "OBJECT", properties: { doi_thu: { type: "ARRAY", items: { type: "OBJECT", properties: { ten: STR, link: STR, ly_do: STR }, required: ["ten", "ly_do"] } } }, required: ["doi_thu"] } },
      } } }];
    }, [X(4), -60]),
    gemini("🤖 AI chọn đối thủ", [X(5), -60], { onError: "continueRegularOutput" }),
    code("📂 Gộp đối thủ + soạn từ khoá", function () {
      const cfg = $("🧭 Đọc cấu hình + từ khoá tìm đối thủ").first().json.cfg;
      // Đối thủ do AI tự tìm (nếu bật và chạy được)
      let auto = [];
      try { auto = (geminiJson($("🤖 AI chọn đối thủ").first().json).doi_thu || []); } catch (e) { auto = []; }
      const manualNames = new Set(cfg.thu_cong.map(r => norm(r.ten)));
      auto = auto.filter(r => r.ten && !norm(r.ten).includes("mitu") && !manualNames.has(norm(r.ten))).slice(0, cfg.tu_tim)
        .map(r => ({ ten: String(r.ten).trim(), link: String(r.link || "").trim(), ly_do: r.ly_do || "", nguon: "tự tìm" }));
      const seen = new Set();
      const rivals = [...cfg.thu_cong.map(r => ({ ...r, nguon: "bạn ghi" })), ...auto]
        .filter(r => { const k = norm(r.ten); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
      if (!rivals.length) throw new Error("Chưa có đối thủ: AI không tìm được tiệm nào và n8n/cau-hinh/doi-thu.txt cũng trống. Thêm vài dòng 'Tên | link' hoặc sửa dòng @khu-vuc rồi chạy lại.");
      // Lưu danh sách tự tìm để marketing xem / chép sang doi-thu.txt
      if (auto.length) {
        try {
          const fsm = require("fs"), p = require("path");
          const txt = [`# Đối thủ WF2 tự tìm ngày ${$now.setZone("Asia/Ho_Chi_Minh").toFormat("dd/MM/yyyy")} (khu: ${cfg.khu_vuc})`,
            "# File này bị ghi đè mỗi tuần. Tiệm nào muốn theo dõi lâu dài thì chép dòng đó sang doi-thu.txt.", "",
            ...auto.map(r => `${r.ten} | ${r.link}    # ${r.ly_do}`)].join("\n") + "\n";
          fsm.writeFileSync(p.join($env.MITU_DIR || "", "n8n", "cau-hinh", "doi-thu-tu-tim.txt"), txt, "utf8");
        } catch (e) { /* bỏ qua */ }
      }
      const ds = rivals.map(r => `${r.ten} (${r.nguon})`);
      const asks = rivals.map(r => ({ loai: "doi_thu", ten: r.ten, link: r.link, ds_doi_thu: ds, q: `"${r.ten}" bánh kem mẫu mới giá khuyến mãi review` }));
      asks.push({ loai: "xu_huong", ten: "Xu hướng thị trường", link: "", ds_doi_thu: ds, q: "xu hướng bánh kem bánh sinh nhật Hà Nội mới nhất" });
      // Tavily: công cụ tìm kiếm cho AI, gói free ~1.000 lượt/tháng
      return asks.map(a => ({ json: { ...a, tavily_body: { query: a.q, search_depth: "basic", max_results: 6, include_answer: "basic", time_range: "month", country: "vietnam" } } }));
    }, [X(5), 100]),
    http("🔎 Tìm trên web (Tavily)", {
      url: "https://api.tavily.com/search",
      headers: { Authorization: "=Bearer {{ $env.TAVILY_API_KEY }}" },
      json: "={{ JSON.stringify($json.tavily_body) }}",
      batch: 1500, timeout: 30000, onError: "continueRegularOutput",
    }, [X(6), 100]),
    code("📚 Gom kết quả tìm kiếm", function () {
      const asks = $("📂 Gộp đối thủ + soạn từ khoá").all().map(i => i.json);
      const notes = $input.all().map((it, i) => {
        const r = it.json, a = asks[i] || {};
        const results = (r.results || []).slice(0, 6).map(x => ({ title: x.title, uri: x.url, content: String(x.content || "").replace(/\s+/g, " ").slice(0, 500) }));
        const ghi_chu = r.error ? "Không tra được (" + (r.error.message || "lỗi Tavily") + ")."
          : [r.answer ? "Tóm tắt nhanh: " + r.answer : "", ...results.map(x => `- [${x.title}] ${x.content}`)].filter(Boolean).join("\n") || "Không tìm thấy.";
        return { loai: a.loai, ten: a.ten, link: a.link, ghi_chu, nguon: results.map(({ title, uri }) => ({ title, uri })) };
      });
      return [{ json: { notes } }];
    }, [X(7), 100]),
    code("🧠 Soạn yêu cầu phân tích", async function () {
      const shop = await loadShop(this.helpers);
      const notes = $json.notes;
      const today = $now.setZone("Asia/Ho_Chi_Minh");
      // Các dịp cố định trong 21 ngày tới
      const FIXED = [["14/02", "Valentine"], ["08/03", "Quốc tế Phụ nữ 8/3"], ["14/03", "Valentine Trắng"], ["01/06", "Quốc tế Thiếu nhi 1/6"], ["20/10", "Phụ nữ Việt Nam 20/10"], ["31/10", "Halloween"], ["20/11", "Nhà giáo Việt Nam 20/11"], ["24/12", "Giáng sinh"], ["01/01", "Năm mới"]];
      const soon = [];
      for (let d = 0; d <= 21; d++) {
        const day = today.plus({ days: d }).toFormat("dd/MM");
        for (const [k, v] of FIXED) if (k === day) soon.push(`${v} (${today.plus({ days: d }).toFormat("dd/MM")})`);
      }
      const catalog = shop.cakes.map(cakeLine).join("\n");
      const prompt = `Bạn là trưởng nhóm marketing của Tiệm bánh Mitu (bánh kem handmade, Hà Đông, Hà Nội). Hôm nay ${today.toFormat("dd/MM/yyyy")}.
Dưới đây là kết quả tìm kiếm trên web tuần này về đối thủ, xu hướng và kho bánh của Mitu. Hãy phân tích và đề xuất.

## Kết quả tìm kiếm
${notes.map(n => `### ${n.ten}${n.link ? " (" + n.link + ")" : ""}\n${n.ghi_chu}`).join("\n\n")}

## Kho bánh Mitu (tên | danh mục | giá | ghi chú)
${catalog}

## Dịp lễ trong 3 tuần tới
${soon.join(", ") || "Không có dịp cố định; tự xét dịp âm lịch nếu có (Trung thu, Tết…)."}

Yêu cầu:
- Chỉ dựa vào kết quả tìm kiếm; bỏ qua kết quả không nói về đúng tiệm đó; không tìm thấy thì ghi "Chưa có thông tin", không bịa.
- so_sanh_gia: so nhóm bánh tương đương giữa Mitu và đối thủ (nếu có giá).
- y_tuong_bai_dang: đúng 5 ý tưởng bài Facebook cho tuần tới; mỗi ý tưởng gắn với MỘT bánh có thật trong kho Mitu (chép đúng tên ở cột đầu) và nêu góc nhìn cụ thể (dịp lễ, trend, điểm hơn đối thủ…).
- viec_nen_lam: đúng 3 việc cụ thể Mitu nên làm tuần này.`;
      const S = (props, req) => ({ type: "OBJECT", properties: props, required: req || Object.keys(props) });
      const STR = { type: "STRING" }, ARR = items => ({ type: "ARRAY", items });
      const schema = S({
        tom_tat: STR,
        doi_thu: ARR(S({ ten: STR, diem_noi_bat: STR, khoang_gia: STR, khuyen_mai: STR })),
        so_sanh_gia: ARR(S({ nhom_banh: STR, mitu: STR, doi_thu: STR, nhan_xet: STR })),
        xu_huong: ARR(STR),
        co_hoi: ARR(STR),
        viec_nen_lam: ARR(STR),
        y_tuong_bai_dang: ARR(S({ tieu_de: STR, goc_nhin: STR, banh_mitu: STR })),
      });
      return [{ json: { notes, gemini_body: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "low" } },
      } } }];
    }, [X(8), 100]),
    gemini("🧠 AI phân tích & đề xuất", [X(9), 100]),
    code("✍️ Soạn báo cáo + lưu file", async function () {
      const shop = await loadShop(this.helpers);
      const notes = $("🧠 Soạn yêu cầu phân tích").first().json.notes;
      let r;
      try { r = geminiJson($json); } catch (e) { throw new Error("AI trả về không đọc được: " + e.message); }
      const byName = new Map(shop.cakes.map(c => [norm(c.name), c]));
      // Ý tưởng phải gắn với bánh có thật trong kho
      const ideas = (r.y_tuong_bai_dang || []).map(y => {
        let cake = byName.get(norm(y.banh_mitu));
        if (!cake) cake = shop.cakes.find(c => norm(c.name).includes(norm(y.banh_mitu)) || norm(y.banh_mitu).includes(norm(c.name)));
        return cake ? { ...y, banh_id: cake.id, banh_mitu: cake.name } : null;
      }).filter(Boolean);
      const today = $now.setZone("Asia/Ho_Chi_Minh");
      const L = [];
      const dsDoiThu = ($("📂 Gộp đối thủ + soạn từ khoá").first().json.ds_doi_thu || []);
      L.push(`<b>📊 Báo cáo đối thủ tuần ${today.toFormat("dd/MM/yyyy")}</b>`, `🔍 Đã theo dõi: ${escHtml(dsDoiThu.join(", "))}`, "", escHtml(r.tom_tat || ""));
      if ((r.viec_nen_lam || []).length) L.push("", "<b>✅ 3 việc nên làm</b>", ...r.viec_nen_lam.map((v, i) => `${i + 1}. ${escHtml(v)}`));
      if ((r.doi_thu || []).length) L.push("", "<b>🏪 Đối thủ</b>", ...r.doi_thu.map(d => `• <b>${escHtml(d.ten)}</b>: ${escHtml(d.diem_noi_bat)} · Giá: ${escHtml(d.khoang_gia)} · KM: ${escHtml(d.khuyen_mai)}`));
      if ((r.xu_huong || []).length) L.push("", "<b>🔥 Xu hướng</b>", ...r.xu_huong.map(x => "• " + escHtml(x)));
      if (ideas.length) L.push("", `<b>💡 ${ideas.length} ý tưởng bài đăng</b> (đã chuyển sang WF3 để lên lịch)`, ...ideas.map(y => `• ${escHtml(y.tieu_de)} – <i>${escHtml(y.banh_mitu)}</i>`));
      let telegram_text = L.join("\n");
      if (telegram_text.length > 3900) telegram_text = telegram_text.slice(0, 3900) + "\n…(xem đủ trong file báo cáo)";

      // File báo cáo đầy đủ (Markdown) cho team marketing
      const md = [`# Báo cáo đối thủ – ${today.toFormat("dd/MM/yyyy")}`, "", "Đã theo dõi: " + dsDoiThu.join(", "), "", r.tom_tat || "",
        "", "## 3 việc nên làm", ...(r.viec_nen_lam || []).map((v, i) => `${i + 1}. ${v}`),
        "", "## Đối thủ", "| Tiệm | Điểm nổi bật | Khoảng giá | Khuyến mãi |", "|---|---|---|---|",
        ...(r.doi_thu || []).map(d => `| ${d.ten} | ${d.diem_noi_bat} | ${d.khoang_gia} | ${d.khuyen_mai} |`),
        "", "## So sánh giá", "| Nhóm bánh | Mitu | Đối thủ | Nhận xét |", "|---|---|---|---|",
        ...(r.so_sanh_gia || []).map(s => `| ${s.nhom_banh} | ${s.mitu} | ${s.doi_thu} | ${s.nhan_xet} |`),
        "", "## Xu hướng", ...(r.xu_huong || []).map(x => "- " + x),
        "", "## Cơ hội cho Mitu", ...(r.co_hoi || []).map(x => "- " + x),
        "", "## Ý tưởng bài đăng (đã chuyển sang WF3)", ...ideas.map(y => `- **${y.tieu_de}** – ${y.goc_nhin} _(bánh: ${y.banh_mitu})_`),
        "", "## Ghi chú nghiên cứu gốc", ...notes.map(n => `### ${n.ten}\n${n.ghi_chu}\n${(n.nguon || []).map(s => `- [${s.title}](${s.uri})`).join("\n")}`),
      ].join("\n");
      let file = "";
      try {
        const fsm = require("fs"), p = require("path");
        const dir = p.join($env.MITU_DIR || "", "n8n", "bao-cao");
        fsm.mkdirSync(dir, { recursive: true });
        file = p.join(dir, `doi-thu-${today.toFormat("yyyy-MM-dd")}.md`);
        fsm.writeFileSync(file, md, "utf8");
      } catch (e) { file = "(không lưu được file: " + e.message + ")"; }
      return [{ json: { telegram_text, file, y_tuong: ideas, bao_cao: r } }];
    }, [X(10), 100]),
    telegram("📨 Gửi báo cáo Telegram", [X(11), 0]),
    node("➡️ Chuyển ý tưởng sang WF3", "n8n-nodes-base.executeWorkflow", 1.2, {
      workflowId: { __rl: true, value: "MituWf3DangBai01", mode: "id" },
      options: { waitForSubWorkflow: false },
    }, [X(11), 200], { onError: "continueRegularOutput" }),
  ];
  save("WF2-doi-thu.json", {
    id: "MituWf2DoiThu001", name: "Mitu WF2 · Theo dõi đối thủ (thứ Hai 7:00)", nodes,
    wires: [
      ["⏰ Thứ Hai 7:00", "🧭 Đọc cấu hình + từ khoá tìm đối thủ"], ["▶️ Bấm để chạy thử", "🧭 Đọc cấu hình + từ khoá tìm đối thủ"],
      ["🧭 Đọc cấu hình + từ khoá tìm đối thủ", "Có bật tự tìm?"],
      ["Có bật tự tìm?", "🔎 Tìm tiệm bánh quanh khu vực", 0], ["Có bật tự tìm?", "📂 Gộp đối thủ + soạn từ khoá", 1],
      ["🔎 Tìm tiệm bánh quanh khu vực", "🧠 Nhờ AI lọc ra đối thủ"], ["🧠 Nhờ AI lọc ra đối thủ", "🤖 AI chọn đối thủ"],
      ["🤖 AI chọn đối thủ", "📂 Gộp đối thủ + soạn từ khoá"],
      ["📂 Gộp đối thủ + soạn từ khoá", "🔎 Tìm trên web (Tavily)"],
      ["🔎 Tìm trên web (Tavily)", "📚 Gom kết quả tìm kiếm"],
      ["📚 Gom kết quả tìm kiếm", "🧠 Soạn yêu cầu phân tích"],
      ["🧠 Soạn yêu cầu phân tích", "🧠 AI phân tích & đề xuất"],
      ["🧠 AI phân tích & đề xuất", "✍️ Soạn báo cáo + lưu file"],
      ["✍️ Soạn báo cáo + lưu file", "📨 Gửi báo cáo Telegram"],
      ["✍️ Soạn báo cáo + lưu file", "➡️ Chuyển ý tưởng sang WF3"],
    ],
  });
}

// ═════════════════════════════════════════════════════════════
// WF3 – Tự đăng bài Facebook
// ═════════════════════════════════════════════════════════════
const CAPTION_PROMPT = body(function () {
    function captionBody(bai, shop, voice) {
      const cakes = bai.cakes.map(c => `- ${c.name}: ${vnd(c.price)}${c.desc ? " – " + String(c.desc).slice(0, 160) : ""}`).join("\n");
      const what = bai.loai === "menu"
        ? `Bài "Menu hôm nay" (${bai.ngay}): giới thiệu các bánh có sẵn hôm nay, khách đặt/ghé lấy luôn được.`
        : `Bài theo ý tưởng: "${bai.tieu_de}". Góc nhìn: ${bai.goc_nhin}.`;
      const prompt = `Bạn viết bài Facebook cho Fanpage Tiệm bánh Mitu.
${what}

Bánh trong bài (chỉ dùng đúng tên và giá này):
${cakes}

Thông tin tiệm: địa chỉ ${shop.shopAddress || "173 Vạn Phúc, Hà Đông, Hà Nội"}; Zalo ${shop.zaloPhone || "0936290932"}.

Giọng văn của Mitu:
${voice}

Yêu cầu:
- Dòng đầu gây chú ý; sau đó giới thiệu bánh (tên + 1 ý hấp dẫn + giá viết dạng 350.000đ); cuối bài kêu gọi nhắn Zalo / inbox và ghi địa chỉ.
- Tối đa 900 ký tự, xuống dòng cho dễ đọc trên điện thoại.
- Chỉ tả bánh dựa trên tên và mô tả ở trên. Không tự thêm số người ăn, kích thước, cốt bánh, nguyên liệu, khuyến mãi, quà tặng, freeship.
- caption KHÔNG chứa hashtag; hashtag để riêng trong hashtags (3–6 cái, có dấu # ở đầu).`;
      return {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" },
          responseSchema: { type: "OBJECT", properties: { caption: { type: "STRING" }, hashtags: { type: "ARRAY", items: { type: "STRING" } } }, required: ["caption", "hashtags"] },
        },
      };
    }
});
const CHECK_CAPTION = function () {
    // Kiểm tra tự động thay cho người duyệt: sai thì dùng mẫu an toàn
    const BANNED = ["giảm giá", "khuyến mãi", "khuyến mại", "sale", "freeship", "free ship", "miễn phí ship", "tặng kèm", "rẻ nhất", "số 1", "duy nhất"];
    const src = $(SRC).all();
    return $input.all().map((it, i) => {
      const bai = src[i].json.bai, shop = src[i].json.shop;
      const issues = [];
      let caption = "", tags = [];
      try { const r = geminiJson(it.json); caption = String(r.caption || "").trim(); tags = (r.hashtags || []).map(String); }
      catch (e) { issues.push("AI không trả lời được (" + (it.json.error ? "lỗi kết nối" : "sai định dạng") + ")"); }
      // AI hay tự chèn dòng hashtag vào cuối bài → tách ra để không bị lặp
      const lines = caption.split("\n");
      while (lines.length && (/^\s*(#[^\s#]+\s*)+$/.test(lines[lines.length - 1]) || !lines[lines.length - 1].trim())) {
        tags.push(...(lines.pop().match(/#[^\s#]+/g) || []));
      }
      caption = lines.join("\n").trim();
      if (caption) {
        const allowed = new Set(bai.cakes.map(c => Number(c.price)));
        const bad = moneyIn(caption).filter(n => !allowed.has(n));
        if (bad.length) issues.push("giá không khớp kho: " + bad.map(vnd).join(", "));
        const low = caption.toLowerCase();
        const words = BANNED.filter(w => low.includes(w));
        if (words.length) issues.push("có từ không được dùng: " + words.join(", "));
        if (caption.length < 60 || caption.length > 1500) issues.push("độ dài bất thường (" + caption.length + " ký tự)");
      }
      if (issues.length) {
        caption = (bai.loai === "menu" ? `🍰 Menu hôm nay (${bai.ngay}) của Mitu đây cả nhà ơi!` : `✨ ${bai.tieu_de}`) + "\n\n"
          + bai.cakes.map(c => `🎂 ${c.name} – ${vnd(c.price)}`).join("\n")
          + `\n\n📩 Đặt bánh: nhắn Zalo ${shop.zaloPhone || "0936290932"} hoặc inbox Mitu nha!\n📍 ${shop.shopAddress || "173 Vạn Phúc, Hà Đông, Hà Nội"}`;
        tags = [];
      }
      const fixed = ["#tiembanhmitu", "#banhkemhadong", "#banhsinhnhat"];
      const allTags = [...new Set([...tags.map(t => t.startsWith("#") ? t : "#" + t), ...fixed])].slice(0, 8);
      return { json: { bai, message: caption + "\n\n" + allTags.join(" "), kiem_tra: issues.length ? "Dùng mẫu an toàn vì " + issues.join("; ") : "Đạt" } };
    });
};
const checkCode = srcName => body(CHECK_CAPTION).replace("$(SRC)", `$(${JSON.stringify(srcName)})`);
{
  const A = 0, B = 520, P = 980;
  const nodes = [];
  const codeC = (name, fn, pos) => { const n = code(name, fn, pos); n.parameters.jsCode = SHARED + "\n" + CAPTION_PROMPT + "\n" + body(fn); return n; };

  nodes.push(
    sticky("## WF3 · Tự đăng bài Facebook\n**Luồng A** (8:00 mỗi sáng): lấy *Menu hôm nay* trên web → AI viết bài → kiểm tra giá / từ cấm → đăng ngay.\n**Luồng B** (WF2 gọi vào thứ Hai): ý tưởng tuần → AI viết bài → **hẹn giờ** trên Facebook cho cả tuần (xem ở Meta Business Suite → Nội dung → Đã lên lịch).\n\n`CHE_DO_THU=1` trong .env.local → chỉ gửi bản nháp qua Telegram, **chưa đăng thật**.", [0, -320], 640, 290, 4),
    node("⏰ 8:00 mỗi sáng", "n8n-nodes-base.scheduleTrigger", 1.2, { rule: { interval: [{ field: "days", triggerAtHour: 8 }] } }, [X(0), A]),
    manual([X(0), A + 180]),
    codeC("🧾 Chuẩn bị bài Menu hôm nay", async function () {
      const shop = await loadShop(this.helpers);
      const today = $now.setZone("Asia/Ho_Chi_Minh").toFormat("dd/MM/yyyy");
      const skip = ly_do => [{ json: { skip: true, telegram_text: ly_do ? "ℹ️ <b>WF3 – chưa đăng bài Menu hôm nay</b>\n" + ly_do : "" } }];
      if (!sameDay(shop.today.date, today)) return skip(`Menu trên web vẫn là ngày ${escHtml(shop.today.date || "(trống)")}. Cập nhật <b>Menu hôm nay</b> ở trang admin rồi bấm chạy lại WF3 (hoặc đợi sáng mai).`);
      const cakes = (shop.today.ids || []).map(id => shop.cakes.find(c => c.id === id)).filter(Boolean);
      if (!cakes.length) return skip("Menu hôm nay đang trống.");
      if (readState().menu_da_dang === today) return skip(""); // đã đăng rồi, không đăng trùng
      const bai = { loai: "menu", ngay: today, cakes: cakes.map(c => ({ id: c.id, name: c.name, price: c.price, desc: c.desc, image: c.image })), anh: cakes.map(c => c.image).filter(Boolean).slice(0, 6), lich: null };
      return [{ json: { skip: false, bai, shop: shop.shop, gemini_body: captionBody(bai, shop.shop, readConfig("giong-van.txt")) } }];
    }, [X(1), A + 90]),
    ifNode("Có bài để đăng?", "={{ !$json.skip }}", [X(2), A + 90]),
    ifNode("Có cần báo không?", "={{ !!$json.telegram_text }}", [X(3), A + 260]),
    telegram("📨 Báo chưa đăng", [X(4), A + 260]),
    gemini("✍️ AI viết bài (A)", [X(3), A]),
    code("🛡️ Kiểm tra tự động (A)", () => {}, [X(4), A]),
    // Luồng B
    node("➡️ Nhận ý tưởng từ WF2", "n8n-nodes-base.executeWorkflowTrigger", 1.1, { inputSource: "passthrough" }, [X(0), B]),
    codeC("🗓️ Lên lịch bài cho tuần", async function () {
      const shop = await loadShop(this.helpers);
      const voice = readConfig("giong-van.txt");
      const ideas = $input.all().flatMap(i => i.json.y_tuong || []).slice(0, 5);
      const base = $now.setZone("Asia/Ho_Chi_Minh").startOf("day");
      const SLOTS = [[1, 11, 0], [2, 19, 30], [3, 11, 0], [4, 19, 30], [5, 11, 0]]; // (ngày sau hôm nay, giờ, phút)
      return ideas.map((y, i) => {
        const cake = shop.cakes.find(c => c.id === y.banh_id) || shop.cakes.find(c => norm(c.name) === norm(y.banh_mitu));
        if (!cake) return null;
        const [d, h, m] = SLOTS[i];
        const at = base.plus({ days: d }).set({ hour: h, minute: m });
        const bai = { loai: "y_tuong", tieu_de: y.tieu_de, goc_nhin: y.goc_nhin, cakes: [{ id: cake.id, name: cake.name, price: cake.price, desc: cake.desc, image: cake.image }], anh: [cake.image].filter(Boolean), lich: Math.floor(at.toSeconds()), lich_text: at.toFormat("HH:mm dd/MM") };
        return { json: { bai, shop: shop.shop, gemini_body: captionBody(bai, shop.shop, voice) } };
      }).filter(Boolean);
    }, [X(1), B]),
    gemini("✍️ AI viết bài (B)", [X(2), B], { batch: 13000 }),
    code("🛡️ Kiểm tra tự động (B)", () => {}, [X(3), B]),
    // Phần đăng chung
    sticky("### Phần đăng chung\nTải ảnh lên Facebook (ẩn) → ghép thành 1 bài nhiều ảnh → đăng ngay hoặc hẹn giờ → báo Telegram kèm link.", [X(5), P - 170], 520, 140, 6),
    ifNode("Chế độ thử?", "={{ String($env.CHE_DO_THU || '') === '1' }}", [X(5), P]),
    code("👀 Soạn bản nháp gửi Telegram", function () {
      return $input.all().map(i => ({ json: { telegram_text: `🧪 <b>Chế độ thử – bài CHƯA đăng</b>${i.json.bai.lich_text ? " (dự kiến " + i.json.bai.lich_text + ")" : ""}\nKiểm tra: ${escHtml(i.json.kiem_tra)}\n\n${escHtml(i.json.message)}\n\n🖼 ${i.json.bai.anh.length} ảnh: ${i.json.bai.anh.map(escHtml).join(" ")}` } }));
    }, [X(6), P - 100]),
    telegram("📨 Gửi bản nháp", [X(7), P - 100]),
    code("📸 Tách từng ảnh", function () {
      const out = [];
      $input.all().forEach((it, post) => {
        const imgs = it.json.bai.anh.length ? it.json.bai.anh : [];
        imgs.forEach(url => out.push({ json: { post, url, temporary: !!it.json.bai.lich } }));
        if (!imgs.length) out.push({ json: { post, url: "", temporary: false } });
      });
      return out;
    }, [X(6), P + 100]),
    http("⬆️ Tải ảnh lên Facebook (ẩn)", {
      url: fbUrl("{{ $env.FACEBOOK_PAGE_ID }}/photos"),
      json: "={{ JSON.stringify({ url: $json.url, published: false, temporary: $json.temporary, access_token: $env.FACEBOOK_PAGE_TOKEN }) }}",
      onError: "continueRegularOutput",
    }, [X(7), P + 100]),
    code("🧩 Ghép bài", function () {
      const posts = $("Chế độ thử?").all().map(i => i.json);
      const photos = $("📸 Tách từng ảnh").all().map(i => i.json);
      const res = $input.all().map(i => i.json);
      return posts.map((p, idx) => {
        const media = photos.map((ph, k) => ({ ph, r: res[k] })).filter(x => x.ph.post === idx && x.r && x.r.id).map(x => ({ media_fbid: x.r.id }));
        const errors = photos.map((ph, k) => ({ ph, r: res[k] })).filter(x => x.ph.post === idx && x.r && x.r.error).map(x => (x.r.error.message || JSON.stringify(x.r.error)));
        const body = { message: p.message, access_token: $env.FACEBOOK_PAGE_TOKEN };
        if (media.length) body.attached_media = media;
        if (p.bai.lich) { body.published = false; body.scheduled_publish_time = p.bai.lich; }
        return { json: { bai: p.bai, kiem_tra: p.kiem_tra, fb_body: body, loi_anh: errors } };
      });
    }, [X(8), P + 100]),
    http("📢 Đăng / hẹn giờ bài", {
      url: fbUrl("{{ $env.FACEBOOK_PAGE_ID }}/feed"),
      json: "={{ JSON.stringify($json.fb_body) }}",
      onError: "continueRegularOutput", retry: false,
    }, [X(9), P + 100]),
    code("📝 Ghi nhớ + báo kết quả", function () {
      const src = $("🧩 Ghép bài").all().map(i => i.json);
      return $input.all().map((it, i) => {
        const r = it.json, p = src[i];
        if (r.id) {
          if (p.bai.loai === "menu") writeState({ menu_da_dang: p.bai.ngay });
          const link = "https://www.facebook.com/" + r.id;
          return { json: { telegram_text: `${p.bai.lich ? "🗓️ <b>Đã hẹn giờ đăng " + p.bai.lich_text + "</b>" : "✅ <b>Đã đăng bài</b>"}: ${escHtml(p.bai.loai === "menu" ? "Menu hôm nay " + p.bai.ngay : p.bai.tieu_de)}\n${link}\nKiểm tra: ${escHtml(p.kiem_tra)}${p.loi_anh.length ? "\n⚠️ Lỗi ảnh: " + escHtml(p.loi_anh.join("; ")) : ""}` } };
        }
        const err = (r.error && (r.error.message || JSON.stringify(r.error))) || JSON.stringify(r).slice(0, 300);
        return { json: { telegram_text: `❌ <b>Đăng bài lỗi</b>: ${escHtml(err)}\nThường do token Facebook hết hạn hoặc thiếu quyền – xem mục "Sự cố" trong WORKFLOW_N8N.md.` } };
      });
    }, [X(10), P + 100]),
    telegram("📨 Báo kết quả đăng", [X(11), P + 100]),
  );
  nodes.find(n => n.name === "🛡️ Kiểm tra tự động (A)").parameters.jsCode = SHARED + "\n" + checkCode("🧾 Chuẩn bị bài Menu hôm nay");
  nodes.find(n => n.name === "🛡️ Kiểm tra tự động (B)").parameters.jsCode = SHARED + "\n" + checkCode("🗓️ Lên lịch bài cho tuần");

  save("WF3-dang-bai.json", {
    id: "MituWf3DangBai01", name: "Mitu WF3 · Tự đăng bài Facebook (8:00 + lịch tuần)", nodes,
    wires: [
      ["⏰ 8:00 mỗi sáng", "🧾 Chuẩn bị bài Menu hôm nay"], ["▶️ Bấm để chạy thử", "🧾 Chuẩn bị bài Menu hôm nay"],
      ["🧾 Chuẩn bị bài Menu hôm nay", "Có bài để đăng?"],
      ["Có bài để đăng?", "✍️ AI viết bài (A)", 0], ["Có bài để đăng?", "Có cần báo không?", 1],
      ["Có cần báo không?", "📨 Báo chưa đăng", 0],
      ["✍️ AI viết bài (A)", "🛡️ Kiểm tra tự động (A)"], ["🛡️ Kiểm tra tự động (A)", "Chế độ thử?"],
      ["➡️ Nhận ý tưởng từ WF2", "🗓️ Lên lịch bài cho tuần"], ["🗓️ Lên lịch bài cho tuần", "✍️ AI viết bài (B)"],
      ["✍️ AI viết bài (B)", "🛡️ Kiểm tra tự động (B)"], ["🛡️ Kiểm tra tự động (B)", "Chế độ thử?"],
      ["Chế độ thử?", "👀 Soạn bản nháp gửi Telegram", 0], ["👀 Soạn bản nháp gửi Telegram", "📨 Gửi bản nháp"],
      ["Chế độ thử?", "📸 Tách từng ảnh", 1], ["📸 Tách từng ảnh", "⬆️ Tải ảnh lên Facebook (ẩn)"],
      ["⬆️ Tải ảnh lên Facebook (ẩn)", "🧩 Ghép bài"], ["🧩 Ghép bài", "📢 Đăng / hẹn giờ bài"],
      ["📢 Đăng / hẹn giờ bài", "📝 Ghi nhớ + báo kết quả"], ["📝 Ghi nhớ + báo kết quả", "📨 Báo kết quả đăng"],
    ],
  });
}

// ═════════════════════════════════════════════════════════════
// WF1 – Tự trả lời khách (chat web + Messenger + comment)
// ═════════════════════════════════════════════════════════════
{
  const W = 0, F = 360, C = 760;
  const nodes = [
    sticky("## WF1 · Tự trả lời khách 24/7\nNhận tin từ **chat trên web**, **Messenger** và **comment Fanpage** → AI trả lời theo kho bánh, Menu hôm nay, **n8n/cau-hinh/faq.txt** và giọng văn.\n- Khách muốn **đặt bánh**: AI hỏi đủ thông tin rồi báo Telegram cho tiệm.\n- **Khiếu nại / câu khó**: AI xoa dịu khách + báo Telegram.\n- Chủ tiệm tự nhắn trong hộp thư Page → bot **tự im 6 tiếng** với khách đó.\n- Giá AI nói phải khớp kho, không khớp thì đổi sang câu an toàn.", [0, -330], 640, 300, 4),
    // Web
    webhook("💬 Tin nhắn từ chat web", "POST", "mitu-chat", "responseNode", [X(0), W], { allowedOrigins: "*" }),
    code("🧹 Chuẩn hoá tin web", function () {
      const store = $getWorkflowStaticData("global");
      const b = $json.body || {};
      const sid = String(b.session_id || "").slice(0, 80) || "web-khach";
      const msg = String(b.message || "").trim().slice(0, 500);
      const now = Date.now();
      store.web_rate = store.web_rate || {};
      const hits = (store.web_rate[sid] || []).filter(t => now - t < 3600e3);
      hits.push(now);
      store.web_rate[sid] = hits;
      for (const k of Object.keys(store.web_rate)) if (!store.web_rate[k].some(t => now - t < 3600e3)) delete store.web_rate[k];
      return [{ json: { kenh: "web", sender_id: sid, ten: "", tin_nhan: msg, qua_gioi_han: hits.length > 30 || !msg } }];
    }, [X(1), W]),
    ifNode("Nhắn quá nhiều?", "={{ $json.qua_gioi_han }}", [X(2), W]),
    respond("↩️ Trả lời: nhắn chậm lại", "json", "={{ JSON.stringify({ reply: 'Bạn nhắn nhanh quá Mitu đọc không kịp 😅 Đợi chút rồi nhắn tiếp, hoặc nhắn Zalo 0936290932 nhé!', cakes: [] }) }}", [X(3), W - 120]),
    // Facebook
    webhook("📘 Facebook xác minh (GET)", "GET", "mitu-facebook", "responseNode", [X(0), F]),
    respond("↩️ Trả mã xác minh", "text", "={{ $json.query['hub.verify_token'] === $env.FACEBOOK_VERIFY_TOKEN ? $json.query['hub.challenge'] : 'sai verify token' }}", [X(1), F]),
    webhook("📘 Facebook gửi tin / comment", "POST", "mitu-facebook", "responseNode", [X(0), F + 180]),
    respond("↩️ Báo Facebook đã nhận", "text", "EVENT_RECEIVED", [X(1), F + 180]),
    code("🧹 Lọc sự kiện Facebook", function () {
      const ev0 = $("📘 Facebook gửi tin / comment").first().json;
      const store = $getWorkflowStaticData("global");
      store.tam_dung = store.tam_dung || {};
      const PAGE = String($env.FACEBOOK_PAGE_ID || "");
      const now = Date.now();
      const out = [];
      for (const entry of (ev0.body && ev0.body.entry) || []) {
        for (const ev of entry.messaging || []) {
          const m = ev.message;
          if (!m) continue;
          if (m.is_echo) {
            // Người thật (chủ tiệm) nhắn từ hộp thư Page → bot nhường 6 tiếng
            if (!m.app_id && ev.recipient && ev.recipient.id) store.tam_dung[ev.recipient.id] = now + 6 * 3600e3;
            continue;
          }
          if (!m.text) continue;
          const sid = ev.sender && ev.sender.id;
          if (!sid || (store.tam_dung[sid] || 0) > now) continue;
          out.push({ json: { kenh: "messenger", sender_id: sid, ten: "", tin_nhan: String(m.text).slice(0, 800) } });
        }
        for (const ch of entry.changes || []) {
          const v = ch.value || {};
          if (ch.field !== "feed" || v.item !== "comment" || v.verb !== "add") continue;
          if (!v.message || !v.from || String(v.from.id) === PAGE) continue; // bỏ comment của chính Page
          out.push({ json: { kenh: "comment", sender_id: String(v.from.id), ten: v.from.name || "", tin_nhan: String(v.message).slice(0, 800), comment_id: v.comment_id, post_id: v.post_id } });
        }
      }
      for (const k of Object.keys(store.tam_dung)) if (store.tam_dung[k] < now) delete store.tam_dung[k];
      return out;
    }, [X(2), F + 180]),
    // Bộ não chung
    code("🧠 Chuẩn bị câu hỏi cho AI", async function () {
      const store = $getWorkflowStaticData("global");
      const now = Date.now();
      // Dữ liệu tiệm lưu tạm 10 phút cho nhanh và đỡ gọi Firestore
      if (!store.cache || now - store.cache.at > 10 * 60e3) {
        const s = await loadShop(this.helpers);
        store.cache = { at: now, ...s, faq: readConfig("faq.txt"), voice: readConfig("giong-van.txt") };
      }
      const { cakes, today, shop, faq, voice } = store.cache;
      const todayKey = $now.setZone("Asia/Ho_Chi_Minh").toFormat("dd/MM/yyyy");
      const menu = sameDay(today.date, todayKey) ? (today.ids || []).map(id => cakes.find(c => c.id === id)).filter(Boolean) : [];
      store.lich_su = store.lich_su || {};
      for (const k of Object.keys(store.lich_su)) if (now - store.lich_su[k].at > 24 * 3600e3) delete store.lich_su[k];
      const out = [];
      for (const it of $input.all()) {
        const t = it.json;
        const hist = (store.lich_su[t.kenh + ":" + t.sender_id] || { turns: [] }).turns.slice(-8);
        // Comment: đọc nội dung bài viết để biết khách hỏi "bánh này" là bánh nào
        let post = "";
        if (t.kenh === "comment" && t.post_id && $env.FACEBOOK_PAGE_TOKEN) {
          try {
            const p = await this.helpers.httpRequest({ url: `https://graph.facebook.com/${$env.FACEBOOK_GRAPH_VERSION || "v23.0"}/${t.post_id}`, qs: { fields: "message", access_token: $env.FACEBOOK_PAGE_TOKEN }, json: true });
            post = String(p.message || "").slice(0, 600);
          } catch (e) { post = ""; }
        }
        const sys = `Bạn là nhân viên tư vấn của ${shop.shopName || "Tiệm bánh Mitu"} (bánh kem handmade). Bạn đang trả lời khách qua ${t.kenh === "web" ? "khung chat trên website" : t.kenh === "messenger" ? "Messenger của Fanpage" : "comment trên Fanpage"}.
Hôm nay: ${todayKey}.${post ? `\nKhách comment dưới bài viết này của Fanpage:\n"""${post}"""` : ""}

GIỌNG VĂN:
${voice}

THÔNG TIN TIỆM: địa chỉ ${shop.shopAddress}; hotline/Zalo ${shop.zaloPhone}.
CÂU HỎI THƯỜNG GẶP:
${faq}

MENU HÔM NAY (có sẵn, lấy được luôn): ${menu.length ? menu.map(c => c.name + " " + vnd(c.price)).join("; ") : "chưa cập nhật"}

KHO BÁNH (tên | danh mục | giá | mô tả) – đặt trước được:
${cakes.map(cakeLine).join("\n")}

QUY TẮC:
- Trả lời ngắn (tối đa 4 câu), đúng trọng tâm, tiếng Việt có dấu.
- Giá và tên bánh chỉ lấy từ KHO BÁNH. Bánh theo mẫu riêng không có trong kho: nói giá tùy mẫu, mời khách gửi ảnh mẫu qua Zalo để tiệm báo giá.
- Điều gì không có trong dữ liệu trên: không đoán, nói Mitu sẽ kiểm tra và báo lại, đặt can_bao_chu = true.
- banh_goi_y: tối đa 3 tên bánh trong kho phù hợp với câu hỏi (chép đúng tên), không có thì để trống.
- Khách muốn đặt bánh: hỏi dần cho đủ ngày giờ lấy, bánh/mẫu, size, chữ trên bánh, số điện thoại; ghi vào don_hang. Khi đã đủ thì xác nhận lại với khách, nói tiệm sẽ liên hệ chốt đơn, và đặt can_bao_chu = true.
- Khách phàn nàn, bánh lỗi, đòi hoàn tiền, hoặc bực bội: xin lỗi chân thành, nói chủ tiệm sẽ liên hệ ngay, can_bao_chu = true.
- Comment trên Fanpage: có 2 câu trả lời khác nhau.
  + tra_loi_cong_khai: 1 câu ngắn hiện dưới comment, không nêu giá (VD: "Mitu đã inbox bạn rồi nha 💛").
  + tra_loi: tin nhắn riêng gửi vào inbox của khách — chào khách, trả lời thẳng câu hỏi (giá, mẫu…). KHÔNG viết kiểu "Mitu đã nhắn riêng cho bạn" trong tra_loi.
  + Khách hỏi "bánh này" mà không rõ bánh nào (bài viết không nói): hỏi lại khách hoặc mời gửi ảnh mẫu.
  + Khách hỏi giá / đặt bánh / xin tư vấn → nhan_rieng = true; chỉ khen hoặc thả cảm xúc → nhan_rieng = false.
- Không hứa khuyến mãi, giảm giá, freeship nếu dữ liệu không có.`;
        const S = (props, req) => ({ type: "OBJECT", properties: props, required: req });
        const STR = { type: "STRING" };
        const schema = S({
          tra_loi: STR, tra_loi_cong_khai: STR, nhan_rieng: { type: "BOOLEAN" },
          banh_goi_y: { type: "ARRAY", items: STR },
          y_dinh: { type: "STRING", enum: ["hoi_thong_tin", "tu_van_chon_banh", "dat_banh", "khieu_nai", "khen", "khac"] },
          can_bao_chu: { type: "BOOLEAN" }, ly_do_bao_chu: STR,
          don_hang: S({ ngay_lay: STR, banh: STR, size: STR, chu_tren_banh: STR, so_dien_thoai: STR, ghi_chu: STR }, []),
        }, ["tra_loi", "y_dinh", "can_bao_chu", "banh_goi_y"]);
        out.push({ json: { ...t, model: $env.GEMINI_MODEL_CHAT || $env.GEMINI_MODEL || "gemini-3.6-flash", gemini_body: {
          systemInstruction: { parts: [{ text: sys }] },
          contents: [...hist.map(h => ({ role: h.role === "khach" ? "user" : "model", parts: [{ text: h.text }] })), { role: "user", parts: [{ text: t.tin_nhan }] }],
          generationConfig: { temperature: 0.5, responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "low" } },
        } } });
      }
      return out;
    }, [X(4), F]),
    node("🤖 AI trả lời", "n8n-nodes-base.httpRequest", 4.2, {
      method: "POST",
      url: "=https://generativelanguage.googleapis.com/v1beta/models/{{ $json.model }}:generateContent",
      sendHeaders: true, headerParameters: { parameters: [{ name: "x-goog-api-key", value: "={{ $env.GEMINI_API_KEY }}" }] },
      sendBody: true, specifyBody: "json", jsonBody: "={{ JSON.stringify($json.gemini_body) }}",
      options: { timeout: 20000 },
    }, [X(5), F], { retryOnFail: true, maxTries: 2, waitBetweenTries: 3000, onError: "continueRegularOutput" }),
    code("🛡️ Kiểm tra + ghi nhớ hội thoại", function () {
      const store = $getWorkflowStaticData("global");
      const src = $("🧠 Chuẩn bị câu hỏi cho AI").all().map(i => i.json);
      const { cakes, shop } = store.cache;
      const zalo = shop.zaloPhone || "0936290932";
      const prices = new Set(cakes.map(c => Number(c.price)));
      return $input.all().map((it, i) => {
        const t = src[i];
        let r, note = "";
        try { r = geminiJson(it.json); } catch (e) { r = null; }
        if (!r || !r.tra_loi) {
          r = { tra_loi: `Mitu đang hơi đông khách một chút 🙏 Bạn nhắn Zalo ${zalo} để được trả lời ngay nhé!`, tra_loi_cong_khai: "Mitu đã nhận được bình luận của bạn ạ 💛", nhan_rieng: false, banh_goi_y: [], y_dinh: "khac", can_bao_chu: true, ly_do_bao_chu: "AI không trả lời được (lỗi hoặc hết lượt)" };
        }
        const wrong = moneyIn(r.tra_loi).filter(n => !prices.has(n));
        if (wrong.length) {
          note = "AI nói giá không có trong kho: " + wrong.map(vnd).join(", ");
          r.tra_loi = `Dạ để Mitu kiểm tra lại giá chính xác rồi báo bạn ngay nhé! Bạn cũng có thể nhắn Zalo ${zalo} để được báo giá nhanh ạ 💛`;
          r.can_bao_chu = true;
          r.ly_do_bao_chu = [r.ly_do_bao_chu, note].filter(Boolean).join("; ");
        }
        const goi_y = (r.banh_goi_y || []).map(n => cakes.find(c => norm(c.name) === norm(n))).filter(Boolean).slice(0, 3)
          .map(c => ({ name: c.name, price: c.price, image: c.image }));
        const key = t.kenh + ":" + t.sender_id;
        const h = store.lich_su[key] || { turns: [] };
        h.turns.push({ role: "khach", text: t.tin_nhan }, { role: "mitu", text: r.tra_loi });
        h.turns = h.turns.slice(-12); h.at = Date.now();
        store.lich_su[key] = h;
        const d = r.don_hang || {};
        const donText = Object.values(d).some(Boolean)
          ? `\n<b>Đơn:</b> ${escHtml([d.banh, d.size, d.ngay_lay && "lấy " + d.ngay_lay, d.chu_tren_banh && "chữ: " + d.chu_tren_banh, d.so_dien_thoai && "SĐT " + d.so_dien_thoai, d.ghi_chu].filter(Boolean).join(" · "))}` : "";
        const kenhText = { web: "Chat web", messenger: "Messenger", comment: "Comment Fanpage" }[t.kenh];
        const telegram_text = r.can_bao_chu || r.y_dinh === "khieu_nai"
          ? `${r.y_dinh === "khieu_nai" ? "🚨" : r.y_dinh === "dat_banh" ? "🛒" : "🙋"} <b>${kenhText}${t.ten ? " – " + escHtml(t.ten) : ""}</b> (${escHtml(r.y_dinh)})\nKhách: “${escHtml(t.tin_nhan)}”\nBot đã trả lời: “${escHtml(r.tra_loi)}”${donText}${r.ly_do_bao_chu ? "\nLý do báo: " + escHtml(r.ly_do_bao_chu) : ""}${t.kenh === "messenger" ? "\n👉 Vào hộp thư Page để nhắn tiếp (bot sẽ tự im 6 tiếng)." : ""}`
          : "";
        return { json: { ...t, gemini_body: undefined, reply: r.tra_loi, reply_public: r.tra_loi_cong_khai || "Mitu cảm ơn bạn nhiều nha 💛", nhan_rieng: t.kenh !== "comment" || !!r.nhan_rieng, cakes: goi_y, telegram_text } };
      });
    }, [X(6), F]),
    switchNode("Trả lời theo kênh", "={{ $json.kenh }}", [["web", "Chat web"], ["messenger", "Messenger"], ["comment", "Comment"]], [X(7), F]),
    respond("↩️ Trả lời chat web", "json", "={{ JSON.stringify({ reply: $json.reply, cakes: $json.cakes }) }}", [X(8), F - 160]),
    http("💌 Gửi tin Messenger", {
      url: fbUrl("me/messages"),
      json: "={{ JSON.stringify({ recipient: { id: $json.sender_id }, messaging_type: 'RESPONSE', message: { text: $json.reply }, access_token: $env.FACEBOOK_PAGE_TOKEN }) }}",
      timeout: 20000, onError: "continueRegularOutput",
    }, [X(8), F]),
    http("💬 Trả lời dưới comment", {
      url: fbUrl("{{ $json.comment_id }}/comments"),
      json: "={{ JSON.stringify({ message: $json.reply_public, access_token: $env.FACEBOOK_PAGE_TOKEN }) }}",
      timeout: 20000, onError: "continueRegularOutput",
    }, [X(8), F + 170]),
    ifNode("Cần nhắn riêng?", "={{ $('Trả lời theo kênh').item.json.nhan_rieng }}", [X(9), F + 170]),
    http("💌 Nhắn riêng cho người comment", {
      url: fbUrl("{{ $env.FACEBOOK_PAGE_ID }}/messages"),
      json: "={{ JSON.stringify({ recipient: { comment_id: $('Trả lời theo kênh').item.json.comment_id }, message: { text: $('Trả lời theo kênh').item.json.reply }, access_token: $env.FACEBOOK_PAGE_TOKEN }) }}",
      timeout: 20000, onError: "continueRegularOutput",
    }, [X(10), F + 170]),
    ifNode("Cần báo chủ tiệm?", "={{ !!$json.telegram_text }}", [X(7), C]),
    telegram("📨 Báo chủ tiệm (Telegram)", [X(8), C]),
  ];
  save("WF1-tra-loi-khach.json", {
    id: "MituWf1TraLoi001", name: "Mitu WF1 · Tự trả lời khách (web + Messenger + comment)", nodes,
    wires: [
      ["💬 Tin nhắn từ chat web", "🧹 Chuẩn hoá tin web"], ["🧹 Chuẩn hoá tin web", "Nhắn quá nhiều?"],
      ["Nhắn quá nhiều?", "↩️ Trả lời: nhắn chậm lại", 0], ["Nhắn quá nhiều?", "🧠 Chuẩn bị câu hỏi cho AI", 1],
      ["📘 Facebook xác minh (GET)", "↩️ Trả mã xác minh"],
      ["📘 Facebook gửi tin / comment", "↩️ Báo Facebook đã nhận"], ["↩️ Báo Facebook đã nhận", "🧹 Lọc sự kiện Facebook"], ["🧹 Lọc sự kiện Facebook", "🧠 Chuẩn bị câu hỏi cho AI"],
      ["🧠 Chuẩn bị câu hỏi cho AI", "🤖 AI trả lời"], ["🤖 AI trả lời", "🛡️ Kiểm tra + ghi nhớ hội thoại"],
      ["🛡️ Kiểm tra + ghi nhớ hội thoại", "Trả lời theo kênh"], ["🛡️ Kiểm tra + ghi nhớ hội thoại", "Cần báo chủ tiệm?"],
      ["Trả lời theo kênh", "↩️ Trả lời chat web", 0], ["Trả lời theo kênh", "💌 Gửi tin Messenger", 1], ["Trả lời theo kênh", "💬 Trả lời dưới comment", 2],
      ["💬 Trả lời dưới comment", "Cần nhắn riêng?"], ["Cần nhắn riêng?", "💌 Nhắn riêng cho người comment", 0],
      ["Cần báo chủ tiệm?", "📨 Báo chủ tiệm (Telegram)", 0],
    ],
  });
}
