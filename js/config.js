/**
 * TIỆM BÁNH MITU – Cấu hình mặc định
 * Chủ tiệm có thể thay đổi trong trang Admin > Cài đặt
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
  adminUser: "admin",
  adminPass: "mitu2024",
};

const MITU_DEFAULT_CAKES = [
  {
    id: "mitu-cake-1",
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
    name: "Bánh Hoa Hồng Trắng Tinh Khôi",
    category: "female",
    audience: ["female"],
    type: ["custom-shaped"],
    style: ["elegant", "luxury"],
    price: 460000,
    image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600&auto=format&fit=crop&q=80",
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

// Khởi tạo config nếu chưa có trong localStorage hoặc cập nhật nếu đang là giá trị mẫu cũ
(function initConfig() {
  const existing = localStorage.getItem("mitu_config");
  let cfg = null;
  if (existing) {
    try { cfg = JSON.parse(existing); } catch(e) { cfg = null; }
  }

  // Cập nhật nếu chưa có hoặc đang lưu thông tin mẫu cũ 0900000000 hoặc chưa có tiktokUrl
  if (!cfg || cfg.shopPhone === "0900000000" || cfg.zaloPhone === "0900000000" || !cfg.shopAddress || cfg.shopAddress.includes("Địa chỉ tiệm bánh của bạn") || !cfg.tiktokUrl) {
    const updatedCfg = {
      shopName: cfg?.shopName || MITU_DEFAULTS.shopName,
      shopSlogan: cfg?.shopSlogan || MITU_DEFAULTS.shopSlogan,
      shopAddress: MITU_DEFAULTS.shopAddress,
      shopPhone: MITU_DEFAULTS.shopPhone,
      zaloPhone: MITU_DEFAULTS.zaloPhone,
      tiktokUrl: cfg?.tiktokUrl || MITU_DEFAULTS.tiktokUrl,
      facebookUrl: cfg?.facebookUrl || MITU_DEFAULTS.facebookUrl,
    };
    localStorage.setItem("mitu_config", JSON.stringify(updatedCfg));
  }
  const existingPass = localStorage.getItem("mitu_admin_pass");
  if (!existingPass) {
    localStorage.setItem("mitu_admin_pass", MITU_DEFAULTS.adminPass);
  }
  const existingUser = localStorage.getItem("mitu_admin_user");
  if (!existingUser) {
    localStorage.setItem("mitu_admin_user", MITU_DEFAULTS.adminUser);
  }
  // Khởi tạo kho bánh đầy đủ mẫu nếu chưa có hoặc đang rỗng/cũ
  let cakes = [];
  try { cakes = JSON.parse(localStorage.getItem("mitu_cakes") || "[]"); } catch(e) { cakes = []; }
  if (!cakes || cakes.length < 12 || !cakes[0]?.audience) {
    localStorage.setItem("mitu_cakes", JSON.stringify(MITU_DEFAULT_CAKES));
    cakes = MITU_DEFAULT_CAKES;
  }
  // Khởi tạo menu hôm nay có toàn bộ bánh mẫu
  let today = null;
  try { today = JSON.parse(localStorage.getItem("mitu_today") || "null"); } catch(e) { today = null; }
  const todayDate = new Date().toLocaleDateString("vi-VN");
  if (!today || !today.ids || today.ids.length === 0) {
    localStorage.setItem("mitu_today", JSON.stringify({ date: todayDate, ids: cakes.map(c => c.id) }));
  }

  // Khởi tạo danh sách feedback nếu chưa có
  let feedbacks = null;
  try { feedbacks = JSON.parse(localStorage.getItem("mitu_feedbacks") || "null"); } catch(e) { feedbacks = null; }
  if (!feedbacks || !Array.isArray(feedbacks) || feedbacks.length === 0) {
    localStorage.setItem("mitu_feedbacks", JSON.stringify(MITU_DEFAULT_FEEDBACKS));
  }
})();

/**
 * Lấy config hiện tại
 */
function getConfig() {
  return JSON.parse(localStorage.getItem("mitu_config") || "{}");
}

/**
 * Lấy toàn bộ kho bánh
 */
function getCakes() {
  return JSON.parse(localStorage.getItem("mitu_cakes") || "[]");
}

/**
 * Lấy danh sách ảnh feedback khách hàng
 */
function getFeedbacks() {
  try {
    const list = JSON.parse(localStorage.getItem("mitu_feedbacks") || "null");
    if (Array.isArray(list) && list.length > 0) return list;
  } catch(e) {}
  localStorage.setItem("mitu_feedbacks", JSON.stringify(MITU_DEFAULT_FEEDBACKS));
  return MITU_DEFAULT_FEEDBACKS;
}

/**
 * Lưu danh sách ảnh feedback khách hàng
 */
function saveFeedbacks(list) {
  localStorage.setItem("mitu_feedbacks", JSON.stringify(list || []));
}

/**
 * Lấy menu hôm nay (danh sách ID)
 */
function getTodayMenu() {
  const today = JSON.parse(localStorage.getItem("mitu_today") || '{"date":"","ids":[]}');
  const todayDate = new Date().toLocaleDateString("vi-VN");
  if (today.date !== todayDate || !today.ids || today.ids.length === 0) {
    const cakes = getCakes();
    const updated = { date: todayDate, ids: cakes.map(c => c.id) };
    localStorage.setItem("mitu_today", JSON.stringify(updated));
    return updated;
  }
  return today;
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
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
