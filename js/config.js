/**
 * TIỆM BÁNH MITU – Cấu hình & dữ liệu mặc định
 * Dữ liệu thật nằm trên Firestore; các giá trị dưới đây là dữ liệu mẫu để khởi tạo
 * lần đầu và là dự phòng khi không tải được Firestore.
 */
const MITU_DEFAULTS = {
  shopName: "Tiệm bánh Mitu",
  shopSlogan: "Bánh ngọt handmade – Tình yêu trong từng chiếc bánh",
  shopAddress: "173 Vạn Phúc - Hà Đông, Hà Nội, Việt Nam",
  shopPhone: "0936290932",
  zaloPhone: "0936290932",
  tiktokUrl: "https://www.tiktok.com/@tiembanhmitu",
  instagramUrl: "https://www.instagram.com/tiembanh_mitu/",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=173+V%E1%BA%A1n+Ph%C3%BAc+-+H%C3%A0+%C4%90%C3%B4ng%2C+H%C3%A0+N%E1%BB%99i",
  facebookUrl: "https://www.facebook.com/profile.php?id=100063580955032",
};

// Số bánh tối đa ở băng chuyền "Bán chạy nhất" trên trang chủ
const BESTSELLER_LIMIT = 8;

const MITU_DEFAULT_CAKES = [
  {
    id: "mitu-cake-1",
    bestseller: true,
    name: "Bánh sinh nhật Spider-Man",
    category: "boy",
    audience: ["boy", "kids"],
    type: ["custom-shaped"],
    style: ["cute", "funny"],
    price: 350000,
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=600&auto=format&fit=crop&q=80",
    desc: "Bánh tạo hình người nhện ngộ nghĩnh, kem tươi ít ngọt, cốt chiffon vani mềm thơm các bé trai cực mê."
  },
  {
    id: "mitu-cake-2",
    bestseller: true,
    name: "Bánh Kem Dâu Tây Tươi Hàn Quốc",
    category: "fruit",
    audience: ["female"],
    type: ["fruit"],
    style: ["elegant", "cute"],
    price: 380000,
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&auto=format&fit=crop&q=80",
    desc: "Bánh kem sữa tươi dâu tây Đà Lạt ngập tràn trái tươi mọng, vị chua ngọt thanh dịu nhẹ nhàng."
  },
  {
    id: "mitu-cake-3",
    bestseller: true,
    name: "Bánh Mini Bento Pastel Xinh Xắn",
    category: "mini",
    audience: ["female", "girl"],
    type: ["mini"],
    style: ["cute", "elegant"],
    price: 160000,
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=80",
    desc: "Bánh bento mini size 10cm xinh xắn, thiết kế tối giản Hàn Quốc kèm nến và thìa gỗ dễ thương."
  },
  {
    id: "mitu-cake-4",
    name: "Bánh Socola Đen Lịch Lãm Cho Nam",
    category: "male",
    audience: ["male"],
    type: ["square"],
    style: ["luxury", "elegant"],
    price: 420000,
    image: "https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80",
    desc: "Cốt bánh chocolate Bỉ nguyên chất đậm đà, vị đắng thanh kết hợp kem ganache mượt mà sang trọng."
  },
  {
    id: "mitu-cake-5",
    name: "Bánh Công Chúa Vương Miện Hồng",
    category: "girl",
    audience: ["girl", "kids", "female"],
    type: ["custom-shaped"],
    style: ["cute", "luxury"],
    price: 450000,
    image: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&auto=format&fit=crop&q=80",
    desc: "Tone hồng pastel mộng mơ đính vương miện lấp lánh và ngọc trai đường, món quà sinh nhật bé gái mê mẩn."
  },
  {
    id: "mitu-cake-6",
    name: "Bánh Troll Meme \"Bớt Già Đi\"",
    category: "troll",
    audience: ["male", "female"],
    type: ["custom-shaped", "mini"],
    style: ["funny"],
    price: 290000,
    image: "https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=600&auto=format&fit=crop&q=80",
    desc: "Vẽ hình meme hài hước theo yêu cầu, thông điệp vui nhộn tạo tràng cười sảng khoái cho bạn bè."
  },
  {
    id: "mitu-cake-7",
    name: "Bánh Vuông Tiramisu Cacao Ý",
    category: "square",
    audience: ["male", "female"],
    type: ["square"],
    style: ["elegant", "luxury"],
    price: 360000,
    image: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=600&auto=format&fit=crop&q=80",
    desc: "Bánh vuông mascarpone chuẩn vị Ý kết hợp rượu kahlua và cà phê espresso thơm nồng nàn quyến rũ."
  },
  {
    id: "mitu-cake-8",
    bestseller: true,
    name: "Bánh Sinh Nhật Hoa Quả Nhiệt Đới",
    category: "birthday",
    audience: ["female", "male"],
    type: ["fruit"],
    style: ["elegant"],
    price: 390000,
    image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=600&auto=format&fit=crop&q=80",
    desc: "Bánh sinh nhật truyền thống phủ đầy việt quất, dâu tây tươi mọng mát lành cho ngày kỷ niệm ý nghĩa."
  },
  {
    id: "mitu-cake-9",
    name: "Bánh Kem Xoài & Chanh Leo Thanh Mát",
    category: "fruit",
    audience: ["female", "kids"],
    type: ["fruit", "mini"],
    style: ["elegant", "cute"],
    price: 320000,
    image: "https://images.unsplash.com/photo-1557308536-ee471ef2c390?w=600&auto=format&fit=crop&q=80",
    desc: "Mousse xoài cát kết hợp sốt chanh dây vàng óng, vị chua dịu thơm mát không hề ngấy."
  },
  {
    id: "mitu-cake-10",
    name: "Bánh Khủng Long Xanh Cho Bé Trai",
    category: "boy",
    audience: ["boy", "kids"],
    type: ["custom-shaped"],
    style: ["cute", "funny"],
    price: 380000,
    image: "https://images.unsplash.com/photo-1602351447937-745cb720612f?w=600&auto=format&fit=crop&q=80",
    desc: "Tạo hình chú khủng long ngộ nghĩnh tone xanh lá tươi vui, nhân vani bơ sữa ngọt dịu thanh tao."
  },
  {
    id: "mitu-cake-11",
    name: "Bánh Vuông Matcha Hạt Dẻ Cười",
    category: "square",
    audience: ["female", "male"],
    type: ["square"],
    style: ["elegant"],
    price: 340000,
    image: "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=600&auto=format&fit=crop&q=80",
    desc: "Bột trà xanh Uji Kyoto hảo hạng kết hợp nhân hạt dẻ cười bùi bùi, thơm thơm, ngọt thanh tinh tế."
  },
  {
    id: "mitu-cake-12",
    name: "Bánh Mini Cupcake Hộp Quà 4 Vị",
    category: "mini",
    audience: ["female", "kids", "girl"],
    type: ["mini"],
    style: ["cute"],
    price: 180000,
    image: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=600&auto=format&fit=crop&q=80",
    desc: "Set 4 chiếc mini cupcake xinh xắn: Dâu tây, Matcha, Chocolate và Vani phô mai mượt mà."
  },
  {
    id: "mitu-cake-13",
    bestseller: true,
    name: "Bánh Sinh Nhật Vàng Hoàng Gia Luxury",
    category: "birthday",
    audience: ["male", "female"],
    type: ["custom-shaped"],
    style: ["luxury"],
    price: 550000,
    image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&auto=format&fit=crop&q=80",
    desc: "Dát vàng thực phẩm sang trọng phối hoa lụa và macaron kem bơ Pháp đẳng cấp cho ngày trọng đại."
  },
  {
    id: "mitu-cake-14",
    name: "Bánh Troll Bạn Thân \"Nhan Sắc Tàn Phai\"",
    category: "troll",
    audience: ["female", "male"],
    type: ["custom-shaped"],
    style: ["funny"],
    price: 310000,
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    desc: "Thiết kế độc lạ tạo tiếng cười thả ga cho nhóm bạn thân dịp sinh nhật, hương vị chocolate ngọt lịm."
  },
  {
    id: "mitu-cake-15",
    bestseller: true,
    name: "Bánh Hoa Hồng Trắng Tinh Khôi",
    category: "female",
    audience: ["female"],
    type: ["custom-shaped"],
    style: ["elegant", "luxury"],
    price: 460000,
    image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=600&auto=format&fit=crop&q=80",
    desc: "Tạo hình cánh hoa mềm mại, kem bơ Thụy Sĩ mịn màng thơm nhẹ mùi hoa nhài thanh khiết."
  },
  {
    id: "mitu-cake-16",
    name: "Bánh Tart Trái Cây Mùa Hè Mini",
    category: "mini",
    audience: ["female", "girl", "kids"],
    type: ["mini", "fruit"],
    style: ["cute", "elegant"],
    price: 210000,
    image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80",
    desc: "Đế bánh tart giòn rụm thơm bơ, kem custard vani Madagascar và quả mọng nhiệt đới tươi rói."
  }
];

// Bài đăng TikTok hiện ở mục "Chúng tôi trên TikTok".
// type "video" mở trình phát ngay trên trang; "photo" mở sang TikTok.
// Ảnh bìa lưu sẵn trong images/tiktok/<id>.jpg (link ảnh của TikTok hết hạn sau vài tháng).
const MITU_TIKTOK_POSTS = [
  { id: "7558702509410241799", type: "video", caption: "Bánh kem mini + hộp trong xinh iu chỉ từ 99k" },
  { id: "7686048955121208583", type: "video", caption: "Bánh troll cho hội sinh nhật tháng 9" },
  { id: "7676022057540472071", type: "video", caption: "Bánh kem nem chua Thanh Hoá" },
  { id: "7654224986655182088", type: "photo", caption: "Chúc mừng sinh nhật sếp Đạt – phòng KD1" },
  { id: "7630535484929789205", type: "photo", caption: "Bánh sinh nhật bé Sóc 2 tuổi" },
  { id: "7571740859369082132", type: "video", caption: "Bánh chim cánh cụt đội mũ tiệc" },
];

const MITU_DEFAULT_FEEDBACKS = [
  {
    id: "fb-1",
    image: "images/feedback/feedback-1.png",
    name: "Thảo My",
    channel: "💬 Phản hồi qua Zalo",
    quote: "“Bánh xinh quá anh ạ 💕”",
    badge: "🎂 Bánh sinh nhật gấu nhỏ",
    caption: "Bánh sinh nhật tạo hình gấu con xinh xắn",
    context: "Mẫu bánh kem tone trắng kem nơ hồng đính kèm chú gấu nhỏ đội mũ tiệc ngọt ngào, tinh tế từng chi tiết."
  },
  {
    id: "fb-2",
    image: "images/feedback/feedback-2.png",
    name: "Quỳnh Trang",
    channel: "💬 Phản hồi qua Zalo",
    quote: "“Bánh xinh nhaaaa - Gửi tiệm feedback ✨”",
    badge: "🍓 Bánh hoa quả & Bàn tiệc",
    caption: "Bàn tiệc hoa quả & Bánh kem tươi sinh nhật tháng 8",
    context: "Bánh kem tươi phủ ngập tràn xoài tươi, dâu tây và việt quất hòa quyện cùng bàn tiệc liên hoan đầy ắp sắc màu."
  },
  {
    id: "fb-3",
    image: "images/feedback/feedback-3.png",
    name: "Anh Tuấn",
    channel: "💬 Phản hồi qua Zalo",
    quote: "“Bánh xinh lắm nha người đẹp 🥰”",
    badge: "🌿 Bánh thiết kế & Hoa tươi",
    caption: "Bánh kem nho xanh pastel & Bó hoa cát tường trắng",
    context: "Khách hàng rạng rỡ đón sinh nhật bên mẫu bánh kem nho xanh phong cách Hàn Quốc cùng bó hoa tươi tinh tế."
  },
  {
    id: "fb-4",
    image: "images/feedback/feedback-4.png",
    name: "Thu Hương",
    channel: "💬 Phản hồi qua Zalo",
    quote: "“Bánh xinh ạ - Chúc mừng sinh nhật Mẹ ❤️”",
    badge: "💖 Mừng sinh nhật Mẹ",
    caption: "Bánh trái tim dâu tây số 40 mừng sinh nhật Mẹ",
    context: "Chiếc bánh hình trái tim đầy ắp dâu tây đỏ tươi mọng, số 40 mạ vàng kim lung linh dưới ánh nến sinh nhật gia đình ấm áp."
  },
  {
    id: "fb-5",
    image: "images/feedback/feedback-5.png",
    name: "Phương Thảo",
    channel: "💬 Phản hồi qua Zalo",
    quote: "“C ơi bánh xinh thế 💕”",
    badge: "✨ Tiệc tối lãng mạn",
    caption: "Bánh kem trái tim thắp đèn neon Love tiệc tối lãng mạn",
    context: "Bánh kem trái tim phủ bột cacao viền sóng kem, gắn đèn neon chữ Love lung linh trong không gian tiệc tối lãng mạn."
  }
];
// ── Firebase & Cloudinary ─────────────────────────────────────
// firebaseConfig để công khai được: dữ liệu được bảo vệ bằng firestore.rules,
// chỉ email admin đã đăng nhập mới ghi được.
const MITU_FIREBASE = {
  apiKey: "AIzaSyDIWNdqj1mpnrMLsS_n2xqCWnmmZ9UGFqk",
  authDomain: "mitu-bakery.firebaseapp.com",
  projectId: "mitu-bakery",
  storageBucket: "mitu-bakery.firebasestorage.app",
  messagingSenderId: "331245917351",
  appId: "1:331245917351:web:3a06b06b443e849d98f782",
};

// Ảnh bánh & feedback upload lên Cloudinary (preset dạng Unsigned)
const MITU_CLOUDINARY = {
  cloudName: "m6hxzdix",       // Cloud name (Settings → API Keys), không phải tên hiển thị
  uploadPreset: "mitu_upload",
};

// ── Dữ liệu đang dùng (js/db.js nạp từ Firestore rồi phát sự kiện "mitu:data") ──
// initialized = false: Firestore chưa có dữ liệu → trang khách tạm dùng dữ liệu mẫu,
// admin sẽ thấy nút "Khởi tạo dữ liệu".
const MITU_STATE = {
  ready: false,
  initialized: false,
  error: null,
  config: { ...MITU_DEFAULTS },
  cakes: MITU_DEFAULT_CAKES.map(c => ({ ...c })),
  feedbacks: MITU_DEFAULT_FEEDBACKS.map(f => ({ ...f })),
  today: { date: "", ids: [] },
};

/**
 * Chạy cb khi dữ liệu đã nạp xong (chạy ngay nếu đã nạp)
 */
function onMituData(cb) {
  if (MITU_STATE.ready) cb();
  else document.addEventListener("mitu:data", () => cb(), { once: true });
}

/**
 * Lấy config hiện tại
 */
function getConfig() {
  return MITU_STATE.config;
}

/**
 * Lấy toàn bộ kho bánh
 */
function getCakes() {
  return MITU_STATE.cakes;
}

/**
 * Lấy danh sách ảnh feedback khách hàng
 */
function getFeedbacks() {
  return MITU_STATE.feedbacks;
}

/**
 * Khóa ngày theo giờ Việt Nam, để máy admin và máy khách cùng hiểu "hôm nay"
 */
function getTodayKey() {
  return new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Menu đã lưu gần nhất (có thể là của ngày trước)
 */
function getSavedTodayMenu() {
  const saved = MITU_STATE.today;
  return { date: saved?.date || "", ids: Array.isArray(saved?.ids) ? saved.ids : [] };
}

/**
 * Lấy menu hôm nay (danh sách ID). Menu của ngày trước không tính là hôm nay:
 * trả ids rỗng để trang khách không hiện bánh hôm qua như bánh có sẵn.
 */
function getTodayMenu() {
  const saved = getSavedTodayMenu();
  const isToday = saved.date === getTodayKey();
  return { date: saved.date, ids: isToday ? saved.ids : [], isToday };
}

/**
 * Ảnh Cloudinary: xin bản đã nén, đúng cỡ hiển thị. Ảnh nguồn khác giữ nguyên.
 */
function cdnImage(url, width) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

/**
 * Format giá tiền VNĐ
 */
function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

/**
 * Tạo ID ngẫu nhiên
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
