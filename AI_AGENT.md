# AI Agent cho admin – Tiệm bánh Mitu

Trợ lý AI (Gemini) trên trang `admin.html`, làm hai việc:

1. **Thêm bánh từ ảnh**: trong form *Thêm bánh mới*, chọn ảnh rồi bấm **Phân tích ảnh**. Agent nhìn ảnh, tra giá các bánh tương tự trong kho, rồi điền tên, mô tả, danh mục, nhãn và giá vào form (các ô được tô vàng). Admin sửa lại nếu cần rồi bấm **Lưu bánh**. Có nút **Hoàn tác**.
2. **Lên menu bằng câu lệnh**: ở tab *Menu hôm nay*, gõ ví dụ *"Hôm nay có bánh dâu, tiramisu và 2 mẫu mini"*. Agent tìm từng bánh trong kho rồi đề xuất danh sách Thêm / Giữ / Bỏ, kèm những ý không tìm thấy. Admin bấm **Áp dụng & lưu** thì menu mới được lưu.

Agent **chỉ đề xuất**. Không công cụ nào của agent ghi được vào Firestore: lần ghi duy nhất là khi admin bấm nút lưu.

## Kiến trúc

```
admin.html ──(ảnh / câu lệnh + kho bánh + Firebase idToken)──▶ /api/admin-agent  (Vercel Function)
                                                                │ 1. kiểm tra idToken với Firebase Auth, email có trong ADMIN_EMAILS
                                                                │ 2. vòng lặp agent với Gemini (function calling):
                                                                │      Gemini ─gọi─▶ find_similar_cakes / search_cakes ─kết quả─▶ Gemini …
                                                                │      … cho tới khi Gemini gọi propose_cake / propose_menu
                                                                │ 3. kiểm lại đề xuất (id có thật, nhãn hợp lệ, giá làm tròn)
admin.html ◀──────────────(đề xuất + các bước agent đã làm)─────┘
   └─ admin duyệt → bấm Lưu → ghi Firestore như cũ
```

| File | Vai trò |
|---|---|
| `api/admin-agent.js` | Server: xác thực admin, vòng lặp agent, các công cụ, gọi Gemini |
| `js/admin-ai.js` | Giao diện trên trang admin |
| `admin.html` | Thêm khung AI vào form bánh và tab Menu hôm nay, cùng CSS |
| `js/db.js` | Thêm `MituDB.getIdToken()` |
| `vercel.json` | Cho hàm chạy tối đa 60 giây |
| `dev.js` | Server chạy thử trên máy (giống Vercel) |

**Các công cụ của agent**

| Task | Công cụ | Việc làm |
|---|---|---|
| Thêm bánh | `find_similar_cakes(category, type, style, keyword)` | Tìm bánh tương tự, trả về giá min / trung vị / max để định giá |
| | `propose_cake(...)` | Chốt đề xuất (tên, mô tả, nhãn, giá, lý do giá) |
| Menu | `search_cakes(keyword, category, type, style, audience)` | Tìm trong kho, không phân biệt dấu ("banh dau" khớp "Bánh Dâu") |
| | `propose_menu(items, unmatched, summary)` | Chốt menu đề xuất |

Gemini được đặt `functionCallingConfig.mode = "ANY"` nên lượt nào cũng phải gọi công cụ. Ở lượt cuối (vòng thứ 6), agent chỉ còn được gọi công cụ chốt đề xuất, nên luôn có kết quả trả về.

## Chạy thử trên máy

1. Lấy API key Gemini tại <https://aistudio.google.com/apikey>.
2. Tạo file `.env.local` ở thư mục gốc. File này đã nằm trong `.gitignore`, **không commit**:
   ```
   GEMINI_API_KEY=khóa-của-bạn
   ADMIN_EMAILS=email-admin@gmail.com
   ```
3. Chạy `node dev.js`, rồi mở <http://localhost:3000/admin.html> và đăng nhập admin.

`start.bat` / `server.ps1` cũ chỉ phục vụ file tĩnh nên không chạy được AI. Muốn dùng AI trên máy thì chạy bằng `dev.js`.

## Deploy lên Vercel

1. Vercel → Project → **Settings → Environment Variables**, thêm:
   - `GEMINI_API_KEY`: khóa Gemini
   - `ADMIN_EMAILS`: email admin, nhiều email thì cách nhau dấu phẩy
   - (tùy chọn) `GEMINI_MODEL`: mặc định là `gemini-3.8-flash`
2. Push code lên GitHub (hoặc chạy `vercel --prod`). Vercel tự nhận thư mục `api/` thành Serverless Function, không cần `package.json` vì code không dùng thư viện ngoài.
3. Sau khi thêm hoặc sửa biến môi trường phải **Redeploy** thì mới có hiệu lực.

## Bảo mật

- API key Gemini chỉ nằm trên server (biến môi trường). Không có ở `js/config.js` hay trình duyệt.
- Chỉ người đăng nhập Firebase bằng email trong `ADMIN_EMAILS` mới gọi được agent. Giới hạn 40 lượt / 10 phút / admin.
- Link ảnh gửi lên chỉ được tải từ `res.cloudinary.com` / `images.unsplash.com` (chống SSRF).
- Agent không có quyền ghi dữ liệu. Server còn lọc lại id bánh, nên dù model "bịa" id thì cũng bị bỏ.

## Kịch bản demo gợi ý

| # | Thử | Kết quả mong đợi |
|---|---|---|
| 1 | Ảnh bánh kem dâu | Danh mục Hoa quả, nhãn đúng, giá gần các bánh trái cây trong kho |
| 2 | Ảnh không phải bánh (ảnh mèo) | Báo "không giống ảnh bánh", không điền form |
| 3 | Ảnh bánh + ghi chú "size 20cm, cốt socola" | Mô tả có thông tin trong ghi chú |
| 4 | "Hôm nay có bánh dâu, tiramisu và 2 mẫu mini" | Đúng 2 bánh mini, có bánh dâu, có tiramisu |
| 5 | "Thêm bánh khủng long" (khi đã có menu) | Giữ menu cũ, thêm 1 bánh |
| 6 | "Bỏ hết bánh mini" | Các bánh mini có nhãn "Bỏ" |
| 7 | "Có bánh bông lan trứng muối" (không có trong kho) | Báo ở mục "Không tìm thấy", không chọn bừa |

Mở mục **"Agent đã làm N bước"** dưới mỗi kết quả để cho thầy xem agent đã tự gọi những công cụ nào, với tham số gì.
