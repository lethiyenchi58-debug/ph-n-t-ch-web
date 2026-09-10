/**
 * TIỆM BÁNH MITU – app.js
 * Logic trang khách hàng
 */

// ── Globals ──────────────────────────────────────────────────
let currentSlide        = 0;
let slideInterval       = null;
let todayConveyorAnimId = null;
let currentOrderCake    = null;

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
  initHeroSlider();
  initNav();
  initCustomForm();
  initModal();
  initSmoothScroll();
});

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

  // Footer
  document.getElementById("footerSlogan").textContent =
    cfg.shopSlogan || "Bánh ngọt handmade – Tình yêu trong từng chiếc bánh.";
  document.getElementById("footer-address").textContent =
    cfg.shopAddress || "173 Vạn Phúc - Hà Đông, Hà Nội, Việt Nam";
  const footerPhone = document.getElementById("footer-phone");
  if (footerPhone) { footerPhone.textContent = formatPhone(cfg.shopPhone || zalo); footerPhone.href = `tel:${cfg.shopPhone || zalo}`; }
  const footerZaloLink = document.getElementById("footer-zalo-link");
  if (footerZaloLink) { footerZaloLink.textContent = `Zalo: ${formatPhone(zalo)}`; footerZaloLink.href = zaloUrl; footerZaloLink.target = "_blank"; }

  const footerFb = document.getElementById("footer-facebook");
  if (footerFb && cfg.facebookUrl && cfg.facebookUrl !== "#") {
    footerFb.href = cfg.facebookUrl;
  }
  const footerZaloIcon = document.getElementById("footer-zalo");
  if (footerZaloIcon) footerZaloIcon.href = zaloUrl;

  // Floating Zalo & Maps
  const floatZalo = document.getElementById("floatZalo");
  if (floatZalo) floatZalo.href = zaloUrl;
  const floatMaps = document.getElementById("floatMaps");
  if (floatMaps && cfg.mapsUrl) floatMaps.href = cfg.mapsUrl;

  // Direct Zalo btn (custom section)
  const directZaloBtn = document.getElementById("directZaloBtn");
  if (directZaloBtn) directZaloBtn.href = zaloUrl;
}

// ── Today date ────────────────────────────────────────────────
function renderTodayDate() {
  const el = document.getElementById("todayDate");
  if (!el) return;
  const now = new Date();
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  el.textContent = now.toLocaleDateString("vi-VN", opts);
}

// ── CATALOG & MULTI-FILTER SYSTEM ─────────────────────────────
function initCatalog() {
  // 1. Read filters from URL params if present
  applyFiltersFromUrl();

  // 2. Main Category Pills
  const catPills = document.querySelectorAll("#mainCatBar .cat-pill");
  catPills.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat || "all";
      currentFilters.category = cat;
      updateFilterUI();
      renderCakeGrid();
      updateUrlFromFilters();
    });
  });

  // 3. Header Dropdown Items
  const dropdownLinks = document.querySelectorAll(".nav-dropdown-menu a[data-cat]");
  dropdownLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = link.dataset.cat || "all";
      currentFilters.category = cat;
      updateFilterUI();
      renderCakeGrid();
      updateUrlFromFilters();

      // Smooth scroll to catalog section
      const catalogEl = document.getElementById("today");
      if (catalogEl) {
        const offset = document.querySelector(".header")?.offsetHeight || 80;
        window.scrollTo({ top: catalogEl.offsetTop - offset, behavior: "smooth" });
      }

      // Close mobile menu if open
      document.getElementById("navLinks")?.classList.remove("open");
    });
  });

  // 4. Detailed Filter Chips (Audience, Type, Style)
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const filterType = chip.dataset.filter;
      const filterVal  = chip.dataset.val;

      if (!filterType) return;
      currentFilters[filterType] = filterVal;

      updateFilterUI();
      renderCakeGrid();
      updateUrlFromFilters();
    });
  });

  // 5. Reset / Clear Filters Buttons
  document.getElementById("clearFiltersBtn")?.addEventListener("click", clearAllFilters);

  // 6. Mobile Filter Toggle Accordion
  const toggleBtn = document.getElementById("filterToggleBtn");
  const filterBox = document.getElementById("catalogFilterBox");
  toggleBtn?.addEventListener("click", () => {
    const isOpen = filterBox.classList.toggle("open-mobile");
    toggleBtn.classList.toggle("open", isOpen);
  });

  // 7. Popstate event (browser Back/Forward navigation)
  window.addEventListener("popstate", () => {
    applyFiltersFromUrl();
    renderCakeGrid();
  });

  // Initial render
  updateFilterUI();
  renderCakeGrid();
}

function clearAllFilters() {
  currentFilters = {
    category: "all",
    audience: "all",
    type: "all",
    style: "all"
  };
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
  const newUrl = qs ? `${window.location.pathname}?${qs}#today` : `${window.location.pathname}#today`;
  window.history.replaceState({ filters: { ...currentFilters } }, "", newUrl);
}

function updateFilterUI() {
  // 1. Main Category Pills active state
  document.querySelectorAll("#mainCatBar .cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === currentFilters.category);
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

// ── Match Cake Logic (Multi-tag & multi-category) ─────────────
function matchCake(cake, f) {
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

// ── Render Cake Grid & Continuous Conveyor Belt ───────────────
function renderCakeGrid() {
  const grid = document.getElementById("cakeGrid");
  if (!grid) return;

  // Cancel existing animation frame if active
  if (todayConveyorAnimId) {
    cancelAnimationFrame(todayConveyorAnimId);
    todayConveyorAnimId = null;
  }

  const allCakes = getCakes();
  const isNoFilter = (
    currentFilters.category === "all" &&
    currentFilters.audience === "all" &&
    currentFilters.type === "all" &&
    currentFilters.style === "all"
  );

  let displayedCakes = [];
  if (isNoFilter) {
    const todayObj = getTodayMenu();
    if (todayObj && todayObj.ids && todayObj.ids.length > 0) {
      displayedCakes = allCakes.filter(c => todayObj.ids.includes(c.id));
    }
    if (displayedCakes.length === 0) {
      displayedCakes = allCakes;
    }
  } else {
    displayedCakes = allCakes.filter(c => matchCake(c, currentFilters));
  }

  // Update Result Count text (Hidden when no filter is selected)
  const countEl = document.getElementById("filterResultCount");
  if (countEl) {
    if (isNoFilter) {
      countEl.textContent = "";
      countEl.style.display = "none";
    } else {
      countEl.textContent = `Hiển thị ${displayedCakes.length} mẫu bánh`;
      countEl.style.display = "inline";
    }
  }

  grid.innerHTML = "";

  if (displayedCakes.length === 0) {
    grid.innerHTML = `
      <div class="empty-menu">
        <div class="empty-icon">🔍</div>
        <h3>Chưa có mẫu bánh phù hợp</h3>
        <p>Không tìm thấy chiếc bánh nào khớp với tất cả bộ lọc bạn đã chọn. Hãy thử bỏ bớt tiêu chí hoặc bấm nút bên dưới để xem toàn bộ bánh nhé!</p>
        <button class="btn-reset-filters-empty" onclick="clearAllFilters()">
          ↺ Xóa tất cả bộ lọc
        </button>
      </div>`;
    return;
  }

  if (isNoFilter) {
    // Continuous Infinite Conveyor Belt Mode (Băng chuyền liên tục)
    grid.className = "cake-grid-slider-mode";

    const sliderWrap = document.createElement("div");
    sliderWrap.className = "today-slider-wrapper";

    sliderWrap.innerHTML = `
      <button class="today-slider-arrow prev" id="todaySliderPrev" aria-label="Slide trước">‹</button>
      <div class="today-slider-track" id="todaySliderTrack"></div>
      <button class="today-slider-arrow next" id="todaySliderNext" aria-label="Slide tiếp">›</button>
    `;

    const track = sliderWrap.querySelector("#todaySliderTrack");

    // Duplicate cards to form a 100% seamless infinite loop
    const conveyorCakes = [...displayedCakes, ...displayedCakes];
    conveyorCakes.forEach(cake => {
      const card = createCakeCard(cake);
      track.appendChild(card);
    });

    grid.appendChild(sliderWrap);

    let isPaused = false;
    const speed = 0.85; // smooth conveyor speed in px/frame

    function animateConveyor() {
      if (track && !isPaused) {
        track.scrollLeft += speed;
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0 && track.scrollLeft >= halfWidth) {
          track.scrollLeft -= halfWidth;
        }
      }
      todayConveyorAnimId = requestAnimationFrame(animateConveyor);
    }

    // Hover / touch events: pause on hover, resume on leave
    sliderWrap.addEventListener("mouseenter", () => { isPaused = true; });
    sliderWrap.addEventListener("mouseleave", () => { isPaused = false; });
    sliderWrap.addEventListener("touchstart", () => { isPaused = true; }, { passive: true });
    sliderWrap.addEventListener("touchend", () => { isPaused = false; }, { passive: true });

    // Arrow navigation buttons
    const prevBtn = sliderWrap.querySelector("#todaySliderPrev");
    const nextBtn = sliderWrap.querySelector("#todaySliderNext");

    prevBtn?.addEventListener("click", () => {
      track.scrollBy({ left: -300, behavior: "smooth" });
    });
    nextBtn?.addEventListener("click", () => {
      track.scrollBy({ left: 300, behavior: "smooth" });
    });

    // Start continuous animation
    animateConveyor();
  } else {
    // Normal Grid View when filters are active
    grid.className = "cake-grid";
    displayedCakes.forEach(cake => {
      const card = createCakeCard(cake);
      grid.appendChild(card);
    });
  }
}

function createCakeCard(cake) {
  const card = document.createElement("div");
  card.className = "cake-card";
  card.dataset.id = cake.id;

  const categoryLabel = getCategoryLabel(cake.category);

  // Collect display tags (e.g. Nam, Nữ, Mini, Hoa quả...)
  const tags = [];
  if (cake.audience) {
    cake.audience.forEach(a => {
      const lbl = getAudienceLabel(a);
      if (lbl && !tags.includes(lbl)) tags.push(lbl);
    });
  }
  if (cake.type) {
    cake.type.forEach(t => {
      const lbl = getTypeLabel(t);
      if (lbl && !tags.includes(lbl)) tags.push(lbl);
    });
  }
  if (cake.style) {
    cake.style.forEach(s => {
      const lbl = getStyleLabel(s);
      if (lbl && !tags.includes(lbl)) tags.push(lbl);
    });
  }

  const tagsHTML = tags.slice(0, 3).map(t => `<span class="cake-tag-item">${t}</span>`).join("");

  const imgHTML = cake.image
    ? `<img src="${cake.image}" alt="${escHtml(cake.name)}" loading="lazy" />`
    : `<div class="cake-img-placeholder">🎂</div>`;

  card.innerHTML = `
    <div class="cake-img-wrap">
      ${imgHTML}
      ${categoryLabel ? `<span class="cake-category-badge">${categoryLabel}</span>` : ""}
    </div>
    <div class="cake-body">
      <h3 class="cake-name">${escHtml(cake.name)}</h3>
      ${tagsHTML ? `<div class="cake-tags">${tagsHTML}</div>` : ""}
      <p class="cake-desc">${escHtml(cake.desc || cake.description || "Bánh handmade tươi ngon mỗi ngày.")}</p>
      <div class="cake-footer">
        <span class="cake-price">${formatPrice(cake.price)}</span>
        <div class="cake-card-actions">
          <button class="btn-order-zalo" data-id="${cake.id}">Đặt bánh ngay</button>
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
    "male": "👔 Nam",
    "female": "👗 Nữ",
    "boy": "👦 Bé trai",
    "girl": "👧 Bé gái",
    "kids": "🧸 Trẻ em",
  };
  return map[aud] || "";
}

function getTypeLabel(type) {
  const map = {
    "mini": "🧁 Mini",
    "fruit": "🍓 Hoa quả",
    "square": "⬛ Vuông",
    "custom-shaped": "🎨 Tạo hình",
    "birthday": "🎂 Sinh nhật",
  };
  return map[type] || "";
}

function getStyleLabel(style) {
  const map = {
    "elegant": "💎 Thanh lịch",
    "cute": "🎀 Dễ thương",
    "luxury": "👑 Sang trọng",
    "funny": "🤪 Vui nhộn",
  };
  return map[style] || "";
}

// ── Hero Slider ───────────────────────────────────────────────
function initHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  const dots   = document.querySelectorAll(".hero-dot");
  if (!slides.length) return;

  function goTo(idx) {
    slides.forEach((s, i) => s.classList.toggle("active", i === idx));
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
    currentSlide = idx;
  }

  function next() { goTo((currentSlide + 1) % slides.length); }
  function prev() { goTo((currentSlide - 1 + slides.length) % slides.length); }

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

  // Touch swipe
  let touchStartX = 0;
  const heroEl = document.querySelector(".hero");
  heroEl?.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  heroEl?.addEventListener("touchend", e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { clearInterval(slideInterval); diff > 0 ? next() : prev(); slideInterval = setInterval(next, 5000); }
  }, { passive: true });
}

// ── Navigation ────────────────────────────────────────────────
function initNav() {
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");
  const dropdownToggle = document.getElementById("navMenuBtn");
  const dropdownItem = document.getElementById("navMenuDropdown");

  hamburger?.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const isOpen = navLinks.classList.contains("open");
    hamburger.setAttribute("aria-expanded", isOpen);
  });

  // Mobile dropdown toggle
  dropdownToggle?.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      dropdownItem?.classList.toggle("open-mobile");
    }
  });

  // Close nav when clicking standard link (excluding dropdown toggle)
  navLinks?.querySelectorAll("a:not(#navMenuBtn)").forEach(a => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      dropdownItem?.classList.remove("open-mobile");
    });
  });

  // Active link on scroll
  const sections = document.querySelectorAll("section[id], .hero[id]");
  const links = document.querySelectorAll(".nav-links a[href^='#']");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === `#${id}`));
      }
    });
  }, { threshold: 0.35 });

  sections.forEach(s => observer.observe(s));
}

// ── Smooth Scroll ─────────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        const offset = document.querySelector(".header").offsetHeight;
        window.scrollTo({ top: target.offsetTop - offset, behavior: "smooth" });
      }
    });
  });
}

// ── Custom Order Form ─────────────────────────────────────────
function initCustomForm() {
  const form = document.getElementById("customOrderForm");
  form?.addEventListener("submit", e => {
    e.preventDefault();

    const name  = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const type  = document.getElementById("custType").value;
    const note  = document.getElementById("custNote").value.trim();

    if (!name || !phone) {
      showToast("Vui lòng điền họ tên và số điện thoại!", "error");
      return;
    }

    const cfg = getConfig();
    const zalo = cfg.zaloPhone || "0936290932";

    const msg = buildCustomOrderMsg({ name, phone, type, note });
    copyToClipboard(msg);

    showToast("✅ Đã sao chép nội dung! Mở Zalo và gửi cho chủ tiệm.", "success");

    setTimeout(() => {
      window.open(`https://zalo.me/${zalo.replace(/\s/g, "")}`, "_blank");
    }, 600);
  });
}

function buildCustomOrderMsg({ name, phone, type, note }) {
  const lines = [
    "🎂 YÊU CẦU ĐẶT BÁNH THEO MẪU",
    "━━━━━━━━━━━━━━━━━━━━",
    `👤 Tên: ${name}`,
    `📱 Liên hệ: ${phone}`,
  ];
  if (type) lines.push(`🎂 Loại bánh: ${type}`);
  if (note) lines.push(`📝 Yêu cầu:\n${note}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("(Vui lòng báo giá và tư vấn giúp mình nhé ạ!)");
  return lines.join("\n");
}

// ── Order Modal ───────────────────────────────────────────────
function initModal() {
  const overlay = document.getElementById("orderModal");
  const closeBtn = document.getElementById("modalClose");

  closeBtn?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  document.getElementById("copyMsgBtn")?.addEventListener("click", () => {
    if (!currentOrderCake) return;
    const msg = buildCakeOrderMsg(currentOrderCake);
    copyToClipboard(msg);
    showToast("✅ Đã sao chép! Mở Zalo và gửi cho chủ tiệm.", "success");
    document.getElementById("copyMsgBtn").textContent = "✅ Đã sao chép!";
    setTimeout(() => {
      document.getElementById("copyMsgBtn").textContent = "📋 Sao chép nội dung";
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
    showToast("💬 Đang mở Zalo... Dán nội dung đã sao chép vào nhé!", "info");
  });
}

function openOrderModal(cake) {
  currentOrderCake = cake;
  const overlay = document.getElementById("orderModal");

  // Image
  const imgBox = document.getElementById("modalCakeImg");
  imgBox.innerHTML = cake.image
    ? `<img class="modal-cake-img" src="${cake.image}" alt="${escHtml(cake.name)}" />`
    : `<div class="modal-cake-placeholder">🎂</div>`;

  document.getElementById("modalTitle").textContent = cake.name;
  document.getElementById("modalPrice").textContent = formatPrice(cake.price);
  document.getElementById("modalDesc").textContent = cake.description || "Bánh handmade được làm từ nguyên liệu tươi ngon, an toàn.";
  document.getElementById("orderMsgBox").textContent = buildCakeOrderMsg(cake);
  document.getElementById("copyMsgBtn").textContent = "📋 Sao chép nội dung";

  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("orderModal").classList.remove("show");
  document.body.style.overflow = "";
  currentOrderCake = null;
}

function buildCakeOrderMsg(cake) {
  return [
    "🎂 ĐẶT BÁNH – TIỆM BÁNH MITU",
    "━━━━━━━━━━━━━━━━━━━━",
    `📦 Bánh: ${cake.name}`,
    `💰 Giá: ${formatPrice(cake.price)}`,
    `🏷️ Loại: ${getCategoryLabel(cake.category) || "Khác"}`,
    "━━━━━━━━━━━━━━━━━━━━",
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
  const icons = { success: "✅", error: "❌", info: "💬" };
  toast.textContent = `${icons[type] || "ℹ️"} ${msg}`;
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
