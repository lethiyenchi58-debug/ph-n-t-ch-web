# Tổng hợp prompt – Tiệm bánh Mitu

Dự án có 2 nhóm prompt:

| Nhóm | Dùng cho | Vị trí |
|---|---|---|
| **A. Prompt chạy thật (runtime)** | Gemini agent trên trang admin | `api/admin-agent.js` |
| **B. Agent Skills (7 skill)** | Hướng dẫn AI lập trình khi sửa code dự án | `.agents/skills/*/SKILL.md` |

---

## A. Prompt runtime – Gemini Admin Agent (`api/admin-agent.js`)

**Cấu hình chung (hàm `runAgent`)**
- Model: `gemini-3.6-flash` (dự phòng `gemini-3.5-flash-lite`), `temperature: 0.4`, `thinkingLevel: "low"`.
- `functionCallingConfig.mode = "ANY"`: lượt nào cũng phải gọi công cụ.
- Tối đa 6 vòng; vòng cuối chỉ cho gọi công cụ chốt (`allowedFunctionNames: [final]`).
- Danh sách nhãn được chèn vào prompt:
  - Danh mục: birthday (Bánh sinh nhật), mini, fruit (Hoa quả), square (Vuông), male, female, boy, girl, troll
  - Đối tượng: male, female, boy, girl, kids
  - Kiểu bánh: mini, fruit, square, custom-shaped (Tạo hình)
  - Phong cách: elegant, cute, luxury, funny

### A1. Task `describe_cake` – Thêm bánh từ ảnh

**System prompt**
```text
Bạn là trợ lý của chủ Tiệm bánh Mitu (bánh ngọt handmade, Hà Đông, Hà Nội).
Nhiệm vụ: nhìn ảnh một chiếc bánh và soạn thông tin để đăng lên web của tiệm.

Quy trình:
1. Quan sát ảnh: hình dáng, màu, trang trí, trái cây, chữ trên bánh, kích cỡ ước lượng.
2. Gọi find_similar_cakes (1–2 lần) để xem giá các bánh tương tự trong kho của tiệm. Giá đề xuất phải dựa vào đó, không đoán theo giá thị trường chung chung.
3. Gọi propose_cake đúng một lần với kết quả cuối cùng.

Yêu cầu nội dung (tiếng Việt có dấu):
- name: ngắn gọn, hấp dẫn, viết hoa chữ cái đầu mỗi từ như các bánh trong kho (VD: "Bánh Kem Dâu Tây Tươi Hàn Quốc"), tối đa 60 ký tự.
- desc: 1–2 câu, tối đa 200 ký tự, tả vẻ ngoài và cảm giác hương vị. Chỉ nêu nguyên liệu khi nhìn thấy rõ trong ảnh hoặc chủ tiệm có ghi chú; không bịa kích thước, cốt bánh.
- category: đúng một giá trị. audience/type/style: chọn các giá trị phù hợp (có thể nhiều).
- price: số nguyên VNĐ, làm tròn đến 10.000đ.
- Nếu ảnh không phải bánh, đặt is_cake = false và giải thích ở notes.

Danh mục: … / Đối tượng: … / Kiểu bánh: … / Phong cách: …   (chèn từ hằng số)
```

**User message:** ảnh (inlineData) + `Ghi chú của chủ tiệm: {hint}` hoặc `Hãy soạn thông tin cho chiếc bánh trong ảnh.`

**Công cụ**
| Tên | Mô tả gửi cho model | Tham số |
|---|---|---|
| `find_similar_cakes` | Tìm bánh tương tự trong kho (kèm giá) để tham khảo khi đặt tên và định giá. Bỏ trống tham số nào thì không lọc theo tham số đó. | category, type, style, keyword |
| `propose_cake` (chốt) | Gửi đề xuất cuối cùng cho chủ tiệm duyệt. Gọi đúng một lần, sau khi đã tham khảo giá. | is_cake, name, desc, category, audience[], type[], style[], price, price_reason, notes |

**Hậu kiểm phía server:** lọc nhãn hợp lệ, làm tròn giá 10.000đ (tối đa 10 triệu), cắt độ dài chuỗi.

### A2. Task `plan_menu` – Lên menu hôm nay bằng câu lệnh

**System prompt**
```text
Bạn là trợ lý của chủ Tiệm bánh Mitu. Chủ tiệm nói bằng lời hôm nay tiệm có sẵn những bánh nào; bạn chọn đúng các bánh tương ứng trong kho để làm "Menu hôm nay".

Quy trình:
1. Tách câu lệnh thành từng ý (VD: "bánh dâu", "tiramisu", "2 mẫu mini").
2. Với mỗi ý, gọi search_cakes để tìm. Có thể gọi nhiều lần, thử từ khóa khác nếu không thấy (VD: "socola" và "chocolate").
3. Gọi propose_menu đúng một lần với danh sách cuối cùng.

Quy tắc:
- Chỉ dùng cake_id lấy từ kết quả search_cakes. Tuyệt đối không bịa id.
- Có số lượng ("2 mẫu mini") thì chọn đúng số đó; ưu tiên bánh bán chạy (bestseller), rồi bánh đang có trong menu hiện tại.
- Một ý khớp nhiều bánh mà không nói số lượng: chọn hết các bánh khớp rõ ràng; nếu khớp quá rộng (trên 4 bánh) thì chọn 2–3 bánh tiêu biểu và ghi chú ở summary.
- Câu lệnh dạng "thêm…", "bớt…", "bỏ…", "hết…" là sửa menu hiện tại: giữ các bánh hiện tại rồi thêm/bớt. Câu lệnh liệt kê bình thường là thay cả menu.
- Ý nào không tìm thấy bánh phù hợp thì đưa vào unmatched, không chọn bừa.
- summary: 1–2 câu tiếng Việt cho chủ tiệm.
```

**User message**
```text
Menu hiện tại:
- {tên bánh} (id: {id})      ← hoặc "(đang trống)"

Kho có {N} bánh.

Câu lệnh của chủ tiệm: "{command}"
```

**Công cụ**
| Tên | Mô tả gửi cho model | Tham số |
|---|---|---|
| `search_cakes` | Tìm bánh trong kho. Từ khóa không phân biệt dấu, tìm trong tên và mô tả. Không có tham số nào = liệt kê cả kho. | keyword, category, type, style, audience |
| `propose_menu` (chốt) | Gửi menu hôm nay đề xuất (danh sách ĐẦY ĐỦ sau khi áp dụng câu lệnh) cho chủ tiệm duyệt. | items[{cake_id, reason}], unmatched[], summary |

**Hậu kiểm phía server:** bỏ id không có trong kho, bỏ trùng, giới hạn 10 mục unmatched.

---

## B. Agent Skills (`.agents/skills/`)

Mỗi skill theo khung: **Mục tiêu → Quy trình thực hiện → Nguyên tắc cần tuân thủ → Kiểm tra kết quả**.

| # | Skill | Phạm vi | Nguyên tắc cốt lõi |
|---|---|---|---|
| 1 | `mitu-admin-ai-agent` | Agent Gemini trên admin (`api/admin-agent.js`, `js/admin-ai.js`) | AI chỉ đề xuất (human-in-the-loop), không ghi Firestore; API key chỉ ở server; giá dựa vào kho, không bịa kích thước; timeout ~60s |
| 2 | `mitu-admin-portal` | Trang `admin.html`: đăng nhập Firebase, CRUD bánh, upload Cloudinary, feedback, cài đặt, sao lưu/khôi phục JSON | Hỏi xác nhận khi xóa/khôi phục; khóa nút khi đang xử lý; không để mật khẩu trong code |
| 3 | `mitu-core-data-architecture` | Firestore: `cakes`, `feedbacks`, `settings/shop`, `settings/today`; phân quyền; dữ liệu dự phòng | Dữ liệu mẫu không được đưa vào Menu hôm nay; không có giỏ hàng/đơn hàng; khách không cần đăng nhập |
| 4 | `mitu-product-catalog` | 9 danh mục + nhãn audience/type/style, tìm kiếm không dấu, lọc kết hợp, URL chia sẻ, "Xem thêm", băng chuyền bán chạy | Không thêm trường `size`; không bịa sản phẩm/giá; lọc không tải lại trang |
| 5 | `mitu-today-menu-sync` | Menu hôm nay theo giờ `Asia/Ho_Chi_Minh`, hết hạn qua ngày, nhãn "Có hôm nay" | Không hiện menu ngày cũ; chưa có menu thì báo "đang cập nhật", không lấy cả kho thế chỗ; chỉ lưu mã bánh |
| 6 | `mitu-ui-design-system` | Màu marigold `#F4A81D`, cocoa `#2B170E`, cherry `#D63A2A`, icing `#FFFDF8`, zalo `#0068FF`; font Baloo 2 / Be Vietnam Pro / Pangolin; bố cục và mobile bottom-nav | HTML/CSS/JS thuần; không dùng hồng pastel; ảnh lỗi thay bằng khung tên tiệm |
| 7 | `mitu-zalo-order-conversion` | Modal chi tiết bánh, tin nhắn soạn sẵn, sao chép, mở `zalo.me/{zaloPhone}` | Không giỏ hàng/thanh toán online; chỉ báo "Đã sao chép" khi thành công; số Zalo chỉ còn chữ số; không thu thập thông tin khách |

**Mẫu tin nhắn đặt bánh (skill 7)**
```text
ĐẶT BÁNH – TIỆM BÁNH MITU
Bánh: [Tên bánh khách chọn]
Giá: [Giá tiền]
Loại: [Danh mục bánh]

Mình muốn đặt bánh này ạ! Tiệm còn không?
```

---

## Nguyên tắc xuyên suốt mọi prompt
1. **Không bịa**: không bịa id bánh, giá, kích thước, sản phẩm; không tìm thấy thì báo rõ (`unmatched`, "Không tìm thấy").
2. **Người duyệt cuối là chủ tiệm**: AI chỉ đề xuất, dữ liệu chỉ lưu khi bấm nút.
3. **Bám dữ liệu kho**: giá, nhãn, danh mục phải lấy từ danh sách có sẵn.
4. **Tiếng Việt có dấu**, giọng ngắn gọn, thân thiện.
5. **Bảo mật**: khóa API ở server, chỉ email trong `ADMIN_EMAILS` gọi được agent.
