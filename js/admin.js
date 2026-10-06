/**
 * TIỆM BÁNH MITU – admin.js
 * Toàn bộ logic trang quản trị. Dữ liệu đọc từ MITU_STATE (config.js),
 * ghi qua window.MituDB (db.js – Firestore), ảnh upload lên Cloudinary.
 */

// ── State ─────────────────────────────────────────────────────
let editingCakeId      = null;   // null = thêm mới, string = đang sửa
let cakeImg            = { url: null, file: null }; // ảnh bánh: link đã có / file chờ upload
let editingFeedbackId  = null;   // null = thêm mới, string = đang sửa
let fbImg              = { url: null, file: null }; // ảnh feedback: tương tự
let selectedToday      = new Set(); // ID bánh chọn cho hôm nay (chưa lưu)
let allCakes           = [];
let invFilter          = { search: "", cat: "all" };
let layoutShown        = false;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initSidebar();
  initTopbar();
  initInventory();
  initTodayPanel();
  initFeedbackPanel();
  initSettings();
  initCakeModal();
  initLogout();

  // Chờ dữ liệu Firestore rồi mới xét đăng nhập, để admin luôn thấy dữ liệu thật
  onMituData(() => {
    MituDB.onAuthChange(user => {
      if (user) showAdminLayout(user);
      else showLoginScreen();
    });
  });
});

// ── Session ───────────────────────────────────────────────────
function showLoginScreen() {
  layoutShown = false;
  document.getElementById("loginScreen").style.display = "";
  document.getElementById("adminLayout").classList.add("hidden");
}

function showAdminLayout(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminLayout").classList.remove("hidden");
  const nameEl = document.getElementById("topbarName");
  if (nameEl && user?.email) nameEl.textContent = user.email.split("@")[0];
  if (layoutShown) return;
  layoutShown = true;

  allCakes = getCakes();
  // Nạp sẵn lựa chọn đã lưu gần nhất (kể cả của hôm trước) để chủ tiệm chỉ cần sửa rồi Lưu
  selectedToday = new Set(getSavedTodayMenu().ids);
  renderAll();
  loadSettings();
  updateTopbarDate();
  renderDataBanner();
}

function renderAll() {
  allCakes = getCakes();
  renderInventory();
  renderTodayPanel();
  renderFeedbackPanel();
  updateTodayHint();
}

// ── Login ─────────────────────────────────────────────────────
function initLogin() {
  const form = document.getElementById("loginForm");
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const email  = document.getElementById("loginUser").value.trim();
    const pass   = document.getElementById("loginPass").value;
    const errEl  = document.getElementById("loginError");
    const btn    = form.querySelector('button[type="submit"]');

    btn.disabled = true;
    try {
      await MituDB.signIn(email, pass);
      errEl.classList.remove("show");
      // onAuthChange sẽ mở trang quản trị
    } catch (err) {
      errEl.textContent = err?.code === "auth/too-many-requests"
        ? "Đăng nhập sai quá nhiều lần. Đợi vài phút rồi thử lại."
        : err?.code === "auth/network-request-failed"
          ? "Không có mạng. Kiểm tra kết nối rồi thử lại."
          : "Sai email hoặc mật khẩu. Kiểm tra lại rồi thử lần nữa.";
      errEl.classList.add("show");
      document.getElementById("loginPass").value = "";
    } finally {
      btn.disabled = false;
    }
  });
}

// ── Logout ────────────────────────────────────────────────────
function initLogout() {
  const logout = async () => {
    await MituDB.signOut();
    location.reload();
  };
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  document.getElementById("topbarLogoutBtn")?.addEventListener("click", logout);
}

// ── Ghi dữ liệu: báo lỗi dễ hiểu cho chủ tiệm ─────────────────
function writeErrorMsg(err) {
  console.error("[Mitu] Lỗi ghi dữ liệu:", err);
  if (err?.code === "permission-denied") return "❌ Tài khoản này không có quyền sửa dữ liệu. Kiểm tra email admin trong firestore.rules (node setup.js) rồi deploy lại rules.";
  if (err?.code === "unavailable" || err?.code === "auth/network-request-failed") return "❌ Mất kết nối mạng, chưa lưu được. Thử lại nhé.";
  if (err?.message?.startsWith("cloudinary: chưa")) return "❌ Chưa cấu hình Cloudinary nên chưa upload ảnh được (chạy node setup.js).";
  if (err?.message?.startsWith("cloudinary")) return `❌ Upload ảnh thất bại (${err.message.slice(12)}). Kiểm tra preset Unsigned trên Cloudinary.`;
  return "❌ Có lỗi, chưa lưu được. Thử lại nhé.";
}

// Khóa nút trong lúc chờ ghi, tránh bấm hai lần
async function withBusy(btn, fn) {
  if (btn) btn.disabled = true;
  try { return await fn(); }
  finally { if (btn) btn.disabled = false; }
}

// ── Upload ảnh lên Cloudinary (preset Unsigned) ───────────────
async function uploadImage(file) {
  const { cloudName, uploadPreset } = MITU_CLOUDINARY;
  if (!cloudName) throw new Error("cloudinary: chưa điền cloudName trong js/config.js");
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new Error(`cloudinary: ${data.error?.message || res.status}`);
  return data.secure_url;
}

function checkImageFile(file) {
  if (!file.type.startsWith("image/")) { showToast("❌ Vui lòng chọn file ảnh.", "error"); return false; }
  if (file.size > 5 * 1024 * 1024) { showToast("❌ File quá lớn! Tối đa 5MB.", "error"); return false; }
  return true;
}

// ── Banner trạng thái dữ liệu & khởi tạo lần đầu ──────────────
function renderDataBanner() {
  const el = document.getElementById("dataBanner");
  if (!el) return;

  if (MITU_STATE.error) {
    el.className = "data-banner is-error";
    el.innerHTML = MITU_STATE.error.code === "permission-denied"
      ? `<p><strong>Firestore đang chặn đọc dữ liệu.</strong> Chưa deploy quy tắc bảo mật: chạy <code>node setup.js</code> rồi <code>firebase deploy --only firestore:rules</code>, sau đó tải lại trang.</p>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">Tải lại</button>`
      : `<p><strong>Không tải được dữ liệu.</strong> Đang hiện dữ liệu mẫu, đừng chỉnh sửa lúc này. Kiểm tra mạng rồi tải lại trang.</p>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">Tải lại</button>`;
    return;
  }

  // Thiếu Cloudinary: vẫn sửa được chữ, chỉ chưa upload ảnh được
  const cloudNote = MITU_CLOUDINARY.cloudName ? "" :
    `<p><strong>Chưa cấu hình Cloudinary</strong> nên chưa upload ảnh được. Chạy <code>node setup.js</code> để điền Cloud name.</p>`;

  if (MITU_STATE.initialized) {
    el.className = cloudNote ? "data-banner" : "data-banner hidden";
    el.innerHTML = cloudNote;
    return;
  }

  const legacy = readLegacyLocalData();
  const legacyImages = legacy
    ? [...legacy.cakes, ...legacy.feedbacks].filter(x => String(x.image || "").startsWith("data:")).length
    : 0;
  el.className = "data-banner";
  el.innerHTML = `${cloudNote}${legacyImages && cloudNote
      ? `<p>⚠️ Dữ liệu cũ có ${legacyImages} ảnh tự upload. Cấu hình Cloudinary <strong>trước</strong> khi chuyển, nếu không các ảnh này sẽ bị bỏ.</p>` : ""}
    <p><strong>Chưa có dữ liệu trên máy chủ.</strong> ${legacy
      ? `Trình duyệt này còn dữ liệu cũ (${legacy.cakes.length} bánh, ${legacy.feedbacks.length} feedback). Bấm để chuyển lên máy chủ.`
      : "Bấm để nạp bánh mẫu, feedback mẫu và thông tin tiệm, sau đó sửa dần."}</p>
    <button type="button" class="btn btn-primary" id="initDataBtn">${legacy ? "Chuyển dữ liệu cũ lên" : "Khởi tạo dữ liệu"}</button>`;

  document.getElementById("initDataBtn").addEventListener("click", e => {
    withBusy(e.currentTarget, () => initFirestoreData(legacy)).catch(err => showToast(writeErrorMsg(err), "error"));
  });
}

// Dữ liệu cũ lưu trong localStorage (trước khi chuyển sang Firestore)
function readLegacyLocalData() {
  try {
    const cakes = JSON.parse(localStorage.getItem("mitu_cakes") || "null");
    if (!Array.isArray(cakes) || cakes.length === 0) return null;
    const feedbacks = JSON.parse(localStorage.getItem("mitu_feedbacks") || "null");
    const config    = JSON.parse(localStorage.getItem("mitu_config") || "null");
    return {
      cakes,
      feedbacks: Array.isArray(feedbacks) ? feedbacks : MITU_DEFAULT_FEEDBACKS,
      config: config && typeof config === "object" ? config : {},
    };
  } catch (e) { return null; }
}

// Ảnh base64 (kiểu lưu cũ) không đưa vào Firestore được → upload lên Cloudinary nếu đã cấu hình
async function migrateImage(image) {
  if (typeof image !== "string" || !image.startsWith("data:")) return image || null;
  if (!MITU_CLOUDINARY.cloudName) return null;
  try {
    const blob = await (await fetch(image)).blob();
    return await uploadImage(blob);
  } catch (e) {
    console.warn("[Mitu] Bỏ qua ảnh không upload được:", e);
    return null;
  }
}

async function initFirestoreData(legacy) {
  const src = legacy || { cakes: MITU_DEFAULT_CAKES, feedbacks: MITU_DEFAULT_FEEDBACKS, config: {} };
  const base = Date.now();
  // createdAt giảm dần để giữ nguyên thứ tự hiện tại
  const stamp = i => new Date(base - i * 1000).toISOString();
  let lostImages = 0;

  const cakes = [];
  for (const [i, c] of src.cakes.entries()) {
    const image = await migrateImage(c.image);
    if (c.image && !image) lostImages++;
    cakes.push({
      id: String(c.id || generateId()),
      name: c.name || "Bánh chưa đặt tên",
      price: Number(c.price) || 0,
      category: c.category || "birthday",
      audience: Array.isArray(c.audience) ? c.audience : [],
      type: Array.isArray(c.type) ? c.type : [],
      style: Array.isArray(c.style) ? c.style : [],
      bestseller: !!c.bestseller,
      desc: c.desc || c.description || "",
      image,
      createdAt: c.createdAt || stamp(i),
    });
  }

  const feedbacks = [];
  for (const [i, f] of src.feedbacks.entries()) {
    const image = await migrateImage(f.image);
    if (f.image && !image) lostImages++;
    feedbacks.push({ ...f, id: String(f.id || "fb-" + generateId()), image, createdAt: f.createdAt || stamp(i) });
  }

  const { adminUser, adminPass, ...cfg } = { ...MITU_DEFAULTS, ...src.config };
  const today = { date: getTodayKey(), ids: cakes.map(c => c.id) };

  await MituDB.replaceAll({ cakes, feedbacks, config: cfg, today });
  selectedToday = new Set(today.ids);
  renderAll();
  loadSettings();
  renderDataBanner();
  showToast(lostImages
    ? `✅ Đã khởi tạo dữ liệu. ${lostImages} ảnh tải lên chưa được, hãy sửa bánh để chọn lại ảnh.`
    : "✅ Đã khởi tạo dữ liệu trên máy chủ!", "success");
}

// ── Sidebar ───────────────────────────────────────────────────
function initSidebar() {
  const links = document.querySelectorAll(".sidebar-link[data-panel]");
  const panels = document.querySelectorAll(".admin-panel");
  const topbarTitle = document.getElementById("topbarTitle");
  const sidebar = document.getElementById("sidebar");

  links.forEach(link => {
    link.addEventListener("click", () => {
      const panelId = link.dataset.panel;

      links.forEach(l => l.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      link.classList.add("active");
      const panel = document.getElementById(`panel-${panelId}`);
      if (panel) panel.classList.add("active");

      const titles = { inventory: "📦 Kho bánh", today: "🌞 Menu hôm nay", feedback: "💖 Ảnh Feedback", settings: "⚙️ Cài đặt" };
      topbarTitle.textContent = titles[panelId] || panelId;

      // Mobile: tabs live in the bottom bar, so jump back to the top of the new panel
      if (window.innerWidth < 1024) {
        sidebar.classList.remove("open");
        document.getElementById("sidebarOverlay")?.classList.remove("show");
        window.scrollTo(0, 0);
      }
    });
    link.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); link.click(); }
    });
  });

  // Mobile toggle and overlay
  const overlay = document.getElementById("sidebarOverlay");
  const closeBtn = document.getElementById("sidebarCloseBtn");

  function closeMobileSidebar() {
    sidebar.classList.remove("open");
    overlay?.classList.remove("show");
  }

  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay?.classList.toggle("show", sidebar.classList.contains("open"));
  });

  overlay?.addEventListener("click", closeMobileSidebar);
  closeBtn?.addEventListener("click", closeMobileSidebar);
}

// ── Topbar ────────────────────────────────────────────────────
function initTopbar() {
  updateTopbarDate();
}

function updateTopbarDate() {
  const el = document.getElementById("topbarDate");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });
}

// ── INVENTORY PANEL ───────────────────────────────────────────
function initInventory() {
  document.getElementById("addCakeBtn")?.addEventListener("click", () => openCakeModal(null));

  document.getElementById("invSearch")?.addEventListener("input", e => {
    invFilter.search = e.target.value.trim().toLowerCase();
    renderInventory();
  });

  document.getElementById("invCatFilter")?.addEventListener("change", e => {
    invFilter.cat = e.target.value;
    renderInventory();
  });
}

function renderInventory() {
  const grid = document.getElementById("inventoryGrid");
  if (!grid) return;

  let cakes = [...allCakes];

  if (invFilter.search) {
    cakes = cakes.filter(c => c.name.toLowerCase().includes(invFilter.search));
  }
  const todayIds = new Set(getTodayMenu().ids);
  if (invFilter.cat === "__best") {
    cakes = cakes.filter(c => c.bestseller);
  } else if (invFilter.cat === "__today") {
    cakes = cakes.filter(c => todayIds.has(c.id));
  } else if (invFilter.cat !== "all") {
    cakes = cakes.filter(c => c.category === invFilter.cat);
  }

  if (cakes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">${allCakes.length === 0 ? "📦" : "🔍"}</div>
        <h3>${allCakes.length === 0 ? "Kho bánh còn trống" : "Không tìm thấy bánh"}</h3>
        <p>${allCakes.length === 0 ? "Hãy thêm bánh đầu tiên vào kho nhé!" : "Thử tìm với từ khóa khác."}</p>
        ${allCakes.length === 0 ? `<button class="btn btn-primary" style="margin-top:16px" onclick="openCakeModal(null)">+ Thêm bánh ngay</button>` : ""}
      </div>`;
    return;
  }

  grid.innerHTML = "";
  cakes.forEach(cake => {
    const card = createInvCard(cake, todayIds.has(cake.id));
    grid.appendChild(card);
  });
}

// inToday: theo menu đã LƯU cho hôm nay (không tính lựa chọn đang dở ở tab Menu hôm nay)
function createInvCard(cake, inToday) {
  const div = document.createElement("div");
  div.className = "inv-card";
  const catLabel = getCatLabel(cake.category);
  div.innerHTML = `
    <div class="inv-card-img">
      ${cake.image ? `<img src="${escH(cdnImage(cake.image, 400))}" alt="${escH(cake.name)}" loading="lazy">` : "🎂"}
      ${cake.bestseller ? `<span class="inv-badge is-best">★ Bán chạy</span>` : ""}
      ${inToday ? `<span class="inv-badge">✓ Có hôm nay</span>` : ""}
    </div>
    <div class="inv-card-body">
      <div class="inv-card-name" title="${escH(cake.name)}">${escH(cake.name)}</div>
      <div class="inv-card-price">${formatPrice(cake.price)}</div>
      <span class="inv-card-cat">${escH(catLabel)}</span>
      <div class="inv-card-actions">
        <button class="btn btn-sm btn-secondary" data-action="edit">✏️ Sửa</button>
        <button class="btn btn-sm btn-danger" data-action="delete">🗑️</button>
      </div>
    </div>`;

  div.querySelector('[data-action="edit"]').addEventListener("click", () => openCakeModal(cake.id));
  div.querySelector('[data-action="delete"]').addEventListener("click", () => confirmDeleteCake(cake.id, cake.name));

  return div;
}

function confirmDeleteCake(id, name) {
  showConfirm(
    "🗑️ Xóa bánh?",
    `Bạn có chắc muốn xóa "<strong>${escH(name)}</strong>" khỏi kho không?<br><small>Hành động này không thể hoàn tác.</small>`,
    async () => {
      try {
        // Gỡ khỏi kho và khỏi menu hôm nay đã lưu; lựa chọn đang dở chỉ bỏ bánh này
        await MituDB.deleteCake(id);
        selectedToday.delete(id);
        renderAll();
        showToast("✅ Đã xóa bánh khỏi kho.", "success");
      } catch (err) {
        showToast(writeErrorMsg(err), "error");
      }
    }
  );
}

// ── CAKE MODAL (Add / Edit) ────────────────────────────────────
function initCakeModal() {
  const modal = document.getElementById("cakeModal");
  const form  = document.getElementById("cakeForm");

  // Close buttons
  const close = () => {
    modal.classList.remove("show");
    resetCakeForm();
  };
  document.getElementById("cakeModalClose")?.addEventListener("click", close);
  document.getElementById("cakeModalCancelBtn")?.addEventListener("click", close);
  modal?.addEventListener("click", e => { if (e.target === modal) close(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal?.classList.contains("show")) close();
  });

  // Image upload
  const uploadArea = document.getElementById("imgUploadArea");
  const fileInput  = document.getElementById("imgFileInput");

  uploadArea?.addEventListener("click", () => fileInput.click());

  uploadArea?.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
  uploadArea?.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
  uploadArea?.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });

  fileInput?.addEventListener("change", () => {
    if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
  });

  document.getElementById("removeImgBtn")?.addEventListener("click", e => {
    e.stopPropagation();
    setCakeImagePreview(null);
    cakeImg = { url: null, file: null };
    fileInput.value = "";
  });

  // Form submit
  form?.addEventListener("submit", e => {
    e.preventDefault();
    saveCake();
  });

  // Focus styles for form inputs inside modal
  form?.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("focus", () => { el.style.borderColor = "var(--primary)"; el.style.background = "white"; el.style.boxShadow = "0 0 0 3px rgba(212,115,106,.1)"; });
    el.addEventListener("blur",  () => { el.style.borderColor = ""; el.style.background = ""; el.style.boxShadow = ""; });
  });
}

function setCakeImagePreview(src) {
  const prev = document.getElementById("imgPreviewEl");
  if (prev.src.startsWith("blob:")) URL.revokeObjectURL(prev.src);
  prev.src = src || "";
  document.getElementById("imgUploadPreview").classList.toggle("show", !!src);
  document.getElementById("imgUploadDefault").style.display = src ? "none" : "";
}

// Chỉ xem trước; upload thật khi bấm Lưu
function handleImageFile(file) {
  if (!checkImageFile(file)) return;
  cakeImg = { url: null, file };
  setCakeImagePreview(URL.createObjectURL(file));
}

function openCakeModal(id) {
  editingCakeId = id;
  resetCakeForm();
  editingCakeId = id;

  const modal = document.getElementById("cakeModal");
  document.getElementById("cakeModalTitle").textContent = id ? "✏️ Sửa thông tin bánh" : "➕ Thêm bánh mới";

  if (id) {
    const cake = allCakes.find(c => c.id === id);
    if (!cake) return;
    document.getElementById("cakeId").value = cake.id;
    document.getElementById("cakeName").value = cake.name || "";
    document.getElementById("cakePrice").value = cake.price || "";
    document.getElementById("cakeCategory").value = cake.category || "birthday";
    document.getElementById("cakeDesc").value = cake.desc || cake.description || "";

    // Set multi-tag checkboxes
    document.querySelectorAll("#audienceChecks input[type='checkbox']").forEach(cb => {
      cb.checked = Array.isArray(cake.audience) && cake.audience.includes(cb.value);
    });
    document.querySelectorAll("#typeChecks input[type='checkbox']").forEach(cb => {
      cb.checked = Array.isArray(cake.type) && cake.type.includes(cb.value);
    });
    document.querySelectorAll("#styleChecks input[type='checkbox']").forEach(cb => {
      cb.checked = Array.isArray(cake.style) && cake.style.includes(cb.value);
    });
    document.getElementById("cakeBestseller").checked = !!cake.bestseller;

    if (cake.image) {
      cakeImg = { url: cake.image, file: null };
      setCakeImagePreview(cdnImage(cake.image, 600));
    }
  }

  modal.classList.add("show");
  setTimeout(() => document.getElementById("cakeName").focus(), 200);
}

function resetCakeForm() {
  document.getElementById("cakeForm").reset();
  document.getElementById("cakeId").value = "";
  cakeImg = { url: null, file: null };
  setCakeImagePreview(null);
  document.getElementById("imgFileInput").value = "";
  editingCakeId = null;

  document.querySelectorAll("#audienceChecks input, #typeChecks input, #styleChecks input, #cakeBestseller").forEach(cb => {
    cb.checked = false;
  });
}

async function saveCake() {
  const name     = document.getElementById("cakeName").value.trim();
  const price    = parseFloat(document.getElementById("cakePrice").value);
  const category = document.getElementById("cakeCategory").value;
  const desc     = document.getElementById("cakeDesc").value.trim();

  // Multi-tag values
  const audience = Array.from(document.querySelectorAll("#audienceChecks input[type='checkbox']:checked")).map(cb => cb.value);
  const type     = Array.from(document.querySelectorAll("#typeChecks input[type='checkbox']:checked")).map(cb => cb.value);
  const style    = Array.from(document.querySelectorAll("#styleChecks input[type='checkbox']:checked")).map(cb => cb.value);
  const bestseller = document.getElementById("cakeBestseller").checked;

  if (!name) { showToast("❌ Vui lòng nhập tên bánh.", "error"); return; }
  if (isNaN(price) || price < 0) { showToast("❌ Vui lòng nhập giá hợp lệ.", "error"); return; }

  const btn = document.querySelector('#cakeForm button[type="submit"]');
  const existing = editingCakeId ? allCakes.find(c => c.id === editingCakeId) : null;

  try {
    await withBusy(btn, async () => {
      let image = cakeImg.url;
      if (cakeImg.file) {
        showToast("⏳ Đang tải ảnh lên…", "info");
        image = await uploadImage(cakeImg.file);
      }
      const now = new Date().toISOString();
      const cake = existing
        ? { ...existing, name, price, category, desc, audience, type, style, bestseller, image, updatedAt: now }
        : { id: generateId(), name, price, category, desc, audience, type, style, bestseller, image, createdAt: now };
      delete cake.description; // trường cũ, đã gộp vào desc

      // Bánh mới chỉ vào kho; có bán hôm nay hay không do admin chọn ở tab Menu hôm nay
      await MituDB.saveCake(cake);
    });
  } catch (err) {
    showToast(writeErrorMsg(err), "error");
    return;
  }

  showToast(existing
    ? "✅ Đã cập nhật bánh thành công!"
    : "✅ Đã thêm bánh mới vào kho! Chọn ở tab Menu hôm nay nếu có sẵn.", "success");

  const bestCount = getCakes().filter(c => c.bestseller).length;
  if (bestseller && bestCount > BESTSELLER_LIMIT) {
    showToast(`⚠️ Đang có ${bestCount} bánh bán chạy, trang chủ chỉ hiện ${BESTSELLER_LIMIT} bánh mới nhất.`, "info");
  }

  renderAll();
  document.getElementById("cakeModal").classList.remove("show");
  resetCakeForm();
}

// ── TODAY PANEL ───────────────────────────────────────────────
function initTodayPanel() {
  document.getElementById("saveTodayBtn")?.addEventListener("click", async e => {
    try {
      await withBusy(e.currentTarget, () => saveTodayToStorage());
      renderInventory();
      showToast(`✅ Đã lưu menu hôm nay! (${selectedToday.size} bánh)`, "success");
    } catch (err) {
      showToast(writeErrorMsg(err), "error");
    }
  });

  document.getElementById("deselectAllBtn")?.addEventListener("click", () => {
    selectedToday.clear();
    renderTodayPanel();
    showToast("🗑️ Đã bỏ chọn tất cả. Bấm Lưu để áp dụng.", "info");
  });

  // Set date
  const dateEl = document.getElementById("todayPanelDate");
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });
  }
}

function renderTodayPanel() {
  const grid = document.getElementById("todaySelectGrid");
  if (!grid) return;

  if (allCakes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📦</div>
        <h3>Kho bánh trống</h3>
        <p>Hãy thêm bánh vào kho trước nhé!</p>
      </div>`;
    updateTodayCount();
    return;
  }

  grid.innerHTML = "";
  allCakes.forEach(cake => {
    const card = createTodayCard(cake);
    grid.appendChild(card);
  });

  updateTodayCount();
}

function createTodayCard(cake) {
  const div = document.createElement("div");
  div.className = "today-select-card" + (selectedToday.has(cake.id) ? " selected" : "");
  div.dataset.id = cake.id;

  div.innerHTML = `
    <div class="today-card-img" style="position:relative">
      ${cake.image ? `<img src="${escH(cdnImage(cake.image, 300))}" alt="${escH(cake.name)}" loading="lazy" />` : "🎂"}
      <div class="today-card-check">✓</div>
    </div>
    <div class="today-card-name" title="${escH(cake.name)}">${escH(cake.name)}</div>
    <div class="today-card-price">${formatPrice(cake.price)}</div>`;

  div.addEventListener("click", () => {
    if (selectedToday.has(cake.id)) {
      selectedToday.delete(cake.id);
      div.classList.remove("selected");
    } else {
      selectedToday.add(cake.id);
      div.classList.add("selected");
    }
    updateTodayCount();
  });

  return div;
}

function updateTodayCount() {
  const el = document.getElementById("todayCount");
  // Chỉ đếm bánh còn trong kho
  const n = [...selectedToday].filter(id => allCakes.some(c => c.id === id)).length;
  if (el) el.textContent = `${n} bánh đã chọn`;
}

async function saveTodayToStorage() {
  // Chỉ lưu ID còn trong kho
  const ids = [...selectedToday].filter(id => allCakes.some(c => c.id === id));
  await MituDB.saveToday(ids);
  selectedToday = new Set(ids);
  updateTodayHint();
}

// Nhắc khi menu đang hiển thị là của hôm trước, chưa lưu cho hôm nay
function updateTodayHint() {
  const el = document.getElementById("todayHint");
  if (!el) return;
  const { isToday, date } = getTodayMenu();
  el.classList.toggle("is-stale", !isToday);
  el.textContent = isToday
    ? "Chạm vào bánh tiệm có sẵn hôm nay, rồi bấm Lưu."
    : `Chưa lưu menu cho hôm nay${date ? ` (đang hiện lựa chọn ngày ${date})` : ""}. Trang khách đang báo "đang cập nhật" – chọn lại rồi bấm Lưu.`;
}

// ── SETTINGS ─────────────────────────────────────────────────
function initSettings() {
  // Shop info form
  document.getElementById("shopInfoForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const cfg = getConfig();
    const val = id => document.getElementById(id)?.value.trim();
    const updated = {
      ...cfg,
      shopName:     val("s-shopName")     || cfg.shopName,
      shopPhone:    val("s-shopPhone")    || cfg.shopPhone,
      zaloPhone:    val("s-zaloPhone")    || cfg.zaloPhone,
      shopSlogan:   val("s-shopSlogan")   || cfg.shopSlogan,
      shopAddress:  val("s-shopAddress")  || cfg.shopAddress,
      facebookUrl:  val("s-facebookUrl")  || cfg.facebookUrl,
      tiktokUrl:    val("s-tiktokUrl")    || cfg.tiktokUrl,
      instagramUrl: val("s-instagramUrl") || cfg.instagramUrl,
    };
    try {
      await withBusy(e.submitter, () => MituDB.saveShop(updated));
      renderDataBanner();
      showToast("✅ Đã lưu thông tin tiệm!", "success");
    } catch (err) {
      showToast(writeErrorMsg(err), "error");
    }
  });

  // Change password form (Firebase Auth: phải nhập đúng mật khẩu hiện tại)
  document.getElementById("changePassForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const cur     = document.getElementById("s-curPass").value;
    const newP    = document.getElementById("s-newPass").value;
    const confirm = document.getElementById("s-confirmPass").value;

    if (newP.length < 8) { showToast("❌ Mật khẩu mới tối thiểu 8 ký tự!", "error"); return; }
    if (newP !== confirm) { showToast("❌ Xác nhận mật khẩu không khớp!", "error"); return; }

    try {
      await withBusy(e.submitter, () => MituDB.changePassword(cur, newP));
      document.getElementById("changePassForm").reset();
      showToast("✅ Đã đổi mật khẩu thành công!", "success");
    } catch (err) {
      const wrong = ["auth/wrong-password", "auth/invalid-credential"].includes(err?.code);
      showToast(wrong ? "❌ Mật khẩu hiện tại không đúng!"
        : err?.code === "auth/weak-password" ? "❌ Mật khẩu mới quá yếu."
        : writeErrorMsg(err), "error");
    }
  });

  // Sao lưu / khôi phục
  document.getElementById("exportDataBtn")?.addEventListener("click", exportData);
  const importInput = document.getElementById("importDataInput");
  document.getElementById("importDataBtn")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (file) importData(file);
  });

  // Danger zone
  document.getElementById("clearTodayBtn")?.addEventListener("click", () => {
    showConfirm("🗑️ Xóa menu hôm nay?", "Danh sách bánh hôm nay sẽ bị xóa, mục Menu hôm nay trên trang web sẽ báo đang cập nhật.", async () => {
      try {
        selectedToday.clear();
        await saveTodayToStorage();
        renderTodayPanel();
        renderInventory();
        showToast("✅ Đã xóa menu hôm nay.", "success");
      } catch (err) {
        showToast(writeErrorMsg(err), "error");
      }
    });
  });

  document.getElementById("clearAllCakesBtn")?.addEventListener("click", () => {
    showConfirm(
      "⚠️ Xóa toàn bộ kho bánh?",
      `Tất cả <strong>${allCakes.length} bánh</strong> trong kho sẽ bị xóa vĩnh viễn.<br><small>Nên tải bản sao lưu trước. Hành động này KHÔNG thể hoàn tác!</small>`,
      async () => {
        try {
          await MituDB.deleteAllCakes();
          selectedToday.clear();
          renderAll();
          showToast("✅ Đã xóa toàn bộ kho bánh.", "success");
        } catch (err) {
          showToast(writeErrorMsg(err), "error");
        }
      }
    );
  });
}

function loadSettings() {
  const cfg = getConfig();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  set("s-shopName", cfg.shopName);
  set("s-shopPhone", cfg.shopPhone);
  set("s-zaloPhone", cfg.zaloPhone);
  set("s-shopSlogan", cfg.shopSlogan);
  set("s-shopAddress", cfg.shopAddress);
  set("s-facebookUrl", cfg.facebookUrl);
  set("s-tiktokUrl", cfg.tiktokUrl);
  set("s-instagramUrl", cfg.instagramUrl);
}

// ── SAO LƯU / KHÔI PHỤC (thay cho backup tự động – cần gói Blaze) ──
function exportData() {
  const data = {
    app: "mitu-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    config: getConfig(),
    cakes: getCakes(),
    feedbacks: getFeedbacks(),
    today: getSavedTodayMenu(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mitu-sao-luu-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast("✅ Đã tải bản sao lưu về máy.", "success");
}

async function importData(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (e) {
    showToast("❌ File không đọc được.", "error");
    return;
  }
  if (data?.app !== "mitu-backup" || !Array.isArray(data.cakes) || !Array.isArray(data.feedbacks)) {
    showToast("❌ Đây không phải file sao lưu của Mitu.", "error");
    return;
  }

  showConfirm(
    "♻️ Khôi phục dữ liệu?",
    `Toàn bộ dữ liệu hiện tại sẽ được thay bằng bản sao lưu ngày <strong>${escH(String(data.exportedAt || "").slice(0, 10))}</strong>
     (${data.cakes.length} bánh, ${data.feedbacks.length} feedback).`,
    async () => {
      try {
        await MituDB.replaceAll({
          config: data.config || {},
          cakes: data.cakes.filter(c => c && c.id),
          feedbacks: data.feedbacks.filter(f => f && f.id),
          today: data.today && Array.isArray(data.today.ids) ? data.today : { date: "", ids: [] },
        });
        selectedToday = new Set(getSavedTodayMenu().ids);
        renderAll();
        loadSettings();
        renderDataBanner();
        showToast("✅ Đã khôi phục dữ liệu.", "success");
      } catch (err) {
        showToast(writeErrorMsg(err), "error");
      }
    }
  );
}

// ── CONFIRM DIALOG ────────────────────────────────────────────
function showConfirm(title, msg, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon">⚠️</div>
      <div class="confirm-title">${title}</div>
      <div class="confirm-msg">${msg}</div>
      <div class="confirm-btns">
        <button class="confirm-cancel">Hủy</button>
        <button class="confirm-ok">Xác nhận</button>
      </div>
    </div>`;

  overlay.querySelector(".confirm-cancel").addEventListener("click", () => document.body.removeChild(overlay));
  overlay.querySelector(".confirm-ok").addEventListener("click", () => {
    document.body.removeChild(overlay);
    onConfirm();
  });

  document.body.appendChild(overlay);
}

// ── FEEDBACK PANEL (Quản lý ảnh Feedback khách hàng) ──────────
function initFeedbackPanel() {
  document.getElementById("addFeedbackBtn")?.addEventListener("click", () => {
    openFeedbackModal(null);
  });

  // Modal close handlers
  document.getElementById("feedbackModalClose")?.addEventListener("click", closeFeedbackModal);
  document.getElementById("fbModalCancelBtn")?.addEventListener("click", closeFeedbackModal);
  document.getElementById("feedbackAdminModal")?.addEventListener("click", e => {
    if (e.target.id === "feedbackAdminModal") closeFeedbackModal();
  });

  // Image Upload Area
  const uploadArea = document.getElementById("fbImgUploadArea");
  const fileInput  = document.getElementById("fbImgFileInput");
  const urlInput   = document.getElementById("fbImgUrl");

  uploadArea?.addEventListener("click", () => fileInput.click());

  uploadArea?.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
  uploadArea?.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
  uploadArea?.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFbImageFile(file);
  });

  fileInput?.addEventListener("change", () => {
    if (fileInput.files[0]) handleFbImageFile(fileInput.files[0]);
  });

  urlInput?.addEventListener("input", () => {
    const val = urlInput.value.trim();
    fbImg = { url: val || null, file: null };
    setFbImagePreview(val || null);
  });

  document.getElementById("removeFbImgBtn")?.addEventListener("click", e => {
    e.stopPropagation();
    fbImg = { url: null, file: null };
    setFbImagePreview(null);
    fileInput.value = "";
    if (urlInput) urlInput.value = "";
  });

  // Form submit
  document.getElementById("feedbackAdminForm")?.addEventListener("submit", e => {
    e.preventDefault();
    saveFeedback();
  });
}

function setFbImagePreview(src) {
  const prev = document.getElementById("fbImgPreviewEl");
  if (prev.src.startsWith("blob:")) URL.revokeObjectURL(prev.src);
  prev.src = src || "";
  document.getElementById("fbImgUploadPreview").classList.toggle("show", !!src);
  document.getElementById("fbImgUploadDefault").style.display = src ? "none" : "";
}

function handleFbImageFile(file) {
  if (!checkImageFile(file)) return;
  fbImg = { url: null, file };
  setFbImagePreview(URL.createObjectURL(file));
  const urlInput = document.getElementById("fbImgUrl");
  if (urlInput) urlInput.value = "";
}

function renderFeedbackPanel() {
  const grid = document.getElementById("adminFeedbackGrid");
  if (!grid) return;

  const feedbacks = getFeedbacks();
  if (!feedbacks || feedbacks.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">💖</div>
        <h3>Chưa có ảnh feedback nào</h3>
        <p>Nhấn nút "+ Thêm ảnh Feedback" bên trên để thêm hình ảnh và phản hồi từ khách hàng.</p>
      </div>`;
    return;
  }

  grid.innerHTML = "";
  feedbacks.forEach(fb => {
    const card = document.createElement("div");
    card.className = "inv-card";

    const imgHTML = fb.image
      ? `<img src="${escH(cdnImage(fb.image, 400))}" alt="${escH(fb.caption || fb.name)}" />`
      : `<div class="cake-img-placeholder">📸</div>`;

    card.innerHTML = `
      <div class="inv-card-img">
        ${imgHTML}
        ${fb.badge ? `<span class="inv-badge in-today" style="bottom:8px;top:auto">${escH(fb.badge)}</span>` : ""}
      </div>
      <div class="inv-card-body">
        <div class="inv-card-name">${escH(fb.name)}</div>
        <div style="font-size:12px;color:#0068ff;font-weight:600;margin-bottom:4px">${escH(fb.channel || "💬 Phản hồi Zalo")}</div>
        <div style="font-size:13px;font-weight:700;color:var(--secondary);margin-bottom:4px;line-height:1.4">“${escH(fb.quote)}”</div>
        <div style="font-size:12px;color:var(--text-light);line-height:1.4;margin-bottom:12px;flex:1">${escH(fb.context || fb.caption || "")}</div>
        <div class="inv-card-actions">
          <button class="btn btn-sm btn-secondary btn-edit-fb">✏️ Sửa</button>
          <button class="btn btn-sm btn-danger btn-delete-fb">🗑️ Xóa</button>
        </div>
      </div>
    `;

    card.querySelector(".btn-edit-fb").addEventListener("click", () => openFeedbackModal(fb.id));
    card.querySelector(".btn-delete-fb").addEventListener("click", () => {
      showConfirm(
        "🗑️ Xóa ảnh Feedback?",
        `Bạn có chắc chắn muốn xóa phản hồi của "<strong>${escH(fb.name)}</strong>" không?`,
        () => deleteFeedback(fb.id)
      );
    });

    grid.appendChild(card);
  });
}

function openFeedbackModal(id) {
  editingFeedbackId = id;
  const modal = document.getElementById("feedbackAdminModal");
  const title = document.getElementById("feedbackModalTitle");
  const fileInput = document.getElementById("fbImgFileInput");
  const urlInput = document.getElementById("fbImgUrl");

  // Reset form
  document.getElementById("feedbackAdminForm").reset();
  fbImg = { url: null, file: null };
  setFbImagePreview(null);
  if (fileInput) fileInput.value = "";

  if (id) {
    title.textContent = "✏️ Sửa ảnh Feedback";
    const fb = getFeedbacks().find(f => f.id === id);
    if (!fb) return;

    document.getElementById("fbEditId").value = fb.id;
    document.getElementById("fbName").value = fb.name || "";
    document.getElementById("fbChannel").value = fb.channel || "💬 Phản hồi qua Zalo";
    document.getElementById("fbQuote").value = fb.quote || "";
    document.getElementById("fbBadge").value = fb.badge || "";
    document.getElementById("fbContext").value = fb.context || fb.caption || "";

    if (fb.image) {
      fbImg = { url: fb.image, file: null };
      if (urlInput) urlInput.value = fb.image;
      setFbImagePreview(cdnImage(fb.image, 600));
    }
  } else {
    title.textContent = "➕ Thêm ảnh Feedback mới";
    document.getElementById("fbEditId").value = "";
    document.getElementById("fbChannel").value = "💬 Phản hồi qua Zalo";
  }

  modal?.classList.add("show");
}

function closeFeedbackModal() {
  document.getElementById("feedbackAdminModal")?.classList.remove("show");
  editingFeedbackId = null;
  fbImg = { url: null, file: null };
}

async function saveFeedback() {
  const name = document.getElementById("fbName").value.trim();
  const quote = document.getElementById("fbQuote").value.trim();
  const channel = document.getElementById("fbChannel").value.trim() || "💬 Phản hồi qua Zalo";
  const badge = document.getElementById("fbBadge").value.trim();
  const context = document.getElementById("fbContext").value.trim();

  if (!name || !quote) {
    showToast("❌ Vui lòng nhập tên khách hàng và lời khen!", "error");
    return;
  }
  if (!fbImg.url && !fbImg.file) {
    showToast("❌ Vui lòng tải lên ảnh hoặc nhập link ảnh!", "error");
    return;
  }

  const btn = document.querySelector('#feedbackAdminForm button[type="submit"]');
  const existing = editingFeedbackId ? getFeedbacks().find(f => f.id === editingFeedbackId) : null;

  try {
    await withBusy(btn, async () => {
      let image = fbImg.url;
      if (fbImg.file) {
        showToast("⏳ Đang tải ảnh lên…", "info");
        image = await uploadImage(fbImg.file);
      }
      const fields = { name, quote, channel, badge, context, caption: context || badge || name, image };
      const fb = existing
        ? { ...existing, ...fields, updatedAt: new Date().toISOString() }
        : { id: "fb-" + generateId(), ...fields, createdAt: new Date().toISOString() };
      await MituDB.saveFeedback(fb);
    });
  } catch (err) {
    showToast(writeErrorMsg(err), "error");
    return;
  }

  showToast(existing ? "✅ Đã cập nhật ảnh Feedback!" : "✅ Đã thêm ảnh Feedback mới!", "success");
  closeFeedbackModal();
  renderFeedbackPanel();
}

async function deleteFeedback(id) {
  try {
    await MituDB.deleteFeedback(id);
    renderFeedbackPanel();
    showToast("🗑️ Đã xóa ảnh Feedback!", "success");
  } catch (err) {
    showToast(writeErrorMsg(err), "error");
  }
}

// ── UTILITIES ─────────────────────────────────────────────────
function getCatLabel(cat) {
  const map = {
    "all": "Tất cả",
    "birthday": "Bánh sinh nhật",
    "mini": "Bánh Mini",
    "fruit": "Bánh Hoa quả",
    "square": "Bánh Vuông",
    "male": "Bánh cho Nam",
    "female": "Bánh cho Nữ",
    "boy": "Bánh cho Bé Trai",
    "girl": "Bánh cho Bé Gái",
    "kids": "Bánh cho Bé",
    "troll": "Bánh Troll & Vui nhộn",
    "sinh-nhat": "Bánh sinh nhật",
    "cuoi": "Cưới / Tiệc",
    "mousse": "Mousse",
    "cheesecake": "Cheesecake",
  };
  return map[cat] || cat || "Khác";
}

function showToast(msg, type = "info") {
  const toast = document.getElementById("adminToast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function escH(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
