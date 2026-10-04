/**
 * TIỆM BÁNH MITU – app.js
 * Logic trang khách hàng
 */

// ── Globals ──────────────────────────────────────────────────
let currentSlide           = 0;
let slideInterval          = null;
let feedbackConveyorAnimId = null;
let currentOrderCake       = null;
let currentSearch          = "";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Multi-tag catalog filters
let currentFilters = {
  category: "all",
  audience: "all",
  type: "all",
  style: "all"
};

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyConfig();
  renderTodayDate();
  initCatalog();
  renderBestsellers();
  initHeroSlider();
  initNav();
  initModal();
  renderFeedbackSlider();
  initFeedbackLightbox();
  initSmoothScroll();
  buildDrips();
  initReveals();
});

// ── Ảnh bánh hỏng link: thay bằng khung "Mitu" thay vì ô trống ──
document.addEventListener("error", e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  const box = img.closest(".cake-img-wrap, .best-img, #modalCakeImg");
  if (!box) return;
  const ph = document.createElement("span");
  ph.className = box.id === "modalCakeImg" ? "modal-cake-placeholder" : "cake-img-placeholder";
  ph.textContent = "Mitu";
  img.replaceWith(ph);
}, true);

// ── Chuyển cảnh: kem chảy & hiện dần khi cuộn ─────────────────
// Vẽ giọt kem ngẫu nhiên nhưng cố định (seed theo thứ tự) cho mỗi .drip
function buildDrips() {
  const W = 1440, BAND = 12;
  document.querySelectorAll("[data-drip]").forEach((el, n) => {
    let seed = 11 + n * 37;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const f = v => v.toFixed(1);
    let tears = "";
    let x = 24 + rand() * 40;
    while (x < W - 24) {
      const w = 12 + rand() * 20;            // bề rộng giọt
      const y = BAND + 8 + rand() * 34;       // tâm đầu tròn của giọt
      const l = x - w / 2, r = x + w / 2, s = 7;
      tears += `<path class="drip-tear" style="--d:${(rand() * .6).toFixed(2)}s" d="M${f(l - s)} ${BAND - 1}Q${f(l)} ${BAND - 1} ${f(l)} ${BAND + 6}L${f(l)} ${f(y)}A${f(w / 2)} ${f(w / 2)} 0 0 0 ${f(r)} ${f(y)}L${f(r)} ${BAND + 6}Q${f(r)} ${BAND - 1} ${f(r + s)} ${BAND - 1}Z"/>`;
      x += w + 24 + rand() * 72;
    }
    el.innerHTML = `<svg viewBox="0 0 ${W} 90" preserveAspectRatio="xMidYMin slice" fill="currentColor" focusable="false"><path d="M0 0H${W}V${BAND}H0Z"/>${tears}</svg>`;
  });
}

const REVEAL_SELECTOR = [
  ".section-tag-center", ".about-content > .section-tag", ".section-title", ".section-desc",
  ".today-date", ".cat-tiles", ".catalog-search-wrap",
  ".bestseller-head .section-tag", ".bestseller-nav", ".bestseller-track",
  ".custom-feat-card", ".custom-actions",
  ".fb-stat-pill", ".feedback-slider-wrapper",
  ".about-img-main", ".about-img-small", ".about-text", ".stats-row",
  ".footer-brand", ".footer-col"
].join(", ");

function initReveals() {
  if (!document.documentElement.classList.contains("motion-ok")) return;

  // Đánh dấu & so le thời gian trong từng phần
  document.querySelectorAll(".section, .footer").forEach(scope => {
    scope.querySelectorAll(REVEAL_SELECTOR).forEach((el, i) => {
      el.dataset.reveal = el.matches(".about-img-main, .about-img-small") ? "img" : "";
      el.style.setProperty("--rd", `${Math.min(i, 7) * 85}ms`);
    });
  });

  const targets = document.querySelectorAll("[data-reveal], .drip, #today, #catalog, #feedback");
  const reveal = el => {
    el.classList.add("is-in");
    if (el.matches(".stats-row")) countUpStats(el);
  };

  if (!("IntersectionObserver" in window)) {
    targets.forEach(reveal);
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px" });

  targets.forEach(el => io.observe(el));
}

// "500+" → đếm từ 0 lên 500, giữ nguyên hậu tố
function countUpStats(row) {
  row.querySelectorAll(".stat-num").forEach(el => {
    const m = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!m) return;
    const end = parseInt(m[1], 10), suffix = m[2];
    const start = performance.now(), dur = 1400;
    const tick = now => {
      const t = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3))) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ── Apply shop config ─────────────────────────────────────────
function applyConfig() {
  const cfg = getConfig();
  const zalo = cfg.zaloPhone || "0936290932";
  const zaloUrl = `https://zalo.me/${zalo.replace(/\s/g, "")}`;

  // Nav top bar
  const navTopZalo = document.getElementById("nav-top-zalo");
  if (navTopZalo) {
    navTopZalo.textContent = formatPhone(zalo);
    navTopZalo.href = zaloUrl;
  }

  // Nav Zalo button
  const navZaloBtn = document.getElementById("nav-zalo-btn");
  if (navZaloBtn) navZaloBtn.href = zaloUrl;

  // Hero Zalo button
  const heroZaloBtn = document.getElementById("heroZaloBtn");
  if (heroZaloBtn) heroZaloBtn.href = zaloUrl;

  // Footer
  document.getElementById("footerSlogan").textContent =
    cfg.shopSlogan || "Bánh ngọt handmade – Tình yêu trong từng chiếc bánh.";
  document.getElementById("footer-address").textContent =
    cfg.shopAddress || "173 Vạn Phúc - Hà Đông, Hà Nội, Việt Nam";
  const footerPhone = document.getElementById("footer-phone");
  const footerPhoneText = document.getElementById("footer-phone-text");
  if (footerPhone) footerPhone.href = `tel:${cfg.shopPhone || zalo}`;
  if (footerPhoneText) {
    footerPhoneText.textContent = formatPhone(cfg.shopPhone || zalo);
  } else if (footerPhone) {
    footerPhone.textContent = `${formatPhone(cfg.shopPhone || zalo)}`;
  }
  const footerPhoneContact = document.getElementById("footer-phone-contact");
  if (footerPhoneContact) { footerPhoneContact.textContent = formatPhone(cfg.shopPhone || zalo); footerPhoneContact.href = `tel:${cfg.shopPhone || zalo}`; }

  const footerZaloLink = document.getElementById("footer-zalo-link");
  const footerZaloLinkText = document.getElementById("footer-zalo-link-text");
  if (footerZaloLink) {
    footerZaloLink.href = zaloUrl;
    footerZaloLink.target = "_blank";
  }
  if (footerZaloLinkText) {
    footerZaloLinkText.textContent = `Zalo: ${formatPhone(zalo)}`;
  } else if (footerZaloLink) {
    footerZaloLink.textContent = `Zalo: ${formatPhone(zalo)}`;
  }
  const footerZaloContact = document.getElementById("footer-zalo-contact");
  if (footerZaloContact) { footerZaloContact.textContent = `Zalo: ${formatPhone(zalo)}`; footerZaloContact.href = zaloUrl; footerZaloContact.target = "_blank"; }

  const footerFb = document.getElementById("footer-facebook");
  if (footerFb && cfg.facebookUrl && cfg.facebookUrl !== "#") {
    footerFb.href = cfg.facebookUrl;
  }
  const footerFbIcon = document.getElementById("footer-facebook-icon");
  if (footerFbIcon && cfg.facebookUrl && cfg.facebookUrl !== "#") {
    footerFbIcon.href = cfg.facebookUrl;
  }
  const footerZaloIcon = document.getElementById("footer-zalo");
  if (footerZaloIcon) footerZaloIcon.href = zaloUrl;

  const footerTiktok = document.getElementById("footer-tiktok");
  if (footerTiktok) {
    footerTiktok.href = cfg.tiktokUrl || "https://www.tiktok.com/@tiembanhmitu";
    footerTiktok.target = "_blank";
    footerTiktok.rel = "noopener noreferrer";
    footerTiktok.onclick = null;
  }

  const footerInsta = document.getElementById("footer-instagram");
  if (footerInsta) {
    footerInsta.href = cfg.instagramUrl || "https://www.instagram.com/tiembanh_mitu/";
    footerInsta.target = "_blank";
    footerInsta.rel = "noopener noreferrer";
  }
  const footerInstaIcon = document.getElementById("footer-instagram-icon");
  if (footerInstaIcon) {
    footerInstaIcon.href = cfg.instagramUrl || "https://www.instagram.com/tiembanh_mitu/";
    footerInstaIcon.target = "_blank";
    footerInstaIcon.rel = "noopener noreferrer";
  }

  // Floating Zalo & Maps
  const floatZalo = document.getElementById("floatZalo");
  if (floatZalo) floatZalo.href = zaloUrl;
  const floatMaps = document.getElementById("floatMaps");
  if (floatMaps && cfg.mapsUrl) floatMaps.href = cfg.mapsUrl;

  // Direct Zalo btn (custom section)
  const directZaloBtn = document.getElementById("directZaloBtn");
  if (directZaloBtn) directZaloBtn.href = zaloUrl;
  const customPhoneBtn = document.getElementById("customPhoneBtn");
  if (customPhoneBtn) {
    customPhoneBtn.href = `tel:${cfg.shopPhone || zalo}`;
    customPhoneBtn.textContent = `Gọi ${formatPhone(cfg.shopPhone || zalo)}`;
  }

  // Feedback Zalo CTA
  const feedbackZaloBtn = document.getElementById("feedbackZaloBtn");
  if (feedbackZaloBtn) feedbackZaloBtn.href = zaloUrl;
}

// ── Today date ────────────────────────────────────────────────
function renderTodayDate() {
  const el = document.getElementById("todayDate");
  if (!el) return;
  const now = new Date();
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  el.textContent = now.toLocaleDateString("vi-VN", opts);
}

// ── MENU HÔM NAY & CÁC MẪU BÁNH ───────────────────────────────
const GRID_LIMIT = 8; // số bánh hiện trước khi bấm "Xem thêm"

// Ô loại bánh trong "Các mẫu bánh" (cùng thứ tự với menu xổ xuống)
const CATEGORY_TILES = [
  { cat: "all",      label: "Tất cả" },
  { cat: "birthday", label: "Sinh nhật" },
  { cat: "mini",     label: "Mini" },
  { cat: "fruit",    label: "Hoa quả" },
  { cat: "male",     label: "Cho Nam" },
  { cat: "female",   label: "Cho Nữ" },
  { cat: "boy",      label: "Bé trai" },
  { cat: "girl",     label: "Bé gái" },
  { cat: "troll",    label: "Troll" },
];

function initCatalog() {
  applyFiltersFromUrl();
  renderTodayGrid();
  renderCategoryTiles();

  // Tìm kiếm
  const searchInput = document.getElementById("cakeSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  searchInput?.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    clearSearchBtn?.classList.toggle("hidden", !currentSearch);
    updateFilterUI();
    renderCakeGrid();
  });

  clearSearchBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    currentSearch = "";
    clearSearchBtn?.classList.add("hidden");
    updateFilterUI();
    renderCakeGrid();
    searchInput?.focus();
  });

  // Link loại bánh ở menu trên & footer: lọc sẵn, việc cuộn tới #catalog do initSmoothScroll lo
  document.querySelectorAll("a[data-cat]").forEach(link => {
    link.addEventListener("click", () => setCategory(link.dataset.cat || "all"));
  });

  document.getElementById("clearFiltersBtn")?.addEventListener("click", clearAllFilters);

  window.addEventListener("popstate", () => {
    applyFiltersFromUrl();
    renderCakeGrid();
  });

  updateFilterUI();
  renderCakeGrid();
}

function setCategory(cat) {
  currentFilters.category = cat;
  updateFilterUI();
  renderCakeGrid();
  updateUrlFromFilters();
}

// Lưới bánh: hiện GRID_LIMIT bánh đầu, phần còn lại sau nút "Xem thêm"
function fillGrid(grid, moreBox, cakes) {
  grid.innerHTML = "";
  const append = list => list.forEach((cake, i) => {
    const card = createCakeCard(cake);
    card.style.setProperty("--i", Math.min(i, 11));
    grid.appendChild(card);
  });
  append(cakes.slice(0, GRID_LIMIT));

  if (!moreBox) return;
  moreBox.innerHTML = "";
  const rest = cakes.slice(GRID_LIMIT);
  if (rest.length === 0) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-more";
  btn.textContent = `Xem thêm ${rest.length} bánh`;
  btn.addEventListener("click", () => {
    append(rest);
    moreBox.innerHTML = "";
  });
  moreBox.appendChild(btn);
}

// Menu hôm nay: bánh admin chọn cho hôm nay (chưa chọn thì cả kho)
function renderTodayGrid() {
  const grid = document.getElementById("todayGrid");
  if (!grid) return;
  const allCakes = getCakes();
  const todayObj = getTodayMenu();
  let cakes = todayObj?.ids?.length ? allCakes.filter(c => todayObj.ids.includes(c.id)) : [];
  if (cakes.length === 0) cakes = allCakes;
  fillGrid(grid, document.getElementById("todayMore"), cakes);
}

// Ô loại bánh: ảnh lấy từ bánh đầu tiên thuộc loại, kèm số mẫu
function renderCategoryTiles() {
  const box = document.getElementById("catTiles");
  if (!box) return;
  const allCakes = getCakes();
  const only = cat => ({ category: cat, audience: "all", type: "all", style: "all" });

  box.innerHTML = CATEGORY_TILES.map(({ cat, label }) => {
    const cakes = cat === "all" ? allCakes : allCakes.filter(c => matchCake(c, only(cat)));
    if (cat !== "all" && cakes.length === 0) return "";
    const cover = cat === "all" ? "images/logo.png" : cakes.find(c => c.image)?.image;
    return `
      <button type="button" class="cat-tile${cat === "all" ? " cat-tile-all" : ""}" role="tab" data-cat="${cat}" aria-selected="false">
        <span class="cat-tile-img">${cover ? `<img src="${escHtml(cover)}" alt="" loading="lazy" />` : ""}</span>
        <span class="cat-tile-name">${label}</span>
        <span class="cat-tile-count">${cakes.length} mẫu</span>
      </button>`;
  }).join("");

  box.querySelectorAll(".cat-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const cat = tile.dataset.cat;
      // Bấm lại loại đang chọn → quay về Tất cả
      setCategory(cat === currentFilters.category ? "all" : cat);
      tile.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });
}

function clearAllFilters() {
  currentFilters = {
    category: "all",
    audience: "all",
    type: "all",
    style: "all"
  };
  currentSearch = "";
  const sInput = document.getElementById("cakeSearchInput");
  if (sInput) sInput.value = "";
  document.getElementById("clearSearchBtn")?.classList.add("hidden");

  updateFilterUI();
  renderCakeGrid();
  updateUrlFromFilters();
}

function applyFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  currentFilters.category = params.get("category") || "all";
  currentFilters.audience = params.get("audience") || "all";
  currentFilters.type     = params.get("type")     || "all";
  currentFilters.style    = params.get("style")    || "all";
  updateFilterUI();
}

function updateUrlFromFilters() {
  const params = new URLSearchParams();
  if (currentFilters.category !== "all") params.set("category", currentFilters.category);
  if (currentFilters.audience !== "all") params.set("audience", currentFilters.audience);
  if (currentFilters.type     !== "all") params.set("type", currentFilters.type);
  if (currentFilters.style    !== "all") params.set("style", currentFilters.style);

  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}#catalog` : `${window.location.pathname}#catalog`;
  window.history.replaceState({ filters: { ...currentFilters } }, "", newUrl);
}

function updateFilterUI() {
  // 1. Main Category Pills active state
  document.querySelectorAll("#catTiles .cat-tile").forEach(tile => {
    const on = tile.dataset.cat === currentFilters.category;
    tile.classList.toggle("active", on);
    tile.setAttribute("aria-selected", on ? "true" : "false");
  });

  // 2. Detailed Filter Chips active state
  document.querySelectorAll(".filter-chip").forEach(chip => {
    const fType = chip.dataset.filter;
    const fVal  = chip.dataset.val;
    if (fType && currentFilters[fType] !== undefined) {
      chip.classList.toggle("active", currentFilters[fType] === fVal);
    }
  });

  // 3. Active Chips Bar & Count Badge
  const activeChipsContainer = document.getElementById("activeChips");
  const clearBtn = document.getElementById("clearFiltersBtn");
  const filterBadge = document.getElementById("filterBadge");

  let activeCount = 0;
  const activeList = [];

  if (currentFilters.category !== "all") {
    activeCount++;
    activeList.push({
      key: "category",
      label: getCategoryLabel(currentFilters.category) || currentFilters.category
    });
  }
  if (currentFilters.audience !== "all") {
    activeCount++;
    activeList.push({
      key: "audience",
      label: getAudienceLabel(currentFilters.audience) || currentFilters.audience
    });
  }
  if (currentFilters.type !== "all") {
    activeCount++;
    activeList.push({
      key: "type",
      label: getTypeLabel(currentFilters.type) || currentFilters.type
    });
  }
  if (currentFilters.style !== "all") {
    activeCount++;
    activeList.push({
      key: "style",
      label: getStyleLabel(currentFilters.style) || currentFilters.style
    });
  }

  // Render chips
  if (activeChipsContainer) {
    activeChipsContainer.innerHTML = activeList.map(item => `
      <span class="active-tag-chip">
        ${item.label}
        <span class="remove-chip" data-key="${item.key}" title="Bỏ lọc">✕</span>
      </span>
    `).join("");

    activeChipsContainer.querySelectorAll(".remove-chip").forEach(xBtn => {
      xBtn.addEventListener("click", () => {
        const k = xBtn.dataset.key;
        if (k) {
          currentFilters[k] = "all";
          updateFilterUI();
          renderCakeGrid();
          updateUrlFromFilters();
        }
      });
    });
  }

  // Clear button visibility
  if (clearBtn) {
    if (activeCount > 0) {
      clearBtn.classList.remove("hidden");
    } else {
      clearBtn.classList.add("hidden");
    }
  }

  // Mobile badge
  if (filterBadge) {
    if (activeCount > 0) {
      filterBadge.textContent = activeCount;
      filterBadge.classList.add("show");
    } else {
      filterBadge.classList.remove("show");
    }
  }
}

// ── Match Cake Logic (Multi-tag, search & multi-category) ─────
function matchCake(cake, f, searchStr = "") {
  // 0. Search term check
  if (searchStr) {
    const q = searchStr.toLowerCase();
    const nameMatch = cake.name?.toLowerCase().includes(q);
    const descMatch = (cake.desc || cake.description || "").toLowerCase().includes(q);
    const catMatch  = (getCategoryLabel(cake.category) || "").toLowerCase().includes(q);
    const tagMatch  = [...(cake.audience || []), ...(cake.type || []), ...(cake.style || [])]
      .some(t => (getAudienceLabel(t) || getTypeLabel(t) || getStyleLabel(t) || t).toLowerCase().includes(q));

    if (!nameMatch && !descMatch && !catMatch && !tagMatch) return false;
  }

  // 1. Category check
  if (f.category && f.category !== "all") {
    let matchCat = false;
    if (cake.category === f.category) matchCat = true;
    else if (f.category === "birthday" && (cake.category === "birthday" || cake.type?.includes("birthday"))) matchCat = true;
    else if (f.category === "mini" && (cake.category === "mini" || cake.type?.includes("mini"))) matchCat = true;
    else if (f.category === "fruit" && (cake.category === "fruit" || cake.type?.includes("fruit"))) matchCat = true;
    else if (f.category === "square" && (cake.category === "square" || cake.type?.includes("square"))) matchCat = true;
    else if (f.category === "male" && (cake.category === "male" || cake.audience?.includes("male"))) matchCat = true;
    else if (f.category === "female" && (cake.category === "female" || cake.audience?.includes("female"))) matchCat = true;
    else if (f.category === "boy" && (cake.category === "boy" || (cake.category === "kids" && cake.audience?.includes("boy")) || cake.audience?.includes("boy"))) matchCat = true;
    else if (f.category === "girl" && (cake.category === "girl" || (cake.category === "kids" && cake.audience?.includes("girl")) || cake.audience?.includes("girl"))) matchCat = true;
    else if (f.category === "kids" && (cake.category === "kids" || cake.audience?.some(a => ["kids", "boy", "girl"].includes(a)))) matchCat = true;
    else if (f.category === "troll" && (cake.category === "troll" || cake.style?.includes("funny"))) matchCat = true;
    if (!matchCat) return false;
  }

  // 2. Audience check
  if (f.audience && f.audience !== "all") {
    if (!cake.audience || !cake.audience.includes(f.audience)) return false;
  }

  // 3. Type check
  if (f.type && f.type !== "all") {
    if (!cake.type || !cake.type.includes(f.type)) return false;
  }

  // 4. Style check
  if (f.style && f.style !== "all") {
    if (!cake.style || !cake.style.includes(f.style)) return false;
  }

  return true;
}

// ── Lưới "Các mẫu bánh" (toàn bộ kho, lọc theo loại & từ khóa) ──
function renderCakeGrid() {
  const grid = document.getElementById("cakeGrid");
  if (!grid) return;
  const moreBox = document.getElementById("catalogMore");

  const isNoFilter = (
    !currentSearch &&
    currentFilters.category === "all" &&
    currentFilters.audience === "all" &&
    currentFilters.type === "all" &&
    currentFilters.style === "all"
  );
  const allCakes = getCakes();
  const cakes = isNoFilter ? allCakes : allCakes.filter(c => matchCake(c, currentFilters, currentSearch));

  const countEl = document.getElementById("filterResultCount");
  if (countEl) {
    countEl.textContent = isNoFilter ? "" : `${cakes.length} mẫu bánh`;
    countEl.style.display = isNoFilter ? "none" : "inline-flex";
  }
  document.getElementById("clearFiltersBtn")?.classList.toggle("hidden", isNoFilter);

  if (cakes.length === 0) {
    grid.innerHTML = `
      <div class="empty-menu">
        <h3>Chưa có mẫu bánh phù hợp</h3>
        <p>${currentSearch ? `Không có bánh nào khớp với "${escHtml(currentSearch)}".` : "Không có bánh nào trong nhóm này."} Thử từ khóa khác hoặc xem tất cả bánh.</p>
        <button class="btn-clear-filters" onclick="clearAllFilters()">Xem tất cả bánh</button>
      </div>`;
    if (moreBox) moreBox.innerHTML = "";
    return;
  }

  fillGrid(grid, moreBox, cakes);
}

// ── Bán chạy nhất (băng chuyền lướt) ──────────────────────────
// Lấy bánh được admin đánh dấu "bán chạy". Kho cũ trong localStorage
// chưa có cờ này thì dùng danh sách mặc định trong config.js.
function getBestsellers() {
  const cakes = getCakes();
  let list = cakes.filter(c => c.bestseller);
  if (list.length === 0 && typeof MITU_DEFAULT_CAKES !== "undefined") {
    const defaults = MITU_DEFAULT_CAKES.filter(c => c.bestseller).map(c => c.id);
    list = defaults.map(id => cakes.find(c => c.id === id)).filter(Boolean);
  }
  return list.slice(0, 8);
}

function renderBestsellers() {
  const section = document.getElementById("bestseller");
  const track = document.getElementById("bestsellerTrack");
  if (!section || !track) return;

  const list = getBestsellers();
  if (list.length === 0) { section.hidden = true; return; }

  // Bản sao (aria-hidden) nối đuôi để băng chuyền chạy vòng không có điểm dừng
  const cardHTML = (cake, i, isClone) => `
    <li class="best-card"${isClone ? ' aria-hidden="true"' : ""}>
      <button type="button" class="best-card-btn" data-id="${escHtml(cake.id)}"${isClone ? ' tabindex="-1"' : ` aria-label="Đặt ${escHtml(cake.name)}"`}>
        <span class="best-rank" aria-hidden="true">${i + 1}</span>
        <span class="best-img">
          ${cake.image ? `<img src="${escHtml(cake.image)}" alt="" loading="lazy" />` : `<span class="cake-img-placeholder">Mitu</span>`}
        </span>
        <span class="best-info">
          <span class="best-cat">${escHtml(getCategoryLabel(cake.category))}</span>
          <span class="best-name">${escHtml(cake.name)}</span>
          <span class="best-price">${formatPrice(cake.price)}</span>
        </span>
      </button>
    </li>`;
  const setHTML = isClone => list.map((cake, i) => cardHTML(cake, i, isClone)).join("");

  track.innerHTML = setHTML(false);
  const first = track.firstElementChild;
  const setWidthOf = () => track.children[list.length].offsetLeft - first.offsetLeft;
  // Đủ bản sao để luôn phủ kín khung nhìn + một vòng
  track.insertAdjacentHTML("beforeend", setHTML(true));
  const reps = Math.max(1, Math.ceil(track.clientWidth / Math.max(setWidthOf(), 1)));
  for (let r = 1; r < reps; r++) track.insertAdjacentHTML("beforeend", setHTML(true));

  track.querySelectorAll(".best-card-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cake = list.find(c => String(c.id) === btn.dataset.id);
      if (cake) openOrderModal(cake);
    });
  });

  // Độ dài một vòng (đo lại khi đổi kích thước màn hình)
  let loopW = setWidthOf();
  window.addEventListener("resize", () => { loopW = setWidthOf(); });

  const cardStep = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.offsetWidth + gap;
  };
  const step = dir => {
    // Lùi khi đang ở đầu: nhảy thầm sang vòng sao trước rồi mới lùi
    if (dir < 0 && track.scrollLeft < cardStep()) track.scrollLeft += loopW;
    track.scrollBy({ left: dir * cardStep(), behavior: "smooth" });
  };

  // Khách tự kéo quá một vòng: nhảy thầm về vị trí tương ứng ở vòng đầu
  let settleTimer = null;
  track.addEventListener("scroll", () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (loopW > 0 && track.scrollLeft >= loopW) track.scrollLeft -= loopW;
    }, 140);
  }, { passive: true });

  // Băng chuyền chạy đều liên tục; nghỉ khi khách rê chuột, chạm, focus,
  // cuộn khỏi màn hình, chuyển tab, hoặc ngay sau khi bấm mũi tên
  const SPEED = 38; // px mỗi giây
  let pos = 0, last = 0, hovering = false, inView = false, resumeAt = 0;
  const holdFor = ms => { resumeAt = Math.max(resumeAt, performance.now() + ms); };

  document.getElementById("bestPrev")?.addEventListener("click", () => { holdFor(900); step(-1); });
  document.getElementById("bestNext")?.addEventListener("click", () => { holdFor(900); step(1); });
  section.addEventListener("mouseenter", () => { hovering = true; });
  section.addEventListener("mouseleave", () => { hovering = false; });
  track.addEventListener("touchstart", () => holdFor(4000), { passive: true });
  track.addEventListener("touchmove", () => holdFor(4000), { passive: true });
  track.addEventListener("wheel", () => holdFor(3000), { passive: true });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .2 }).observe(track);
  } else {
    inView = true;
  }

  if (prefersReducedMotion) return;
  const tick = now => {
    const dt = last ? Math.min(now - last, 64) : 0;
    last = now;
    const running = !document.hidden && inView && !hovering && now >= resumeAt
      && !track.contains(document.activeElement);
    if (running) {
      pos += SPEED * dt / 1000;
      if (loopW > 0 && pos >= loopW) pos -= loopW;
      track.scrollLeft = pos;
    } else {
      pos = track.scrollLeft; // chạy tiếp từ chỗ khách vừa kéo hoặc bấm tới
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function createCakeCard(cake) {
  const card = document.createElement("div");
  card.className = "cake-card";
  card.dataset.id = cake.id;

  const categoryLabel = getCategoryLabel(cake.category);

  const imgHTML = cake.image
    ? `<img src="${cake.image}" alt="${escHtml(cake.name)}" loading="lazy" />`
    : `<div class="cake-img-placeholder">Mitu</div>`;

  card.innerHTML = `
    <div class="cake-img-wrap">
      ${imgHTML}
      ${categoryLabel ? `<span class="cake-category-badge">${categoryLabel}</span>` : ""}
    </div>
    <div class="cake-body">
      <h3 class="cake-name">${escHtml(cake.name)}</h3>
      <div class="cake-footer">
        <span class="cake-price">${formatPrice(cake.price)}</span>
        <div class="cake-card-actions">
          <button class="btn-order-zalo" data-id="${cake.id}">
            <span class="btn-order-label">Đặt bánh ngay</span>
            <span class="btn-order-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg></span>
          </button>
        </div>
      </div>
    </div>`;

  card.querySelector(".btn-order-zalo").addEventListener("click", (e) => {
    e.stopPropagation();
    openOrderModal(cake);
  });

  card.addEventListener("click", () => openOrderModal(cake));
  return card;
}

// ── Labels Dictionary ─────────────────────────────────────────
function getCategoryLabel(cat) {
  const map = {
    "all": "Tất cả bánh",
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
    "cuoi": "Bánh cưới",
    "mousse": "Mousse",
    "cheesecake": "Cheesecake",
  };
  return map[cat] || cat || "";
}

function getAudienceLabel(aud) {
  const map = {
    "male": "Nam",
    "female": "Nữ",
    "boy": "Bé trai",
    "girl": "Bé gái",
    "kids": "Trẻ em",
  };
  return map[aud] || "";
}

function getTypeLabel(type) {
  const map = {
    "mini": "Mini",
    "fruit": "Hoa quả",
    "square": "Vuông",
    "custom-shaped": "Tạo hình",
    "birthday": "Sinh nhật",
  };
  return map[type] || "";
}

function getStyleLabel(style) {
  const map = {
    "elegant": "Thanh lịch",
    "cute": "Dễ thương",
    "luxury": "Sang trọng",
    "funny": "Vui nhộn",
  };
  return map[style] || "";
}

// ── Hero Slider ───────────────────────────────────────────────
function initHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  const dots   = document.querySelectorAll(".hero-dot");
  if (!slides.length) return;

  let leaveTimer = null;

  // dir: 1 = ảnh mới vào từ phải, -1 = từ trái (xem .is-entering trong CSS)
  function goTo(idx, dir = idx > currentSlide ? 1 : -1) {
    if (idx === currentSlide) return;
    const outgoing = slides[currentSlide];
    const incoming = slides[idx];

    slides.forEach(s => s.classList.remove("is-leaving", "is-entering", "from-prev"));
    outgoing.classList.add("is-leaving");
    incoming.classList.add("is-entering");
    if (dir < 0) {
      outgoing.classList.add("from-prev");
      incoming.classList.add("from-prev");
    }
    outgoing.classList.remove("active");
    incoming.classList.add("active");
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
    currentSlide = idx;

    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      slides.forEach(s => s.classList.remove("is-leaving", "is-entering", "from-prev"));
    }, 1200);
  }

  function next() { goTo((currentSlide + 1) % slides.length, 1); }
  function prev() { goTo((currentSlide - 1 + slides.length) % slides.length, -1); }

  // Auto-play
  slideInterval = setInterval(next, 5000);

  // Arrow buttons
  document.getElementById("heroNext")?.addEventListener("click", () => { clearInterval(slideInterval); next(); slideInterval = setInterval(next, 5000); });
  document.getElementById("heroPrev")?.addEventListener("click", () => { clearInterval(slideInterval); prev(); slideInterval = setInterval(next, 5000); });

  // Dots
  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      clearInterval(slideInterval);
      goTo(parseInt(dot.dataset.index));
      slideInterval = setInterval(next, 5000);
    });
  });

  // Enhanced Touch Swipe for Mobile
  let touchStartX = 0;
  let touchStartY = 0;
  const heroEl = document.querySelector(".hero");

  heroEl?.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  heroEl?.addEventListener("touchend", e => {
    const diffX = touchStartX - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;
    // Only trigger horizontal slide if lateral swipe distance exceeds vertical move
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      clearInterval(slideInterval);
      diffX > 0 ? next() : prev();
      slideInterval = setInterval(next, 5000);
    }
  }, { passive: true });
}

// ── Navigation ────────────────────────────────────────────────
function initNav() {
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");
  const navOverlay = document.getElementById("navOverlay");
  const dropdownToggle = document.getElementById("navMenuBtn");
  const dropdownItem = document.getElementById("navMenuDropdown");

  function closeNavDrawer() {
    navLinks?.classList.remove("open");
    hamburger?.classList.remove("active");
    hamburger?.setAttribute("aria-expanded", "false");
    navOverlay?.classList.remove("show");
    dropdownItem?.classList.remove("open-mobile");
    document.body.style.overflow = "";
  }

  function toggleNavDrawer() {
    const willOpen = !navLinks?.classList.contains("open");
    navLinks?.classList.toggle("open", willOpen);
    hamburger?.classList.toggle("active", willOpen);
    hamburger?.setAttribute("aria-expanded", willOpen ? "true" : "false");
    navOverlay?.classList.toggle("show", willOpen);
    if (willOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  hamburger?.addEventListener("click", toggleNavDrawer);
  hamburger?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleNavDrawer(); }
  });
  navOverlay?.addEventListener("click", closeNavDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNavDrawer();
  });

  // Mobile dropdown toggle inside drawer
  dropdownToggle?.addEventListener("click", (e) => {
    if (window.innerWidth < 1200) {
      e.preventDefault();
      dropdownItem?.classList.toggle("open-mobile");
    }
  });

  // Close nav when clicking standard links
  navLinks?.querySelectorAll("a:not(#navMenuBtn)").forEach(a => {
    a.addEventListener("click", closeNavDrawer);
  });

  // Bottom Navigation Sync on Mobile
  const bnavItems = document.querySelectorAll(".mobile-bottom-nav .bnav-item[href^='#']");
  bnavItems.forEach(item => {
    item.addEventListener("click", (e) => {
      closeNavDrawer();
      bnavItems.forEach(b => b.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Active link on scroll (Syncs Desktop Nav & Mobile Bottom Nav)
  const sections = document.querySelectorAll("section[id], .hero[id]");
  const links = document.querySelectorAll(".nav-links a[href^='#']");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === `#${id}`));
        bnavItems.forEach(b => b.classList.toggle("active", b.getAttribute("href") === `#${id}`));
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
}

// Phần header còn dính trên màn hình khi đã cuộn (dải số điện thoại đã trôi khuất)
function stickyHeaderHeight() {
  const header = document.querySelector(".header");
  if (!header) return 65;
  const navTop = header.querySelector(".nav-top");
  return header.offsetHeight - (navTop?.offsetHeight || 0);
}

// ── Smooth Scroll ─────────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const href = a.getAttribute("href");
      if (href === "#" || href === "#!") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerH = stickyHeaderHeight();
        const targetTop = target.offsetTop - headerH;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
      }
    });
  });
}

// ── Order Modal ───────────────────────────────────────────────
function initModal() {
  const overlay = document.getElementById("orderModal");
  const closeBtn = document.getElementById("modalClose");
  const dragHandle = overlay?.querySelector(".modal-drag-handle");

  closeBtn?.addEventListener("click", closeModal);
  dragHandle?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // Touch drag down to dismiss modal on mobile
  let modalTouchStartY = 0;
  const modalBox = overlay?.querySelector(".modal");
  modalBox?.addEventListener("touchstart", e => {
    modalTouchStartY = e.touches[0].clientY;
  }, { passive: true });
  modalBox?.addEventListener("touchend", e => {
    const diffY = e.changedTouches[0].clientY - modalTouchStartY;
    if (diffY > 90 && modalBox.scrollTop <= 5) {
      closeModal();
    }
  }, { passive: true });

  document.getElementById("copyMsgBtn")?.addEventListener("click", () => {
    if (!currentOrderCake) return;
    const msg = buildCakeOrderMsg(currentOrderCake);
    copyToClipboard(msg);
    showToast("Đã sao chép tin nhắn. Mở Zalo và dán để gửi cho tiệm.", "success");
    document.getElementById("copyMsgBtn").textContent = "Đã sao chép";
    setTimeout(() => {
      document.getElementById("copyMsgBtn").textContent = "Sao chép tin nhắn";
    }, 2500);
  });

  document.getElementById("openZaloBtn")?.addEventListener("click", () => {
    const cfg = getConfig();
    const zalo = cfg.zaloPhone || "0936290932";
    if (currentOrderCake) {
      const msg = buildCakeOrderMsg(currentOrderCake);
      copyToClipboard(msg);
    }
    window.open(`https://zalo.me/${zalo.replace(/\s/g, "")}`, "_blank");
    showToast("Đang mở Zalo. Tin nhắn đã được sao chép, bạn chỉ cần dán.", "info");
  });
}

function openOrderModal(cake) {
  currentOrderCake = cake;
  const overlay = document.getElementById("orderModal");

  // Image
  const imgBox = document.getElementById("modalCakeImg");
  imgBox.innerHTML = cake.image
    ? `<img class="modal-cake-img" src="${cake.image}" alt="${escHtml(cake.name)}" />`
    : `<div class="modal-cake-placeholder">Mitu</div>`;

  document.getElementById("modalTitle").textContent = cake.name;
  document.getElementById("modalPrice").textContent = formatPrice(cake.price);
  document.getElementById("modalDesc").textContent = cake.description || "Bánh handmade được làm từ nguyên liệu tươi ngon, an toàn.";
  document.getElementById("orderMsgBox").textContent = buildCakeOrderMsg(cake);
  document.getElementById("copyMsgBtn").textContent = "Sao chép tin nhắn";

  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("orderModal").classList.remove("show");
  document.body.style.overflow = "";
  currentOrderCake = null;
}

// ── Feedback Conveyor Slider (Vòng quay phản hồi khách hàng) ──
function renderFeedbackSlider() {
  const track = document.getElementById("feedbackSliderTrack");
  const sliderWrap = document.getElementById("feedbackSliderWrap");
  if (!track || !sliderWrap) return;

  if (feedbackConveyorAnimId) {
    cancelAnimationFrame(feedbackConveyorAnimId);
    feedbackConveyorAnimId = null;
  }

  const feedbacks = getFeedbacks();
  if (!feedbacks || feedbacks.length === 0) {
    track.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-light); width: 100%;">Chưa có ảnh feedback nào.</div>`;
    return;
  }

  track.innerHTML = "";

  // Duplicate cards for seamless infinite conveyor rotation
  const loopFeedbacks = [...feedbacks, ...feedbacks];

  loopFeedbacks.forEach((fb, idx) => {
    const card = createFeedbackCard(fb, idx % feedbacks.length);
    card.style.setProperty("--i", Math.min(idx, 6));
    track.appendChild(card);
  });

  let isPaused = false;
  const speed = 0.75; // smooth conveyor speed in px/frame

  function animateFeedbackConveyor() {
    if (track && !isPaused && !prefersReducedMotion) {
      track.scrollLeft += speed;
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0 && track.scrollLeft >= halfWidth) {
        track.scrollLeft -= halfWidth;
      }
    }
    feedbackConveyorAnimId = requestAnimationFrame(animateFeedbackConveyor);
  }

  sliderWrap.addEventListener("mouseenter", () => { isPaused = true; });
  sliderWrap.addEventListener("mouseleave", () => { isPaused = false; });
  sliderWrap.addEventListener("touchstart", () => { isPaused = true; }, { passive: true });
  sliderWrap.addEventListener("touchend", () => { isPaused = false; }, { passive: true });

  const prevBtn = document.getElementById("feedbackSliderPrev");
  const nextBtn = document.getElementById("feedbackSliderNext");

  prevBtn?.addEventListener("click", () => {
    track.scrollBy({ left: -320, behavior: "smooth" });
  });
  nextBtn?.addEventListener("click", () => {
    track.scrollBy({ left: 320, behavior: "smooth" });
  });

  animateFeedbackConveyor();
}

function createFeedbackCard(fb, originalIndex) {
  const card = document.createElement("div");
  card.className = "feedback-card";
  card.dataset.index = originalIndex;

  const initials = (fb.name || "Khách")
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .slice(-2)
    .toUpperCase();

  card.innerHTML = `
    <div class="feedback-img-wrapper" title="Nhấn để xem chi tiết ảnh">
      <img src="${escHtml(fb.image)}" alt="${escHtml(fb.caption || fb.name)}" loading="lazy" />
      <div class="feedback-zoom-hint">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/></svg>
        <span>Phóng to</span>
      </div>
      ${fb.badge ? `<span class="feedback-card-badge">${escHtml(fb.badge)}</span>` : ""}
    </div>
    <div class="feedback-card-content">
      <div class="feedback-stars">★★★★★</div>
      <blockquote class="feedback-quote">${escHtml(fb.quote || "Bánh rất ngon và đẹp!")}</blockquote>
      <p class="feedback-context">${escHtml(fb.context || fb.caption || "Bánh handmade tươi ngon mỗi ngày.")}</p>
      <div class="feedback-author">
        <div class="author-avatar">${escHtml(initials)}</div>
        <div class="author-info">
          <span class="author-name">${escHtml(fb.name || "Khách hàng")}</span>
          <span class="author-channel">${escHtml(fb.channel || "Phản hồi qua Zalo")}</span>
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    openFeedbackLightbox(originalIndex);
  });

  return card;
}

// ── Feedback Lightbox ─────────────────────────────────────────
let currentFeedbackLightboxIndex = 0;

function openFeedbackLightbox(index) {
  const feedbacks = getFeedbacks();
  if (!feedbacks || feedbacks.length === 0) return;

  if (index < 0) index = feedbacks.length - 1;
  if (index >= feedbacks.length) index = 0;
  currentFeedbackLightboxIndex = index;

  const fb = feedbacks[currentFeedbackLightboxIndex];
  const lightbox = document.getElementById("feedbackLightbox");
  const lbImg = document.getElementById("fbLightboxImg");
  const lbCaption = document.getElementById("fbLightboxCaption");
  const lbQuote = document.getElementById("fbLightboxQuote");

  if (!lightbox) return;

  if (lbImg) lbImg.src = fb.image;
  if (lbCaption) lbCaption.textContent = fb.caption || fb.name || "Ảnh feedback từ khách hàng";
  if (lbQuote) lbQuote.textContent = fb.quote ? `${fb.quote} — ${fb.name}` : fb.name;

  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeFeedbackLightbox() {
  const lightbox = document.getElementById("feedbackLightbox");
  if (!lightbox) return;
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function initFeedbackLightbox() {
  const lightbox = document.getElementById("feedbackLightbox");
  if (!lightbox) return;

  const closeBtn = document.getElementById("fbLightboxClose");
  const backdrop = document.getElementById("fbLightboxBackdrop");
  const prevBtn = document.getElementById("fbLightboxPrev");
  const nextBtn = document.getElementById("fbLightboxNext");

  closeBtn?.addEventListener("click", closeFeedbackLightbox);
  backdrop?.addEventListener("click", closeFeedbackLightbox);

  prevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openFeedbackLightbox(currentFeedbackLightboxIndex - 1);
  });

  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openFeedbackLightbox(currentFeedbackLightboxIndex + 1);
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("active")) return;
    if (e.key === "Escape") closeFeedbackLightbox();
    else if (e.key === "ArrowLeft") openFeedbackLightbox(currentFeedbackLightboxIndex - 1);
    else if (e.key === "ArrowRight") openFeedbackLightbox(currentFeedbackLightboxIndex + 1);
  });
}

function buildCakeOrderMsg(cake) {
  return [
    "ĐẶT BÁNH – TIỆM BÁNH MITU",
    `Bánh: ${cake.name}`,
    `Giá: ${formatPrice(cake.price)}`,
    `Loại: ${getCategoryLabel(cake.category) || "Khác"}`,
    "",
    "Mình muốn đặt bánh này ạ! Tiệm còn không?",
  ].join("\n");
}

// ── Utilities ─────────────────────────────────────────────────
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:absolute;left:-9999px;top:-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function formatPhone(phone) {
  const p = (phone || "").replace(/\D/g, "");
  if (p.length === 10) return `${p.slice(0,4)} ${p.slice(4,7)} ${p.slice(7)}`;
  return phone;
}

function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
