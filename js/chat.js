/**
 * TIỆM BÁNH MITU – js/chat.js
 * Khung chat AI trên trang khách. Gửi tin nhắn tới workflow WF1 trên n8n
 * (địa chỉ trong MITU_CHAT_URL ở js/config.js). Để trống thì nút chat không hiện.
 *
 * Gửi:   POST { session_id, message }
 * Nhận:  { reply: "…", cakes: [{ name, price, image }] }
 */
(function () {
  const URL_CHAT = typeof MITU_CHAT_URL === "string" ? MITU_CHAT_URL.trim() : "";
  if (!URL_CHAT) return;

  const HISTORY_KEY = "mitu-chat-history";
  const SESSION_KEY = "mitu-chat-session";
  const TIMEOUT_MS = 30000;
  const QUICK = ["Menu hôm nay có gì?", "Bánh sinh nhật cho bé trai", "Bánh mini giá bao nhiêu?", "Tiệm ở đâu, mở mấy giờ?"];

  const store = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
  };
  function sessionId() {
    try {
      let id = localStorage.getItem(SESSION_KEY);
      if (!id) { id = "web-" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(SESSION_KEY, id); }
      return id;
    } catch { return "web-" + Date.now().toString(36); }
  }
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = n => Number(n || 0).toLocaleString("vi-VN") + "đ";
  // MITU_STATE khai báo bằng const nên không nằm trên window
  const zaloPhone = () => ((typeof MITU_STATE !== "undefined" && MITU_STATE.config && MITU_STATE.config.zaloPhone) || "0936290932").replace(/\s/g, "");

  // ── Giao diện ──
  const css = document.createElement("style");
  css.textContent = `
  .mchat-btn{width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;
    background:var(--cherry,#D63A2A);color:#fff;box-shadow:0 8px 22px rgba(214,58,42,.4);transition:transform .25s var(--ease,ease)}
  .mchat-btn:hover{transform:scale(1.08)} .mchat-btn svg{width:26px;height:26px}
  .mchat-panel{position:fixed;z-index:1000;right:12px;left:12px;bottom:calc(var(--bnav-h,64px) + 12px + env(safe-area-inset-bottom,0px));
    max-height:min(560px,calc(100svh - var(--bnav-h,64px) - 90px));display:none;flex-direction:column;background:var(--icing,#FFFDF8);
    color:var(--cocoa,#2B170E);border:1px solid var(--line,#EEDFC7);border-radius:var(--radius,18px);box-shadow:var(--shadow);overflow:hidden;font-family:var(--font-body)}
  .mchat-panel.open{display:flex}
  @media (min-width:768px){.mchat-panel{left:auto;width:370px;right:24px;bottom:90px;max-height:min(600px,calc(100vh - 120px))}}
  .mchat-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--marigold,#F4A81D);color:var(--cocoa,#2B170E)}
  .mchat-head img{width:34px;height:34px;border-radius:50%;background:#fff;object-fit:cover}
  .mchat-head b{font-family:var(--font-display);font-size:16px;display:block;line-height:1.1}
  .mchat-head small{font-size:12px;opacity:.8}
  .mchat-x{margin-left:auto;background:none;border:0;font-size:24px;line-height:1;cursor:pointer;color:inherit;padding:4px 8px}
  .mchat-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
  .mchat-msg{max-width:85%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
  .mchat-msg.bot{background:var(--butter,#FFF3D1);align-self:flex-start;border-bottom-left-radius:4px}
  .mchat-msg.me{background:var(--cocoa,#2B170E);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .mchat-msg.typing{opacity:.7;font-style:italic}
  .mchat-cakes{display:flex;gap:8px;overflow-x:auto;align-self:stretch;padding-bottom:4px}
  .mchat-cake{flex:0 0 140px;background:#fff;border:1px solid var(--line,#EEDFC7);border-radius:12px;overflow:hidden;font-size:13px}
  .mchat-cake img{width:100%;height:100px;object-fit:cover;display:block;background:var(--butter)}
  .mchat-cake div{padding:6px 8px} .mchat-cake b{display:block;line-height:1.25}
  .mchat-cake span{color:var(--cherry,#D63A2A);font-weight:700}
  .mchat-cake a{display:block;margin:0 8px 8px;text-align:center;background:var(--zalo,#0068FF);color:#fff;border-radius:8px;padding:5px;font-weight:600;text-decoration:none}
  .mchat-quick{display:flex;flex-wrap:wrap;gap:6px}
  .mchat-quick button{border:1px solid var(--marigold,#F4A81D);background:#fff;color:var(--cocoa);border-radius:999px;padding:5px 10px;font-size:13px;cursor:pointer;font-family:inherit}
  .mchat-form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#EEDFC7);background:#fff}
  .mchat-form input{flex:1;min-width:0;border:1px solid var(--line,#EEDFC7);border-radius:999px;padding:10px 14px;font-size:15px;font-family:inherit}
  .mchat-form button{border:0;border-radius:999px;padding:0 16px;background:var(--cherry,#D63A2A);color:#fff;font-weight:700;cursor:pointer;font-family:inherit}
  .mchat-form button:disabled{opacity:.5;cursor:default}`;
  document.head.appendChild(css);

  const btn = document.createElement("button");
  btn.className = "mchat-btn";
  btn.type = "button";
  btn.title = "Chat với Mitu";
  btn.setAttribute("aria-label", "Mở khung chat với Mitu");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';

  const panel = document.createElement("div");
  panel.className = "mchat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat với Tiệm bánh Mitu");
  panel.innerHTML = `
    <div class="mchat-head"><img src="images/logo.png" alt=""><div><b>Mitu đây ạ!</b><small>Trợ lý tự động · trả lời ngay</small></div>
      <button class="mchat-x" type="button" aria-label="Đóng">×</button></div>
    <div class="mchat-body" aria-live="polite"></div>
    <form class="mchat-form"><input type="text" maxlength="500" placeholder="Hỏi về bánh, giá, đặt bánh…" aria-label="Tin nhắn"><button type="submit">Gửi</button></form>`;

  const widget = document.getElementById("floatingWidget");
  if (widget) widget.prepend(btn); else { btn.style.cssText = "position:fixed;right:16px;bottom:90px;z-index:999"; document.body.appendChild(btn); }
  document.body.appendChild(panel);

  const body = panel.querySelector(".mchat-body");
  const form = panel.querySelector(".mchat-form");
  const input = form.querySelector("input");
  const sendBtn = form.querySelector("button");
  let history = store.get(HISTORY_KEY, []);

  function scroll() { body.scrollTop = body.scrollHeight; }
  function addMsg(role, text, cakes) {
    const el = document.createElement("div");
    el.className = "mchat-msg " + role;
    el.textContent = text;
    body.appendChild(el);
    if (cakes && cakes.length) {
      const row = document.createElement("div");
      row.className = "mchat-cakes";
      const zalo = zaloPhone();
      row.innerHTML = cakes.slice(0, 4).map(c => `
        <div class="mchat-cake">${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">` : ""}
          <div><b>${esc(c.name)}</b>${c.price ? `<span>${money(c.price)}</span>` : ""}</div>
          <a href="https://zalo.me/${esc(zalo)}" target="_blank" rel="noopener">Đặt qua Zalo</a></div>`).join("");
      body.appendChild(row);
    }
    scroll();
    return el;
  }
  function render() {
    body.innerHTML = "";
    addMsg("bot", "Chào bạn 👋 Mitu có thể giúp bạn chọn bánh, báo giá, xem menu hôm nay hoặc nhận đặt bánh nha!");
    history.forEach(m => addMsg(m.role, m.text, m.cakes));
    if (!history.length) {
      const q = document.createElement("div");
      q.className = "mchat-quick";
      QUICK.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.onclick = () => { q.remove(); send(t); }; q.appendChild(b); });
      body.appendChild(q);
    }
  }

  async function send(text) {
    text = String(text || "").trim();
    if (!text || sendBtn.disabled) return;
    addMsg("me", text);
    history.push({ role: "me", text });
    store.set(HISTORY_KEY, history);
    input.value = "";
    sendBtn.disabled = true;
    const typing = addMsg("bot typing", "Mitu đang soạn tin…");
    let reply, cakes = [];
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(URL_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
        body: JSON.stringify({ session_id: sessionId(), message: text }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      reply = String(data.reply || "").trim();
      cakes = Array.isArray(data.cakes) ? data.cakes : [];
      if (!reply) throw new Error("empty");
    } catch {
      reply = `Mitu đang hơi bận một chút 🙏 Bạn nhắn Zalo ${zaloPhone()} để được trả lời ngay nhé!`;
    }
    typing.remove();
    addMsg("bot", reply, cakes);
    history.push({ role: "bot", text: reply, cakes });
    history = history.slice(-40);
    store.set(HISTORY_KEY, history);
    sendBtn.disabled = false;
    input.focus();
  }

  function open(on) {
    panel.classList.toggle("open", on);
    if (on) { if (!body.childElementCount) render(); setTimeout(() => input.focus(), 50); scroll(); }
  }
  btn.addEventListener("click", () => open(!panel.classList.contains("open")));
  panel.querySelector(".mchat-x").addEventListener("click", () => open(false));
  form.addEventListener("submit", e => { e.preventDefault(); send(input.value); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("open")) open(false); });
})();
