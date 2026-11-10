/**
 * TIỆM BÁNH MITU – admin-ai.js
 * Giao diện AI agent trên trang admin (máy chủ: api/admin-agent.js, dùng Gemini).
 *   1. Form thêm/sửa bánh: AI nhìn ảnh → điền tên, mô tả, nhãn, giá. Admin xem lại rồi bấm "Lưu bánh".
 *   2. Tab Menu hôm nay: gõ câu lệnh → AI đề xuất danh sách. Admin bấm "Áp dụng & lưu".
 * Dùng chung biến/hàm của admin.js (allCakes, cakeImg, selectedToday, showToast, escH…).
 */

const AI_ENDPOINT = "/api/admin-agent";

const AI_TOOL_LABELS = {
  find_similar_cakes: "Tìm bánh tương tự để tham khảo giá",
  search_cakes:       "Tìm trong kho",
  propose_cake:       "Chốt đề xuất",
  propose_menu:       "Chốt menu đề xuất",
};

document.addEventListener("DOMContentLoaded", () => {
  initAiCake();
  initAiMenu();
});

// ── Gọi API ──────────────────────────────────────────────────
async function callAdminAgent(payload) {
  let token;
  try { token = await MituDB.getIdToken(); }
  catch { throw new Error("Bạn cần đăng nhập lại."); }

  let res;
  try {
    res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Mất kết nối mạng, thử lại nhé.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404 || res.status === 405 || res.status === 501) {
      throw new Error("Chưa có máy chủ AI. Chạy thử bằng \"node dev.js\" hoặc deploy lên Vercel.");
    }
    throw new Error(data.error || `Lỗi máy chủ (${res.status}).`);
  }
  return data;
}

// Kho bánh rút gọn gửi kèm cho agent
function aiCatalog() {
  return getCakes().map(c => ({
    id: c.id, name: c.name, desc: c.desc || c.description || "", category: c.category,
    audience: c.audience || [], type: c.type || [], style: c.style || [],
    price: c.price, bestseller: !!c.bestseller,
  }));
}

function setAiBusy(btn, busy, busyText) {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = busyText; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  btn.disabled = busy;
  btn.classList.toggle("is-busy", busy);
}

// "Agent đã làm gì": từng lần gọi công cụ, để thấy agent tự quyết định các bước
function renderAiSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) return "";
  const rows = steps.map(s => {
    const args = Object.entries(s.args || {})
      .filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ");
    const count = typeof s.resultCount === "number" ? ` → ${s.resultCount} bánh` : "";
    return `<li>${escH(AI_TOOL_LABELS[s.tool] || s.tool)}${args ? ` <code>${escH(args)}</code>` : ""}${count}</li>`;
  }).join("");
  return `<details class="ai-steps"><summary>Agent đã làm ${steps.length} bước</summary><ol>${rows}</ol></details>`;
}

// ═════════════════════════════════════════════════════════════
// 1. Thêm bánh từ ảnh
// ═════════════════════════════════════════════════════════════
let aiCakeUndo = null; // giá trị form trước khi AI điền, để hoàn tác

function initAiCake() {
  document.getElementById("aiCakeBtn")?.addEventListener("click", runAiCake);

  // Bật/tắt nút theo việc form đã có ảnh chưa; dọn kết quả khi đóng/mở form
  const origPreview = setCakeImagePreview;
  setCakeImagePreview = function (src) {
    origPreview(src);
    const btn = document.getElementById("aiCakeBtn");
    if (btn && !btn.classList.contains("is-busy")) btn.disabled = !src;
  };
  const origReset = resetCakeForm;
  resetCakeForm = function () {
    origReset();
    aiCakeUndo = null;
    clearAiFilled();
    const box = document.getElementById("aiCakeResult");
    if (box) { box.hidden = true; box.innerHTML = ""; }
  };

  // Admin tự sửa ô nào thì bỏ tô màu ô đó
  document.getElementById("cakeForm")?.addEventListener("input", e => {
    e.target.classList?.remove("ai-filled");
    e.target.closest("label")?.classList.remove("ai-filled");
  });
}

async function runAiCake() {
  const btn = document.getElementById("aiCakeBtn");
  const box = document.getElementById("aiCakeResult");
  if (!cakeImg.file && !cakeImg.url) { showToast("📷 Chọn ảnh bánh trước nhé.", "info"); return; }

  setAiBusy(btn, true, "AI đang xem ảnh…");
  box.hidden = false;
  box.innerHTML = `<p>AI đang nhìn ảnh và so giá với các bánh trong kho…</p>`;

  try {
    const image = cakeImg.file ? await fileToAiImage(cakeImg.file) : { url: cakeImg.url };
    const data = await callAdminAgent({
      task: "describe_cake",
      image,
      hint: document.getElementById("aiCakeHint").value.trim(),
      catalog: aiCatalog(),
    });
    const p = data.proposal;
    if (!p.isCake) {
      box.innerHTML = `<p class="ai-warn">AI thấy ảnh này không giống ảnh bánh.</p>${p.notes ? `<p>${escH(p.notes)}</p>` : ""}${renderAiSteps(data.steps)}`;
      return;
    }
    applyAiCake(p);
    box.innerHTML = `
      <p><strong>Đã điền thử vào form</strong> (ô tô vàng). Kiểm tra lại, sửa nếu cần, rồi bấm <strong>Lưu bánh</strong>.</p>
      <p>💰 Giá gợi ý <strong>${escH(formatPrice(p.price))}</strong>${p.priceReason ? `: ${escH(p.priceReason)}` : ""}</p>
      ${p.notes ? `<p class="ai-warn">⚠️ ${escH(p.notes)}</p>` : ""}
      ${renderAiSteps(data.steps)}
      <div class="ai-actions"><button type="button" class="btn btn-sm btn-secondary" id="aiCakeUndoBtn">Hoàn tác</button></div>`;
    document.getElementById("aiCakeUndoBtn").addEventListener("click", undoAiCake);
  } catch (err) {
    box.innerHTML = `<p class="ai-warn">❌ ${escH(err.message)}</p>`;
  } finally {
    setAiBusy(btn, false);
  }
}

// Thu nhỏ ảnh trước khi gửi (nhanh hơn, không vượt giới hạn 4.5MB của Vercel)
async function fileToAiImage(file, maxSide = 1280) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // ảnh PNG trong suốt → nền trắng
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mimeType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

const AI_CHECK_GROUPS = { audience: "#audienceChecks", type: "#typeChecks", style: "#styleChecks" };

function readCakeForm() {
  const v = id => document.getElementById(id).value;
  const checked = sel => [...document.querySelectorAll(`${sel} input:checked`)].map(cb => cb.value);
  return {
    name: v("cakeName"), price: v("cakePrice"), category: v("cakeCategory"), desc: v("cakeDesc"),
    audience: checked("#audienceChecks"), type: checked("#typeChecks"), style: checked("#styleChecks"),
  };
}

function writeCakeForm(vals, markFilled) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    el.value = value;
    el.classList.toggle("ai-filled", !!markFilled);
  };
  set("cakeName", vals.name);
  set("cakePrice", vals.price);
  set("cakeCategory", vals.category);
  set("cakeDesc", vals.desc);
  for (const [key, sel] of Object.entries(AI_CHECK_GROUPS)) {
    document.querySelectorAll(`${sel} input[type='checkbox']`).forEach(cb => {
      const on = vals[key].includes(cb.value);
      const changed = cb.checked !== on;
      cb.checked = on;
      cb.closest("label")?.classList.toggle("ai-filled", !!markFilled && changed);
    });
  }
}

function applyAiCake(p) {
  aiCakeUndo = readCakeForm();
  writeCakeForm({
    name: p.name, price: p.price || "", category: p.category, desc: p.desc,
    audience: p.audience, type: p.type, style: p.style,
  }, true);
}

function undoAiCake() {
  if (!aiCakeUndo) return;
  writeCakeForm(aiCakeUndo, false);
  aiCakeUndo = null;
  const box = document.getElementById("aiCakeResult");
  box.hidden = true;
  box.innerHTML = "";
  showToast("↩️ Đã trả form về như trước khi AI điền.", "info");
}

function clearAiFilled() {
  document.querySelectorAll("#cakeForm .ai-filled").forEach(el => el.classList.remove("ai-filled"));
}

// ═════════════════════════════════════════════════════════════
// 2. Lên menu hôm nay bằng câu lệnh
// ═════════════════════════════════════════════════════════════
let aiMenuProposal = null;

function initAiMenu() {
  document.getElementById("aiMenuForm")?.addEventListener("submit", e => {
    e.preventDefault();
    runAiMenu();
  });
}

async function runAiMenu() {
  const input = document.getElementById("aiMenuInput");
  const btn = document.getElementById("aiMenuBtn");
  const box = document.getElementById("aiMenuResult");
  const command = input.value.trim();
  if (!command) { input.focus(); return; }
  if (!getCakes().length) { showToast("📦 Kho bánh trống, thêm bánh trước nhé.", "info"); return; }

  setAiBusy(btn, true, "AI đang chọn…");
  box.hidden = false;
  box.innerHTML = `<p>AI đang tìm các bánh trong kho…</p>`;

  try {
    const currentIds = [...selectedToday].filter(id => getCakes().some(c => c.id === id));
    const data = await callAdminAgent({ task: "plan_menu", command, catalog: aiCatalog(), currentIds });
    aiMenuProposal = data.proposal;
    renderAiMenuProposal(data.proposal, currentIds, data.steps);
  } catch (err) {
    box.innerHTML = `<p class="ai-warn">❌ ${escH(err.message)}</p>`;
  } finally {
    setAiBusy(btn, false);
  }
}

function renderAiMenuProposal(p, currentIds, steps) {
  const box = document.getElementById("aiMenuResult");
  const cakes = new Map(getCakes().map(c => [c.id, c]));
  const newIds = new Set(p.items.map(i => i.id));
  const current = new Set(currentIds);

  // Nhiều bánh trùng tên ("Bánh sinh nhật") nên kèm ảnh nhỏ để admin nhận ra
  const thumb = c => c?.image
    ? `<img class="ai-thumb" src="${escH(cdnImage(c.image, 96))}" alt="" loading="lazy" />`
    : `<span class="ai-thumb">🎂</span>`;
  const rows = p.items.map(i => {
    const c = cakes.get(i.id);
    const kept = current.has(i.id);
    return `<li><span class="ai-tag ${kept ? "keep" : "add"}">${kept ? "Giữ" : "Thêm"}</span>${thumb(c)}
      <span>${escH(c?.name || i.id)} <span class="ai-reason">· ${escH(formatPrice(c?.price || 0))}${i.reason ? ` · ${escH(i.reason)}` : ""}</span></span></li>`;
  });
  currentIds.filter(id => !newIds.has(id)).forEach(id => {
    const c = cakes.get(id);
    rows.push(`<li><span class="ai-tag del">Bỏ</span>${thumb(c)}<span>${escH(c?.name || id)}</span></li>`);
  });

  box.innerHTML = `
    ${p.summary ? `<p>${escH(p.summary)}</p>` : ""}
    ${rows.length ? `<ul class="ai-list">${rows.join("")}</ul>` : `<p class="ai-warn">AI không tìm được bánh nào phù hợp.</p>`}
    ${p.unmatched.length ? `<p class="ai-warn">⚠️ Không tìm thấy trong kho: ${p.unmatched.map(escH).join(", ")}</p>` : ""}
    ${renderAiSteps(steps)}
    <div class="ai-actions">
      ${p.items.length ? `<button type="button" class="btn btn-sm btn-primary" id="aiMenuApplyBtn">Áp dụng &amp; lưu (${p.items.length} bánh)</button>` : ""}
      <button type="button" class="btn btn-sm btn-secondary" id="aiMenuDismissBtn">Bỏ qua</button>
    </div>`;

  document.getElementById("aiMenuApplyBtn")?.addEventListener("click", applyAiMenu);
  document.getElementById("aiMenuDismissBtn").addEventListener("click", () => {
    aiMenuProposal = null;
    box.hidden = true;
    box.innerHTML = "";
  });
}

async function applyAiMenu(e) {
  if (!aiMenuProposal) return;
  const prev = new Set(selectedToday);
  selectedToday = new Set(aiMenuProposal.items.map(i => i.id));
  try {
    await withBusy(e.currentTarget, () => saveTodayToStorage());
  } catch (err) {
    selectedToday = prev;
    showToast(writeErrorMsg(err), "error");
    return;
  }
  renderTodayPanel();
  renderInventory();
  showToast(`✅ Đã lưu menu hôm nay! (${selectedToday.size} bánh)`, "success");
  aiMenuProposal = null;
  const box = document.getElementById("aiMenuResult");
  box.hidden = true;
  box.innerHTML = "";
  document.getElementById("aiMenuInput").value = "";
}
