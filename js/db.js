/**
 * TIỆM BÁNH MITU – db.js
 * Lớp dữ liệu Firestore. Nạp toàn bộ dữ liệu vào MITU_STATE (config.js) rồi phát
 * sự kiện "mitu:data"; các hàm ghi cập nhật Firestore và MITU_STATE cùng lúc.
 *
 * Cấu trúc Firestore:
 *   cakes/{id}       – bánh trong kho
 *   feedbacks/{id}   – ảnh feedback khách
 *   settings/shop    – thông tin tiệm (có mặt = đã khởi tạo dữ liệu)
 *   settings/today   – { date, ids } menu hôm nay
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const AUTH_URL = "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const app = initializeApp(MITU_FIREBASE);
const db  = getFirestore(app);

const shopRef  = doc(db, "settings", "shop");
const todayRef = doc(db, "settings", "today");

// Mới nhất lên đầu, giống thứ tự admin vẫn thêm bánh
const byNewest = (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
const withId   = d => ({ id: d.id, ...d.data() });
// Firestore không lưu id trong thân tài liệu
const body     = ({ id, ...rest }) => rest;

// ── Đọc ──────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [cakesSnap, fbSnap, shopSnap, todaySnap] = await Promise.all([
      getDocs(collection(db, "cakes")),
      getDocs(collection(db, "feedbacks")),
      getDoc(shopRef),
      getDoc(todayRef),
    ]);
    MITU_STATE.initialized = shopSnap.exists();
    if (MITU_STATE.initialized) {
      MITU_STATE.config    = { ...MITU_DEFAULTS, ...shopSnap.data() };
      MITU_STATE.cakes     = cakesSnap.docs.map(withId).sort(byNewest);
      MITU_STATE.feedbacks = fbSnap.docs.map(withId).sort(byNewest);
      MITU_STATE.today     = todaySnap.exists() ? todaySnap.data() : { date: "", ids: [] };
    }
    // Chưa khởi tạo: giữ dữ liệu mẫu sẵn có trong MITU_STATE, menu hôm nay để trống
  } catch (err) {
    console.error("[Mitu] Không tải được dữ liệu Firestore:", err);
    MITU_STATE.error = err;
  }
  MITU_STATE.ready = true;
  document.dispatchEvent(new Event("mitu:data"));
}

// ── Ghi (chỉ admin đã đăng nhập; firestore.rules chặn mọi người khác) ──
async function saveCake(cake) {
  await setDoc(doc(db, "cakes", cake.id), body(cake));
  const i = MITU_STATE.cakes.findIndex(c => c.id === cake.id);
  if (i === -1) MITU_STATE.cakes.unshift(cake);
  else MITU_STATE.cakes[i] = cake;
}

async function deleteCake(id) {
  const ids = getSavedTodayMenu().ids;
  const batch = writeBatch(db);
  batch.delete(doc(db, "cakes", id));
  if (ids.includes(id)) batch.set(todayRef, { ...MITU_STATE.today, ids: ids.filter(x => x !== id) });
  await batch.commit();
  MITU_STATE.cakes = MITU_STATE.cakes.filter(c => c.id !== id);
  if (ids.includes(id)) MITU_STATE.today = { ...MITU_STATE.today, ids: ids.filter(x => x !== id) };
}

async function deleteAllCakes() {
  // writeBatch tối đa 500 thao tác; chia nhỏ cho chắc
  const ids = MITU_STATE.cakes.map(c => c.id);
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach(id => batch.delete(doc(db, "cakes", id)));
    if (i === 0) batch.set(todayRef, { date: getTodayKey(), ids: [] });
    await batch.commit();
  }
  if (ids.length === 0) await setDoc(todayRef, { date: getTodayKey(), ids: [] });
  MITU_STATE.cakes = [];
  MITU_STATE.today = { date: getTodayKey(), ids: [] };
}

async function saveToday(ids) {
  const today = { date: getTodayKey(), ids: [...ids] };
  await setDoc(todayRef, today);
  MITU_STATE.today = today;
}

async function saveShop(cfg) {
  await setDoc(shopRef, cfg);
  MITU_STATE.config = { ...MITU_DEFAULTS, ...cfg };
  MITU_STATE.initialized = true;
}

async function saveFeedback(fb) {
  await setDoc(doc(db, "feedbacks", fb.id), body(fb));
  const i = MITU_STATE.feedbacks.findIndex(f => f.id === fb.id);
  if (i === -1) MITU_STATE.feedbacks.unshift(fb);
  else MITU_STATE.feedbacks[i] = fb;
}

async function deleteFeedback(id) {
  await deleteDoc(doc(db, "feedbacks", id));
  MITU_STATE.feedbacks = MITU_STATE.feedbacks.filter(f => f.id !== id);
}

/**
 * Ghi đè toàn bộ dữ liệu (khởi tạo lần đầu hoặc khôi phục bản sao lưu).
 * Bánh/feedback không có trong data sẽ bị xóa.
 */
async function replaceAll(data) {
  const ops = [];
  const keepCakes = new Set(data.cakes.map(c => c.id));
  const keepFbs   = new Set(data.feedbacks.map(f => f.id));
  const [cakesSnap, fbSnap] = await Promise.all([
    getDocs(collection(db, "cakes")),
    getDocs(collection(db, "feedbacks")),
  ]);
  cakesSnap.docs.forEach(d => { if (!keepCakes.has(d.id)) ops.push(b => b.delete(d.ref)); });
  fbSnap.docs.forEach(d => { if (!keepFbs.has(d.id)) ops.push(b => b.delete(d.ref)); });
  data.cakes.forEach(c => ops.push(b => b.set(doc(db, "cakes", c.id), body(c))));
  data.feedbacks.forEach(f => ops.push(b => b.set(doc(db, "feedbacks", f.id), body(f))));
  ops.push(b => b.set(todayRef, data.today));
  // settings/shop ghi cuối: có mặt nghĩa là dữ liệu đã đủ
  ops.push(b => b.set(shopRef, data.config));

  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach(op => op(batch));
    await batch.commit();
  }

  MITU_STATE.config      = { ...MITU_DEFAULTS, ...data.config };
  MITU_STATE.cakes       = [...data.cakes].sort(byNewest);
  MITU_STATE.feedbacks   = [...data.feedbacks].sort(byNewest);
  MITU_STATE.today       = data.today;
  MITU_STATE.initialized = true;
}

// ── Đăng nhập admin (chỉ tải SDK Auth khi trang admin cần) ──
let authMod = null;
async function auth() {
  if (!authMod) {
    const m = await import(AUTH_URL);
    authMod = { m, auth: m.getAuth(app) };
  }
  return authMod;
}

async function onAuthChange(cb) {
  const { m, auth: a } = await auth();
  m.onAuthStateChanged(a, cb);
}

async function signIn(email, password) {
  const { m, auth: a } = await auth();
  return m.signInWithEmailAndPassword(a, email, password);
}

async function signOut() {
  const { m, auth: a } = await auth();
  return m.signOut(a);
}

async function changePassword(currentPassword, newPassword) {
  const { m, auth: a } = await auth();
  const user = a.currentUser;
  if (!user) throw new Error("not-signed-in");
  await m.reauthenticateWithCredential(user, m.EmailAuthProvider.credential(user.email, currentPassword));
  await m.updatePassword(user, newPassword);
}

// Token đăng nhập của admin, gửi kèm khi gọi AI agent (api/admin-agent.js kiểm tra)
async function getIdToken() {
  const { auth: a } = await auth();
  if (!a.currentUser) throw new Error("not-signed-in");
  return a.currentUser.getIdToken();
}

window.MituDB = {
  loadAll, saveCake, deleteCake, deleteAllCakes, saveToday, saveShop,
  saveFeedback, deleteFeedback, replaceAll,
  onAuthChange, signIn, signOut, changePassword, getIdToken,
};

loadAll();
