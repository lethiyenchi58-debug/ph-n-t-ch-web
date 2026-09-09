/**
 * TIỆM BÁNH MITU – admin.js
 * Toàn bộ logic trang quản trị
 */

// ── State ─────────────────────────────────────────────────────
let editingCakeId   = null;   // null = thêm mới, string = đang sửa
let uploadedImgB64  = null;   // base64 ảnh đang upload
let selectedToday   = new Set(); // ID bánh chọn cho hôm nay
let allCakes        = [];
let invFilter       = { search: "", cat: "all" };

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  initLogin();
  initSidebar();
  initTopbar();
  initInventory();
  initTodayPanel();
  initSettings();
  initCakeModal();
  initLogout();
});

// ── Session ───────────────────────────────────────────────────
function checkSession() {
  if (sessionStorage.getItem("mitu_logged_in") === "1") {
    showAdminLayout();
  }
}

function showAdminLayout() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminLayout").classList.remove("hidden");
  allCakes = getCakes();
  renderInventory();
  renderTodayPanel();
  loadSettings();
  updateTopbarDate();
}

// ── Login ─────────────────────────────────────────────────────
function initLogin() {
  const form = document.getElementById("loginForm");
  form?.addEventListener("submit", e => {
    e.preventDefault();
    const user     = document.getElementById("loginUser").value.trim();
    const pass     = document.getElementById("loginPass").value;
    const savedUser = localStorage.getItem("mitu_admin_user") || "admin";
    const savedPass = localStorage.getItem("mitu_admin_pass") || "mitu2024";
    const errEl     = document.getElementById("loginError");

    if (user === savedUser && pass === savedPass) {
      sessionStorage.setItem("mitu_logged_in", "1");
      errEl.classList.remove("show");
      showAdminLayout();
    } else {
      errEl.classList.add("show");
      document.getElementById("loginPass").value = "";
    }
  });

  // Press Enter on password
  document.getElementById("loginPass")?.addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("loginForm").dispatchEvent(new Event("submit"));
  });
}

// ── Logout ────────────────────────────────────────────────────
function initLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("mitu_logged_in");
    location.reload();
  });
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

      const titles = { inventory: "📦 Kho bánh", today: "🌞 Menu hôm nay", settings: "⚙️ Cài đặt" };
      topbarTitle.textContent = titles[panelId] || panelId;

      // Close sidebar on mobile
      if (window.innerWidth <= 768) sidebar.classList.remove("open");
    });
  });

  // Mobile toggle
  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

// ── Topbar ────────────────────────────────────────────────────
function initTopbar() {
  updateTopbarDate();
  const cfg = getConfig();
  // topbar name from config if needed
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
  if (invFilter.cat !== "all") {
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
    const card = createInvCard(cake);
    grid.appendChild(card);
  });
}

function createInvCard(cake) {
  const div = document.createElement("div");
  div.className = "inv-card";
  const catLabel = getCatLabel(cake.category);
  div.innerHTML = `
    <div class="inv-card-img">
      ${cake.image ? `<img src="${cake.image}" alt="${escH(cake.name)}" loading="lazy">` : "🎂"}
    </div>
    <div class="inv-card-body">
      <div class="inv-card-name" title="${escH(cake.name)}">${escH(cake.name)}</div>
      <div class="inv-card-price">${formatPrice(cake.price)}</div>
      <span class="inv-card-cat">${catLabel}</span>
      <div class="inv-card-actions">
        <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${cake.id}">✏️ Sửa</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${cake.id}">🗑️</button>
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
    () => {
      allCakes = allCakes.filter(c => c.id !== id);
      saveCakes();
      // Also remove from today if needed
      selectedToday.delete(id);
      saveTodayToStorage();
      renderInventory();
      renderTodayPanel();
      showToast("✅ Đã xóa bánh khỏi kho.", "success");
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
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

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
    uploadedImgB64 = null;
    document.getElementById("imgUploadPreview").classList.remove("show");
    document.getElementById("imgUploadDefault").style.display = "";
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

function handleImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showToast("❌ File quá lớn! Tối đa 5MB.", "error");
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("❌ Vui lòng chọn file ảnh.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    uploadedImgB64 = ev.target.result;
    document.getElementById("imgPreviewEl").src = uploadedImgB64;
    document.getElementById("imgUploadPreview").classList.add("show");
    document.getElementById("imgUploadDefault").style.display = "none";
  };
  reader.readAsDataURL(file);
}

function openCakeModal(id) {
  editingCakeId = id;
  resetCakeForm();

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

    if (cake.image) {
      uploadedImgB64 = cake.image;
      document.getElementById("imgPreviewEl").src = cake.image;
      document.getElementById("imgUploadPreview").classList.add("show");
      document.getElementById("imgUploadDefault").style.display = "none";
    }
  }

  modal.classList.add("show");
  setTimeout(() => document.getElementById("cakeName").focus(), 200);
}

function resetCakeForm() {
  document.getElementById("cakeForm").reset();
  document.getElementById("cakeId").value = "";
  uploadedImgB64 = null;
  document.getElementById("imgUploadPreview").classList.remove("show");
  document.getElementById("imgUploadDefault").style.display = "";
  document.getElementById("imgPreviewEl").src = "";
  document.getElementById("imgFileInput").value = "";
  editingCakeId = null;

  document.querySelectorAll("#audienceChecks input, #typeChecks input, #styleChecks input").forEach(cb => {
    cb.checked = false;
  });
}

function saveCake() {
  const name     = document.getElementById("cakeName").value.trim();
  const price    = parseFloat(document.getElementById("cakePrice").value);
  const category = document.getElementById("cakeCategory").value;
  const desc     = document.getElementById("cakeDesc").value.trim();

  // Multi-tag values
  const audience = Array.from(document.querySelectorAll("#audienceChecks input[type='checkbox']:checked")).map(cb => cb.value);
  const type     = Array.from(document.querySelectorAll("#typeChecks input[type='checkbox']:checked")).map(cb => cb.value);
  const style    = Array.from(document.querySelectorAll("#styleChecks input[type='checkbox']:checked")).map(cb => cb.value);

  if (!name) { showToast("❌ Vui lòng nhập tên bánh.", "error"); return; }
  if (isNaN(price) || price < 0) { showToast("❌ Vui lòng nhập giá hợp lệ.", "error"); return; }

  if (editingCakeId) {
    // Update existing
    const idx = allCakes.findIndex(c => c.id === editingCakeId);
    if (idx !== -1) {
      allCakes[idx] = {
        ...allCakes[idx],
        name, price, category,
        description: desc,
        desc: desc,
        audience, type, style,
        image: uploadedImgB64 !== null ? uploadedImgB64 : allCakes[idx].image,
        updatedAt: new Date().toISOString(),
      };
    }
    showToast("✅ Đã cập nhật bánh thành công!", "success");
  } else {
    // Add new
    const newCake = {
      id: generateId(),
      name, price, category,
      description: desc,
      desc: desc,
      audience, type, style,
      image: uploadedImgB64 || null,
      createdAt: new Date().toISOString(),
    };
    allCakes.unshift(newCake);
    selectedToday.add(newCake.id); // Add to today's menu by default
    saveTodayToStorage();
    showToast("✅ Đã thêm bánh mới vào kho!", "success");
  }

  saveCakes();
  renderInventory();
  renderTodayPanel();
  document.getElementById("cakeModal").classList.remove("show");
  resetCakeForm();
}

function saveCakes() {
  localStorage.setItem("mitu_cakes", JSON.stringify(allCakes));
}

// ── TODAY PANEL ───────────────────────────────────────────────
function initTodayPanel() {
  // Load existing selections
  const today = getTodayMenu();
  today.ids.forEach(id => selectedToday.add(id));
  updateTodayCount();

  document.getElementById("saveTodayBtn")?.addEventListener("click", () => {
    saveTodayToStorage();
    showToast(`✅ Đã lưu menu hôm nay! (${selectedToday.size} bánh)`, "success");
  });

  document.getElementById("deselectAllBtn")?.addEventListener("click", () => {
    selectedToday.clear();
    renderTodayPanel();
    showToast("🗑️ Đã bỏ chọn tất cả.", "info");
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
      ${cake.image ? `<img src="${cake.image}" alt="${escH(cake.name)}" loading="lazy" />` : "🎂"}
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
  if (el) el.textContent = `${selectedToday.size} bánh đã chọn`;
}

function saveTodayToStorage() {
  const today = new Date().toLocaleDateString("vi-VN");
  localStorage.setItem("mitu_today", JSON.stringify({ date: today, ids: [...selectedToday] }));
}

// ── SETTINGS ─────────────────────────────────────────────────
function initSettings() {
  // Shop info form
  document.getElementById("shopInfoForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const cfg = getConfig();
    const updated = {
      ...cfg,
      shopName:    document.getElementById("s-shopName").value.trim() || cfg.shopName,
      shopPhone:   document.getElementById("s-shopPhone").value.trim() || cfg.shopPhone,
      zaloPhone:   document.getElementById("s-zaloPhone").value.trim() || cfg.zaloPhone,
      shopSlogan:  document.getElementById("s-shopSlogan").value.trim() || cfg.shopSlogan,
      shopAddress: document.getElementById("s-shopAddress").value.trim() || cfg.shopAddress,
      facebookUrl: document.getElementById("s-facebookUrl").value.trim() || cfg.facebookUrl,
    };
    localStorage.setItem("mitu_config", JSON.stringify(updated));
    showToast("✅ Đã lưu thông tin tiệm!", "success");
  });

  // Change password form
  document.getElementById("changePassForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const cur     = document.getElementById("s-curPass").value;
    const newP    = document.getElementById("s-newPass").value;
    const confirm = document.getElementById("s-confirmPass").value;
    const saved   = localStorage.getItem("mitu_admin_pass") || "mitu2024";

    if (cur !== saved) { showToast("❌ Mật khẩu hiện tại không đúng!", "error"); return; }
    if (newP.length < 6) { showToast("❌ Mật khẩu mới tối thiểu 6 ký tự!", "error"); return; }
    if (newP !== confirm) { showToast("❌ Xác nhận mật khẩu không khớp!", "error"); return; }

    localStorage.setItem("mitu_admin_pass", newP);
    document.getElementById("changePassForm").reset();
    showToast("✅ Đã đổi mật khẩu thành công!", "success");
  });

  // Danger zone
  document.getElementById("clearTodayBtn")?.addEventListener("click", () => {
    showConfirm("🗑️ Xóa menu hôm nay?", "Danh sách bánh hôm nay sẽ bị xóa, trang web sẽ không hiển thị bánh nào.", () => {
      selectedToday.clear();
      saveTodayToStorage();
      renderTodayPanel();
      showToast("✅ Đã xóa menu hôm nay.", "success");
    });
  });

  document.getElementById("clearAllCakesBtn")?.addEventListener("click", () => {
    showConfirm(
      "⚠️ Xóa toàn bộ kho bánh?",
      `Tất cả <strong>${allCakes.length} bánh</strong> trong kho sẽ bị xóa vĩnh viễn.<br><small>Hành động này KHÔNG thể hoàn tác!</small>`,
      () => {
        allCakes = [];
        selectedToday.clear();
        saveCakes();
        saveTodayToStorage();
        renderInventory();
        renderTodayPanel();
        showToast("✅ Đã xóa toàn bộ kho bánh.", "success");
      }
    );
  });
}

function loadSettings() {
  const cfg = getConfig();
  document.getElementById("s-shopName").value    = cfg.shopName || "";
  document.getElementById("s-shopPhone").value   = cfg.shopPhone || "";
  document.getElementById("s-zaloPhone").value   = cfg.zaloPhone || "";
  document.getElementById("s-shopSlogan").value  = cfg.shopSlogan || "";
  document.getElementById("s-shopAddress").value = cfg.shopAddress || "";
  document.getElementById("s-facebookUrl").value = cfg.facebookUrl || "";
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
