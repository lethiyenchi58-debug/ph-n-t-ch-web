/**
 * TIỆM BÁNH MITU – api/admin-agent.js  (Vercel Serverless Function)
 *
 * AI agent cho chủ tiệm, dùng Gemini có function calling. Hai việc:
 *   task "describe_cake": nhìn ảnh bánh → đề xuất tên, mô tả, nhãn, giá
 *   task "plan_menu":     đọc câu lệnh "Hôm nay có bánh dâu, tiramisu…" → đề xuất menu hôm nay
 *
 * Agent chỉ ĐỀ XUẤT. Không có công cụ nào ghi vào Firestore: admin xem lại trên
 * trang admin rồi mới bấm Lưu (lúc đó trình duyệt ghi như bình thường).
 *
 * Biến môi trường (Vercel → Settings → Environment Variables):
 *   GEMINI_API_KEY  (bắt buộc)  khóa từ https://aistudio.google.com/apikey
 *   ADMIN_EMAILS    (bắt buộc)  email admin được dùng agent, cách nhau dấu phẩy
 *   GEMINI_MODEL    (tùy chọn)  mặc định gemini-3.8-flash
 */

// gemini-3.6-flash: bản ổn định. (gemini-3.8-flash mới hơn nhưng hay quá tải với key miễn phí.)
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
// Model dự phòng khi model chính quá tải / treo. Đặt GEMINI_FALLBACK_MODEL=none để tắt.
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL === "none"
  ? null : (process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite");
const GEMINI_TIMEOUT_MS = 25000;
// Firebase Web API key là khóa công khai (đã có sẵn trong js/config.js), chỉ dùng để
// hỏi Firebase xem idToken của admin có hợp lệ không.
const FIREBASE_WEB_KEY = process.env.FIREBASE_API_KEY || "AIzaSyDIWNdqj1mpnrMLsS_n2xqCWnmmZ9UGFqk";

const MAX_STEPS = 6;              // số vòng gọi Gemini tối đa cho một yêu cầu
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 40 }; // 40 lượt / 10 phút / admin

// ── Nhãn dùng chung với trang admin (giá trị phải khớp ô chọn trong admin.html) ──
const CATEGORIES = {
  birthday: "Bánh sinh nhật", mini: "Bánh Mini", fruit: "Bánh Hoa quả", square: "Bánh Vuông",
  male: "Bánh cho Nam", female: "Bánh cho Nữ", boy: "Bánh cho Bé Trai", girl: "Bánh cho Bé Gái",
  troll: "Bánh Troll & Vui nhộn",
};
const AUDIENCES = { male: "Nam", female: "Nữ", boy: "Bé trai", girl: "Bé gái", kids: "Trẻ em" };
const TYPES     = { mini: "Mini", fruit: "Hoa quả", square: "Vuông", "custom-shaped": "Tạo hình" };
const STYLES    = { elegant: "Thanh lịch", cute: "Dễ thương", luxury: "Sang trọng", funny: "Troll / Vui nhộn" };

const listLabels = map => Object.entries(map).map(([k, v]) => `${k} = ${v}`).join("; ");

// ═════════════════════════════════════════════════════════════
// Handler
// ═════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Chỉ hỗ trợ POST." });
  if (!process.env.GEMINI_API_KEY) {
    return send(res, 500, { error: "Server chưa có GEMINI_API_KEY. Thêm biến này trong Vercel → Settings → Environment Variables rồi Redeploy." });
  }

  // 1. Chỉ admin đã đăng nhập mới dùng được (tránh người lạ tiêu hạn mức Gemini)
  let email;
  try {
    email = await verifyAdmin(req.headers.authorization || "");
  } catch (err) {
    return send(res, err.status || 401, { error: err.message });
  }
  if (!rateLimitOk(email)) {
    return send(res, 429, { error: "Bạn dùng AI hơi nhiều, đợi vài phút rồi thử lại nhé." });
  }

  // 2. Kiểm tra dữ liệu gửi lên
  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const catalog = cleanCatalog(body.catalog);

  try {
    if (body.task === "describe_cake") {
      const image = await readImage(body.image);
      const hint = String(body.hint || "").slice(0, 500);
      const result = await describeCake({ image, hint, catalog });
      return send(res, 200, result);
    }
    if (body.task === "plan_menu") {
      const command = String(body.command || "").trim().slice(0, 800);
      if (!command) return send(res, 400, { error: "Bạn chưa nhập câu lệnh." });
      if (catalog.length === 0) return send(res, 400, { error: "Kho bánh đang trống, chưa lên menu được." });
      const currentIds = Array.isArray(body.currentIds) ? body.currentIds.map(String) : [];
      const result = await planMenu({ command, catalog, currentIds });
      return send(res, 200, result);
    }
    return send(res, 400, { error: "task không hợp lệ." });
  } catch (err) {
    console.error("[admin-agent]", err);
    return send(res, err.status || 500, { error: err.publicMessage || "AI đang gặp lỗi, thử lại sau ít phút nhé." });
  }
};

// ═════════════════════════════════════════════════════════════
// Task 1: Thêm bánh từ ảnh
// ═════════════════════════════════════════════════════════════
async function describeCake({ image, hint, catalog }) {
  const system = [
    "Bạn là trợ lý của chủ Tiệm bánh Mitu (bánh ngọt handmade, Hà Đông, Hà Nội).",
    "Nhiệm vụ: nhìn ảnh một chiếc bánh và soạn thông tin để đăng lên web của tiệm.",
    "",
    "Quy trình:",
    "1. Quan sát ảnh: hình dáng, màu, trang trí, trái cây, chữ trên bánh, kích cỡ ước lượng.",
    "2. Gọi find_similar_cakes (1–2 lần) để xem giá các bánh tương tự trong kho của tiệm. Giá đề xuất phải dựa vào đó, không đoán theo giá thị trường chung chung.",
    "3. Gọi propose_cake đúng một lần với kết quả cuối cùng.",
    "",
    "Yêu cầu nội dung (tiếng Việt có dấu):",
    "- name: ngắn gọn, hấp dẫn, viết hoa chữ cái đầu mỗi từ như các bánh trong kho (VD: \"Bánh Kem Dâu Tây Tươi Hàn Quốc\"), tối đa 60 ký tự.",
    "- desc: 1–2 câu, tối đa 200 ký tự, tả vẻ ngoài và cảm giác hương vị. Chỉ nêu nguyên liệu khi nhìn thấy rõ trong ảnh hoặc chủ tiệm có ghi chú; không bịa kích thước, cốt bánh.",
    "- category: đúng một giá trị. audience/type/style: chọn các giá trị phù hợp (có thể nhiều).",
    "- price: số nguyên VNĐ, làm tròn đến 10.000đ.",
    "- Nếu ảnh không phải bánh, đặt is_cake = false và giải thích ở notes.",
    "",
    `Danh mục: ${listLabels(CATEGORIES)}`,
    `Đối tượng: ${listLabels(AUDIENCES)}`,
    `Kiểu bánh: ${listLabels(TYPES)}`,
    `Phong cách: ${listLabels(STYLES)}`,
  ].join("\n");

  const userParts = [
    { inlineData: { mimeType: image.mimeType, data: image.data } },
    { text: hint ? `Ghi chú của chủ tiệm: ${hint}` : "Hãy soạn thông tin cho chiếc bánh trong ảnh." },
  ];

  const tools = {
    find_similar_cakes: {
      declaration: {
        name: "find_similar_cakes",
        description: "Tìm bánh tương tự trong kho của tiệm (kèm giá) để tham khảo khi đặt tên và định giá. Bỏ trống tham số nào thì không lọc theo tham số đó.",
        parameters: {
          type: "object",
          properties: {
            category: { type: "string", enum: Object.keys(CATEGORIES) },
            type:     { type: "string", enum: Object.keys(TYPES) },
            style:    { type: "string", enum: Object.keys(STYLES) },
            keyword:  { type: "string", description: "Từ khóa trong tên/mô tả, VD: dâu, socola, khủng long" },
          },
        },
      },
      run: args => findSimilar(catalog, args),
    },
  };

  const final = {
    name: "propose_cake",
    description: "Gửi đề xuất cuối cùng cho chủ tiệm duyệt. Gọi đúng một lần, sau khi đã tham khảo giá.",
    parameters: {
      type: "object",
      properties: {
        is_cake:      { type: "boolean" },
        name:         { type: "string" },
        desc:         { type: "string" },
        category:     { type: "string", enum: Object.keys(CATEGORIES) },
        audience:     { type: "array", items: { type: "string", enum: Object.keys(AUDIENCES) } },
        type:         { type: "array", items: { type: "string", enum: Object.keys(TYPES) } },
        style:        { type: "array", items: { type: "string", enum: Object.keys(STYLES) } },
        price:        { type: "integer", description: "Giá đề xuất, VNĐ" },
        price_reason: { type: "string", description: "1 câu: dựa vào bánh nào trong kho để ra giá này" },
        notes:        { type: "string", description: "Điều chủ tiệm nên kiểm tra lại (nếu có)" },
      },
      required: ["is_cake", "name", "desc", "category", "audience", "type", "style", "price", "price_reason"],
    },
  };

  const { args, steps } = await runAgent({ system, userParts, tools, final });

  const pick = (arr, map) => [...new Set((Array.isArray(arr) ? arr : []).filter(v => v in map))];
  let price = Math.round(Number(args.price) / 10000) * 10000;
  if (!Number.isFinite(price) || price <= 0) price = 0;
  price = Math.min(price, 10000000);

  return {
    steps,
    proposal: {
      isCake:      args.is_cake !== false,
      name:        String(args.name || "").trim().slice(0, 80),
      desc:        String(args.desc || "").trim().slice(0, 300),
      category:    args.category in CATEGORIES ? args.category : "birthday",
      audience:    pick(args.audience, AUDIENCES),
      type:        pick(args.type, TYPES),
      style:       pick(args.style, STYLES),
      price,
      priceReason: String(args.price_reason || "").slice(0, 300),
      notes:       String(args.notes || "").slice(0, 300),
    },
  };
}

function findSimilar(catalog, { category, type, style, keyword } = {}) {
  const kw = norm(keyword);
  let list = catalog.filter(c =>
    (!category || c.category === category) &&
    (!type || c.type.includes(type)) &&
    (!style || c.style.includes(style)) &&
    (!kw || norm(`${c.name} ${c.desc}`).includes(kw)));
  const relaxed = list.length === 0;
  if (relaxed) list = catalog.filter(c => !category || c.category === category);
  if (list.length === 0) list = catalog;
  const prices = list.map(c => c.price).filter(p => p > 0).sort((a, b) => a - b);
  return {
    note: relaxed ? "Không có bánh khớp hết điều kiện, đã nới bộ lọc." : undefined,
    count: list.length,
    price_min: prices[0] ?? null,
    price_median: prices.length ? prices[Math.floor(prices.length / 2)] : null,
    price_max: prices[prices.length - 1] ?? null,
    cakes: list.slice(0, 8).map(c => ({ name: c.name, category: c.category, type: c.type, style: c.style, price: c.price })),
  };
}

// ═════════════════════════════════════════════════════════════
// Task 2: Lên menu hôm nay bằng câu lệnh
// ═════════════════════════════════════════════════════════════
async function planMenu({ command, catalog, currentIds }) {
  const byId = new Map(catalog.map(c => [c.id, c]));
  const current = currentIds.filter(id => byId.has(id));

  const system = [
    "Bạn là trợ lý của chủ Tiệm bánh Mitu. Chủ tiệm nói bằng lời hôm nay tiệm có sẵn những bánh nào; bạn chọn đúng các bánh tương ứng trong kho để làm \"Menu hôm nay\".",
    "",
    "Quy trình:",
    "1. Tách câu lệnh thành từng ý (VD: \"bánh dâu\", \"tiramisu\", \"2 mẫu mini\").",
    "2. Với mỗi ý, gọi search_cakes để tìm. Có thể gọi nhiều lần, thử từ khóa khác nếu không thấy (VD: \"socola\" và \"chocolate\").",
    "3. Gọi propose_menu đúng một lần với danh sách cuối cùng.",
    "",
    "Quy tắc:",
    "- Chỉ dùng cake_id lấy từ kết quả search_cakes. Tuyệt đối không bịa id.",
    "- Có số lượng (\"2 mẫu mini\") thì chọn đúng số đó; ưu tiên bánh bán chạy (bestseller), rồi bánh đang có trong menu hiện tại.",
    "- Một ý khớp nhiều bánh mà không nói số lượng: chọn hết các bánh khớp rõ ràng; nếu khớp quá rộng (trên 4 bánh) thì chọn 2–3 bánh tiêu biểu và ghi chú ở summary.",
    "- Câu lệnh dạng \"thêm…\", \"bớt…\", \"bỏ…\", \"hết…\" là sửa menu hiện tại: giữ các bánh hiện tại rồi thêm/bớt. Câu lệnh liệt kê bình thường là thay cả menu.",
    "- Ý nào không tìm thấy bánh phù hợp thì đưa vào unmatched, không chọn bừa.",
    "- summary: 1–2 câu tiếng Việt cho chủ tiệm.",
  ].join("\n");

  const currentText = current.length
    ? current.map(id => `- ${byId.get(id).name} (id: ${id})`).join("\n")
    : "(đang trống)";

  const userParts = [{
    text: `Menu hiện tại:\n${currentText}\n\nKho có ${catalog.length} bánh.\n\nCâu lệnh của chủ tiệm: "${command}"`,
  }];

  const tools = {
    search_cakes: {
      declaration: {
        name: "search_cakes",
        description: "Tìm bánh trong kho. Từ khóa không phân biệt dấu, tìm trong tên và mô tả. Bỏ trống tham số nào thì không lọc theo tham số đó. Không có tham số nào = liệt kê cả kho.",
        parameters: {
          type: "object",
          properties: {
            keyword:  { type: "string", description: "VD: dâu, tiramisu, matcha, khủng long" },
            category: { type: "string", enum: Object.keys(CATEGORIES) },
            type:     { type: "string", enum: Object.keys(TYPES) },
            style:    { type: "string", enum: Object.keys(STYLES) },
            audience: { type: "string", enum: Object.keys(AUDIENCES) },
          },
        },
      },
      run: args => searchCakes(catalog, current, args),
    },
  };

  const final = {
    name: "propose_menu",
    description: "Gửi menu hôm nay đề xuất (danh sách ĐẦY ĐỦ sau khi áp dụng câu lệnh) cho chủ tiệm duyệt.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Toàn bộ bánh trong menu mới",
          items: {
            type: "object",
            properties: {
              cake_id: { type: "string" },
              reason:  { type: "string", description: "Khớp với ý nào trong câu lệnh, VD: \"bánh dâu\"" },
            },
            required: ["cake_id", "reason"],
          },
        },
        unmatched: { type: "array", items: { type: "string" }, description: "Các ý trong câu lệnh không tìm được bánh" },
        summary:   { type: "string" },
      },
      required: ["items", "unmatched", "summary"],
    },
  };

  const { args, steps } = await runAgent({ system, userParts, tools, final });

  // Kiểm lại: chỉ giữ id có thật trong kho, bỏ trùng
  const seen = new Set();
  const items = [];
  const invalid = [];
  for (const it of Array.isArray(args.items) ? args.items : []) {
    const id = String(it?.cake_id || "");
    if (!byId.has(id)) { invalid.push(id); continue; }
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ id, reason: String(it.reason || "").slice(0, 120) });
  }
  if (invalid.length) console.warn("[admin-agent] bỏ id không có trong kho:", invalid);

  return {
    steps,
    proposal: {
      items,
      unmatched: (Array.isArray(args.unmatched) ? args.unmatched : []).map(s => String(s).slice(0, 120)).slice(0, 10),
      summary: String(args.summary || "").slice(0, 400),
    },
  };
}

function searchCakes(catalog, currentIds, { keyword, category, type, style, audience } = {}) {
  const kw = norm(keyword);
  const words = kw.split(/\s+/).filter(Boolean);
  const list = catalog.filter(c => {
    if (category && c.category !== category) return false;
    if (type && !c.type.includes(type)) return false;
    if (style && !c.style.includes(style)) return false;
    if (audience && !c.audience.includes(audience)) return false;
    if (words.length) {
      const text = norm(`${c.name} ${c.desc}`);
      return words.every(w => text.includes(w));
    }
    return true;
  });
  return {
    count: list.length,
    cakes: list.slice(0, 30).map(c => ({
      cake_id: c.id, name: c.name, category: c.category, type: c.type, style: c.style,
      price: c.price, bestseller: c.bestseller, in_current_menu: currentIds.includes(c.id),
    })),
  };
}

// ═════════════════════════════════════════════════════════════
// Vòng lặp agent: Gemini gọi công cụ → server chạy → trả kết quả → lặp lại
// cho tới khi Gemini gọi công cụ "final" (đề xuất cuối cùng).
// ═════════════════════════════════════════════════════════════
async function runAgent({ system, userParts, tools, final }) {
  const contents = [{ role: "user", parts: userParts }];
  const declarations = [...Object.values(tools).map(t => t.declaration), final];
  const steps = [];
  let model = GEMINI_MODEL;

  for (let step = 0; step < MAX_STEPS; step++) {
    const lastStep = step === MAX_STEPS - 1;
    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: declarations }],
      toolConfig: {
        functionCallingConfig: lastStep
          ? { mode: "ANY", allowedFunctionNames: [final.name] } // hết lượt: bắt buộc chốt đề xuất
          : { mode: "ANY" },                                     // luôn trả lời bằng một công cụ
      },
      // Nghĩ ít cho nhanh: việc chọn bánh/điền form không cần suy luận sâu
      generationConfig: { temperature: 0.4, thinkingConfig: { thinkingLevel: "low" } },
    };

    let data;
    try {
      data = await callGemini(payload, model);
    } catch (err) {
      const canFallback = step === 0 && GEMINI_FALLBACK_MODEL && model !== GEMINI_FALLBACK_MODEL;
      if ((err.overloaded || err.retryAfterMs) && canFallback) {
        // Lượt đầu mà model chính quá tải / hết lượt → chạy cả yêu cầu bằng model dự phòng
        // (model khác có hạn mức riêng). Giữa chừng thì không đổi model được vì
        // thoughtSignature của model này không dùng cho model khác.
        console.warn(`[admin-agent] ${model} không dùng được lúc này, chuyển sang ${GEMINI_FALLBACK_MODEL}`);
        model = GEMINI_FALLBACK_MODEL;
        data = await callGemini(payload, model);
      } else if (err.retryAfterMs && err.retryAfterMs <= 30000) {
        // Hết lượt/phút giữa chừng: đợi đúng thời gian Gemini báo rồi thử lại một lần
        console.warn(`[admin-agent] hết lượt/phút, đợi ${Math.ceil(err.retryAfterMs / 1000)}s`);
        await new Promise(r => setTimeout(r, err.retryAfterMs + 500));
        data = await callGemini(payload, model);
      } else {
        throw err;
      }
    }

    const content = data.candidates?.[0]?.content;
    const calls = (content?.parts || []).filter(p => p.functionCall);
    if (!calls.length) {
      const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || "không rõ";
      throw publicError(502, `AI không trả về kết quả (${reason}). Thử lại hoặc đổi ảnh/câu lệnh khác nhé.`);
    }

    // Giữ nguyên lượt của model (có thoughtSignature – Gemini 3 bắt buộc gửi lại)
    contents.push(content);

    const finalCall = calls.find(p => p.functionCall.name === final.name);
    if (finalCall) {
      steps.push({ tool: final.name, args: summarizeArgs(finalCall.functionCall.args) });
      return { args: finalCall.functionCall.args || {}, steps };
    }

    const responses = calls.map(({ functionCall: fc }) => {
      const tool = tools[fc.name];
      const result = tool ? tool.run(fc.args || {}) : { error: `Không có công cụ ${fc.name}` };
      steps.push({ tool: fc.name, args: fc.args || {}, resultCount: result.count });
      const functionResponse = { name: fc.name, response: { result } };
      if (fc.id) functionResponse.id = fc.id;
      return { functionResponse };
    });
    contents.push({ role: "user", parts: responses });
  }
  throw publicError(502, "AI chưa chốt được đề xuất. Thử viết câu lệnh rõ hơn nhé.");
}

// Gọi Gemini; lỗi tạm thời (500/503 quá tải) thì đợi rồi thử lại tối đa 2 lần
async function callGemini(payload, model, attempt = 0) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`[admin-agent] Không gọi được Gemini (${model}):`, err?.name || err);
    if (err?.name === "TimeoutError") {
      // Treo cũng coi như quá tải để chuyển sang model dự phòng
      throw Object.assign(publicError(504, "Gemini trả lời quá lâu. Thử lại nhé."), { overloaded: true });
    }
    throw publicError(504, "Không kết nối được Gemini. Thử lại nhé.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || res.statusText;
    console.error(`[admin-agent] Gemini (${model}) lỗi`, res.status, msg);
    if (res.status === 500 || res.status === 503) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
        return callGemini(payload, model, attempt + 1);
      }
      throw Object.assign(publicError(503, "Gemini đang quá tải, thử lại sau ít phút nhé."), { overloaded: true });
    }
    if (res.status === 429) {
      // Gói miễn phí giới hạn theo phút (vài lượt/phút) và theo ngày
      const perMinute = /per ?minute/i.test(msg);
      const delay = (data.error?.details || []).find(d => d.retryDelay)?.retryDelay || (msg.match(/retry in ([\d.]+)s/i) || [])[1];
      const retryAfterMs = perMinute && delay ? Math.ceil(parseFloat(delay) * 1000) : null;
      throw Object.assign(publicError(429, perMinute
        ? "Gemini miễn phí chỉ cho vài lượt mỗi phút. Đợi khoảng 1 phút rồi thử lại nhé."
        : "Đã hết hạn mức Gemini miễn phí hôm nay, mai thử lại hoặc đổi model khác nhé."), { retryAfterMs });
    }
    if (res.status === 404) throw publicError(500, `Không tìm thấy model "${model}". Kiểm tra biến GEMINI_MODEL.`);
    if (res.status === 400 && /api key/i.test(msg)) throw publicError(500, "GEMINI_API_KEY không hợp lệ.");
    if (res.status === 403) throw publicError(500, "GEMINI_API_KEY không có quyền dùng Gemini API.");
    throw publicError(502, "Gemini báo lỗi, thử lại sau ít phút nhé.");
  }
  return data;
}

// Rút gọn đề xuất cuối cho phần "Agent đã làm gì" (không lặp lại cả danh sách)
function summarizeArgs(args = {}) {
  if (Array.isArray(args.items)) return { items: args.items.length, unmatched: args.unmatched };
  return { name: args.name, price: args.price };
}

// ═════════════════════════════════════════════════════════════
// Xác thực admin
// ═════════════════════════════════════════════════════════════
async function verifyAdmin(authHeader) {
  const allowed = String(process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) throw Object.assign(new Error("Server chưa cấu hình ADMIN_EMAILS."), { status: 500 });

  const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!idToken) throw Object.assign(new Error("Bạn cần đăng nhập admin."), { status: 401 });

  // Hỏi Firebase Auth: token còn hạn và thuộc tài khoản nào
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  }).catch(() => null);
  const data = r ? await r.json().catch(() => ({})) : {};
  const user = data.users?.[0];
  if (!r?.ok || !user?.email || user.disabled) {
    throw Object.assign(new Error("Phiên đăng nhập hết hạn, hãy đăng nhập lại."), { status: 401 });
  }
  const email = user.email.toLowerCase();
  if (!allowed.includes(email)) throw Object.assign(new Error("Tài khoản này không được dùng AI agent."), { status: 403 });
  return email;
}

const hits = new Map();
function rateLimitOk(key) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  if (list.length >= RATE_LIMIT.max) { hits.set(key, list); return false; }
  list.push(now);
  hits.set(key, list);
  return true;
}

// ═════════════════════════════════════════════════════════════
// Tiện ích
// ═════════════════════════════════════════════════════════════
const ALLOWED_IMAGE_HOSTS = ["res.cloudinary.com", "images.unsplash.com"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Ảnh gửi lên dạng base64 (ảnh mới chọn) hoặc link (bánh đã có ảnh trên Cloudinary)
async function readImage(image) {
  if (image?.data && image?.mimeType) {
    if (!IMAGE_TYPES.includes(image.mimeType)) throw publicError(400, "Chỉ nhận ảnh JPG, PNG hoặc WebP.");
    if (image.data.length * 0.75 > MAX_IMAGE_BYTES) throw publicError(413, "Ảnh quá lớn.");
    return { mimeType: image.mimeType, data: image.data };
  }
  if (image?.url) {
    let u;
    try { u = new URL(image.url); } catch { throw publicError(400, "Link ảnh không hợp lệ."); }
    if (u.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.includes(u.hostname)) throw publicError(400, "Chỉ đọc được ảnh trên Cloudinary.");
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!r?.ok) throw publicError(400, "Không tải được ảnh bánh.");
    const mimeType = (r.headers.get("content-type") || "").split(";")[0];
    if (!IMAGE_TYPES.includes(mimeType)) throw publicError(400, "Ảnh không đúng định dạng JPG/PNG/WebP.");
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) throw publicError(413, "Ảnh quá lớn.");
    return { mimeType, data: buf.toString("base64") };
  }
  throw publicError(400, "Bạn chưa chọn ảnh bánh.");
}

// Kho bánh do trang admin gửi kèm (admin vừa sửa xong nên luôn mới nhất)
function cleanCatalog(raw) {
  const arr = v => (Array.isArray(v) ? v.map(String) : []);
  return (Array.isArray(raw) ? raw : []).slice(0, 500).map(c => ({
    id: String(c?.id || ""),
    name: String(c?.name || "").slice(0, 120),
    desc: String(c?.desc || "").slice(0, 300),
    category: String(c?.category || ""),
    audience: arr(c?.audience), type: arr(c?.type), style: arr(c?.style),
    price: Number(c?.price) || 0,
    bestseller: !!c?.bestseller,
  })).filter(c => c.id && c.name);
}

// Bỏ dấu tiếng Việt để "banh dau" khớp "Bánh Dâu"
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
}

function publicError(status, publicMessage) {
  return Object.assign(new Error(publicMessage), { status, publicMessage });
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
