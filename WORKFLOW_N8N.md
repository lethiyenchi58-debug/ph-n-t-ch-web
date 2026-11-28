# Workflow AI tự động – Tiệm bánh Mitu

Ba workflow chạy **tự động** trên **n8n cài ở máy của tiệm** (miễn phí):

| Ưu tiên | Workflow | Chạy khi nào | Kết quả |
|---|---|---|---|
| **1** | **WF2 · Theo dõi đối thủ** | 7:00 sáng thứ Hai | **Tự tìm đối thủ** quanh tiệm, báo cáo đối thủ + xu hướng gửi Telegram, lưu file; 5 ý tưởng bài đăng được chuyển sang WF3 |
| **2** | **WF3 · Tự đăng bài Facebook** | 8:00 mỗi sáng + khi WF2 gửi ý tưởng | Bài "Menu hôm nay" đăng ngay; 5 bài tuần được **hẹn giờ** sẵn trên Fanpage |
| **3** | **WF1 · Tự trả lời khách** | Mỗi khi có tin nhắn | Trả lời chat trên web, Messenger, comment Fanpage 24/7; báo Telegram khi khách đặt bánh / khiếu nại |

> **Đã làm sẵn:** 3 workflow, file chạy n8n, khung chat trên web, file cấu hình mẫu. Cả 3 workflow **đã được chạy thử thật** (xem [mục 9](#9-kết-quả-đã-chạy-thử)).
> **Phần bạn cần làm:** tạo vài tài khoản miễn phí (Telegram, Tavily, Facebook Developer, ngrok), dán khoá vào `.env.local`, rồi nháy đúp `n8n.bat`. Mỗi bước có hướng dẫn bên dưới.

Trợ lý AI trên trang admin (thêm bánh từ ảnh, lên menu bằng câu lệnh) vẫn giữ nguyên, xem `AI_AGENT.md`.

---

## Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [Cài đặt chung – làm 1 lần](#2-cài-đặt-chung--làm-1-lần)
3. [WF2 – Theo dõi đối thủ](#3-wf2--theo-dõi-đối-thủ)
4. [WF3 – Tự đăng bài Facebook](#4-wf3--tự-đăng-bài-facebook)
5. [WF1 – Tự trả lời khách](#5-wf1--tự-trả-lời-khách)
6. [Vận hành hằng ngày / hằng tuần](#6-vận-hành-hằng-ngày--hằng-tuần)
7. [Xử lý sự cố](#7-xử-lý-sự-cố)
8. [Giới hạn cần biết](#8-giới-hạn-cần-biết)
9. [Kết quả đã chạy thử](#9-kết-quả-đã-chạy-thử)
10. [Phụ lục cho người sửa kỹ thuật](#10-phụ-lục-cho-người-sửa-kỹ-thuật)

---

## 1. Tổng quan

### 1.1 Bức tranh chung

```
                 ┌──────────────── MÁY CỦA TIỆM (n8n.bat) ────────────────┐
                 │                                                         │
 Thứ Hai 7:00 ──▶│ WF2 Tự tìm đối thủ ─▶ Tavily tra từng tiệm ─▶ Gemini ─┐ │──▶ Telegram: báo cáo
                 │                                   n8n/bao-cao/*.md  │   │
                 │                                   5 ý tưởng bài ────┘   │
                 │                                        │                │
 Mỗi sáng 8:00 ─▶│ WF3 Đăng bài ◀─────────────────────────┘                │──▶ Fanpage: đăng ngay / hẹn giờ
                 │   Menu hôm nay (Firestore) ─▶ Gemini viết ─▶ kiểm tra   │──▶ Telegram: link bài / bản nháp
                 │                                                         │
 Khách nhắn ────▶│ WF1 Trả lời khách ─▶ Gemini (kho bánh + FAQ) ─▶ kiểm tra│──▶ trả lời khách
 (web/Messenger/ │                                                         │──▶ Telegram: đơn, khiếu nại
  comment)       └─────────────────────────────────────────────────────────┘
        ▲ đi qua ngrok (đường hầm từ Internet vào máy)

 Dữ liệu dùng chung: kho bánh, Menu hôm nay, thông tin tiệm  ← Firestore (admin vẫn sửa như cũ)
                     FAQ, giọng văn, danh sách đối thủ       ← n8n/cau-hinh/*.txt (sửa bằng Notepad)
```

### 1.2 Nguyên tắc "tự động mà vẫn an toàn"

Không có bước người bấm duyệt. Thay vào đó, mọi thứ trước khi gửi hoặc đăng đều qua **kiểm tra tự động**:

| Rủi ro | Cách chặn |
|---|---|
| AI bịa giá | Mọi số tiền AI viết phải **trùng giá trong kho**. Sai thì WF3 dùng mẫu bài an toàn; WF1 đổi sang câu "Mitu kiểm tra giá rồi báo bạn ngay" và báo Telegram |
| AI hứa khuyến mãi | Bài có từ cấm (giảm giá, sale, freeship, tặng kèm, rẻ nhất, số 1…) thì đổi sang mẫu an toàn |
| Đăng trùng | Bài Menu hôm nay chỉ đăng 1 lần/ngày; menu chưa cập nhật thì **không đăng** và nhắc qua Telegram |
| Bot nói lung tung với khách đang giận | Khiếu nại → xin lỗi + báo chủ tiệm. Chủ tiệm tự nhắn trong hộp thư Page → bot **tự im 6 tiếng** với khách đó |
| Lỗi, hết lượt AI | Tự thử lại; vẫn lỗi thì gửi câu dự phòng ("nhắn Zalo 0936290932") và báo Telegram |
| Mới cài, chưa tin AI | `CHE_DO_THU=1`: WF3 chỉ gửi **bản nháp** qua Telegram, chưa đăng thật |

### 1.3 Công cụ và chi phí

| Công cụ | Dùng để | Chi phí |
|---|---|---|
| **n8n** (bản 2.49.8, chạy bằng Node.js trên máy) | Chạy 3 workflow, có sơ đồ kéo thả để xem/sửa | Miễn phí |
| **Gemini** (khoá đang dùng cho admin) | Viết bài, phân tích, trả lời khách | Miễn phí, giới hạn ~5 lượt/phút |
| **Tavily** | Tìm thông tin đối thủ trên web | Miễn phí ~1.000 lượt/tháng (WF2 dùng ~40–50) |
| **Telegram bot** | Gửi báo cáo, bản nháp, báo đơn/khiếu nại về điện thoại | Miễn phí |
| **Facebook Graph API** | Đăng bài, trả lời Messenger và comment | Miễn phí |
| **ngrok** (1 tên miền tĩnh) | Cho Facebook và khung chat web gọi vào n8n trên máy | Miễn phí |
| Firestore (đang có) | Kho bánh, Menu hôm nay, thông tin tiệm | Như hiện tại |

> Vì sao không dùng Google Search của Gemini? Đã thử: khoá Gemini miễn phí bị từ chối tính năng này (lỗi 429 với mọi model). Tavily thay thế được và cũng miễn phí.

### 1.4 Lộ trình triển khai (ưu tiên WF2 → WF3 → WF1)

| Giai đoạn | Việc | Bạn cần | Xong khi |
|---|---|---|---|
| **0. Nền** (~20 phút) | Telegram bot, mở n8n lần đầu | [Mục 2](#2-cài-đặt-chung--làm-1-lần) | Mở được n8n, thấy 3 workflow |
| **1. WF2** (~10 phút) | Khoá Tavily (đối thủ tự tìm, không bắt buộc ghi tay) | [Mục 3.5](#35-cài-đặt-riêng-cho-wf2) | Nhận báo cáo trên Telegram khi bấm chạy thử |
| **2. WF3** (~30 phút) | Lấy token Fanpage; chạy thử ở chế độ thử 2–3 ngày; rồi tắt chế độ thử | [Mục 4.6](#46-cài-đặt-riêng-cho-wf3--lấy-token-fanpage) | Bài Menu hôm nay tự lên Fanpage lúc 8:00 |
| **3. WF1** (~1 giờ + chờ Meta duyệt) | Sửa FAQ, ngrok, gắn khung chat lên web, nối webhook Facebook, nộp App Review | [Mục 5.6](#56-cài-đặt-riêng-cho-wf1) | Khách thật nhắn và được trả lời |

### 1.5 Những file đã có trong dự án

| File | Là gì | Ai sửa |
|---|---|---|
| `n8n.bat` | Nháy đúp để mở n8n. Lần đầu tự nạp và bật 3 workflow | Không cần sửa |
| `n8n-tu-chay.bat` | Bật/tắt chế độ n8n tự chạy khi mở máy | Không cần sửa |
| `.env.local` | **Khoá và ID** (Gemini, Telegram, Tavily, Facebook, ngrok). Đã có sẵn các dòng trống để điền | **Bạn điền** |
| `n8n/cau-hinh/doi-thu.txt` | Khu vực tự tìm, số tiệm tự tìm, và (tuỳ chọn) tiệm muốn theo dõi cố định | **Marketing sửa** |
| `n8n/cau-hinh/doi-thu-tu-tim.txt` | Danh sách đối thủ WF2 tự tìm tuần gần nhất (tự sinh) | Chỉ đọc |
| `n8n/cau-hinh/faq.txt` | Câu hỏi thường gặp (giờ mở cửa, ship, cọc, size…) | **Marketing sửa** (còn chỗ `[...]` cần điền đúng) |
| `n8n/cau-hinh/giong-van.txt` | Giọng văn Mitu cho bài đăng và tin nhắn | **Marketing sửa** |
| `n8n/workflows/*.json` | 3 workflow | Không cần sửa |
| `n8n/bao-cao/` | Báo cáo đối thủ hằng tuần (tự sinh, dạng `.md`) | Chỉ đọc |
| `js/chat.js` + `MITU_CHAT_URL` trong `js/config.js` | Khung chat trên trang khách (ẩn cho tới khi điền `MITU_CHAT_URL`) | Điền 1 dòng ở giai đoạn 3 |
| `n8n-data/` | Dữ liệu n8n trên máy (tài khoản, lịch sử chạy). **Không commit, không xoá** | – |

Các file n8n **không** được đưa lên web (đã thêm vào `.vercelignore`), `n8n-data/` không vào git.

---

## 2. Cài đặt chung – làm 1 lần

### Bước 1. Tạo Telegram bot (nhận báo cáo trên điện thoại)
1. Mở Telegram, tìm **@BotFather** → gửi `/newbot` → đặt tên (VD *Mitu Trợ Lý*) và username (VD `mitu_tro_ly_bot`).
2. BotFather trả về **token** dạng `123456:ABC...` → dán vào `.env.local` ở dòng `TELEGRAM_BOT_TOKEN=`.
3. Mở bot vừa tạo, bấm **Start** (hoặc gửi một tin bất kỳ).
4. Mở trình duyệt: `https://api.telegram.org/bot<TOKEN>/getUpdates` (thay `<TOKEN>`). Tìm `"chat":{"id":123456789` → dán số đó vào `TELEGRAM_CHAT_ID=`.
   - Muốn cả team cùng nhận: tạo nhóm Telegram, thêm bot vào nhóm, gửi 1 tin trong nhóm, rồi lấy `chat.id` (số âm, VD `-100…`).

### Bước 2. Điền `.env.local`
File `.env.local` ở thư mục gốc dự án đã có sẵn các dòng cần điền (mở bằng Notepad):

```
CHE_DO_THU=1                      ← để 1 khi mới chạy; ổn thì đổi 0
TELEGRAM_BOT_TOKEN=               ← bước 1
TELEGRAM_CHAT_ID=                 ← bước 1
TAVILY_API_KEY=                   ← mục 3.5 (WF2)
FACEBOOK_PAGE_ID=100063580955032  ← kiểm tra lại ở mục 4.6
FACEBOOK_PAGE_TOKEN=              ← mục 4.6 (WF3)
FACEBOOK_VERIFY_TOKEN=mitu-…      ← đã tạo sẵn, giữ nguyên
NGROK_DOMAIN=                     ← mục 5.6 (WF1)
```
Chưa có thì để trống, workflow nào cần sẽ báo thiếu. **Không gửi file này cho ai, không commit.**

### Bước 3. Mở n8n
1. Nháy đúp **`n8n.bat`**.
   - **Lần đầu mất 5–15 phút** để tải n8n và nạp 3 workflow, cứ để chạy.
   - Máy chưa có Node.js thì nháy đúp `start.bat` trước (nó tự cài).
2. Trình duyệt mở `http://localhost:5678` → tạo **tài khoản chủ** (email + mật khẩu tuỳ ý, chỉ dùng trên máy này, nhớ ghi lại).
3. Bấm **Overview / Workflows** sẽ thấy 3 workflow `Mitu WF1`, `Mitu WF2`, `Mitu WF3`, **đã được bật sẵn**.
4. n8n chạy trong cửa sổ thu nhỏ dưới taskbar tên **"Mitu n8n - DUNG TAT CUA SO NAY"**. Tắt cửa sổ đó là tắt n8n.

> **Mỗi lần sửa `.env.local`:** tắt cửa sổ "Mitu n8n" rồi nháy đúp lại `n8n.bat`.
> Sửa các file `n8n/cau-hinh/*.txt` thì **không cần** khởi động lại.

### Bước 4. Cho n8n tự chạy khi mở máy (nên làm)
Lịch 7:00 và 8:00 chỉ chạy khi n8n đang mở. Nháy đúp **`n8n-tu-chay.bat`** một lần: từ đó mỗi khi bật máy, n8n tự chạy ngầm. Chạy lại file này nếu muốn tắt.

> Máy tắt hoặc ngủ đúng giờ chạy thì lượt đó bị bỏ qua (n8n không chạy bù). Nên chỉnh Windows **không tự ngủ** khi cắm sạc: *Settings → System → Power → Screen and sleep → When plugged in, put my device to sleep after: Never*.

---

## 3. WF2 – Theo dõi đối thủ

### 3.1 Mục tiêu
Mỗi sáng thứ Hai, team marketing có ngay trên Telegram: đối thủ đang làm gì, giá ra sao, xu hướng nào đang lên, **3 việc nên làm** tuần này và **5 ý tưởng bài đăng** (tự chuyển sang WF3 để lên lịch).

### 3.2 Luồng chi tiết

| # | Node trong n8n | Làm gì |
|---|---|---|
| 1 | ⏰ **Thứ Hai 7:00** / ▶️ **Bấm để chạy thử** | Bắt đầu theo lịch, hoặc bấm tay để thử |
| 2 | 🧭 **Đọc cấu hình + từ khoá tìm đối thủ** | Đọc `doi-thu.txt`: khu vực (`@khu-vuc`, mặc định *Vạn Phúc, Hà Đông, Hà Nội*), số tiệm tự tìm (`@tu-tim`, mặc định 5), tiệm ghi tay. Tạo 3 câu tìm: *tiệm bánh kem…, bánh sinh nhật… đặt bánh review, tiệm bánh ngọt gần…* |
| 3 | **Có bật tự tìm?** → 🔎 **Tìm tiệm bánh quanh khu vực** | `@tu-tim: 0` thì bỏ qua. Không thì Tavily tìm 3 câu trên, mỗi câu 10 kết quả |
| 4 | 🧠 **Nhờ AI lọc ra đối thủ** → 🤖 **AI chọn đối thủ** | Gemini chọn những **tiệm cụ thể có tên riêng** cùng phân khúc. Bỏ Mitu, bỏ bài "top 10…", trang review, sàn giao hàng. Không bịa link |
| 5 | 📂 **Gộp đối thủ + soạn từ khoá** | Gộp tiệm ghi tay (ưu tiên) + tiệm tự tìm, bỏ trùng, tối đa 10. Ghi danh sách tự tìm vào `doi-thu-tu-tim.txt`. Tạo câu tìm tin cho từng tiệm + 1 câu "xu hướng bánh kem Hà Nội" |
| 6 | 🔎 **Tìm trên web (Tavily)** | Tìm tin trong **30 ngày gần nhất** cho từng câu, lấy 6 kết quả + tóm tắt nhanh |
| 7 | 📚 **Gom kết quả tìm kiếm** | Gộp lại thành ghi chú kèm link nguồn |
| 8 | 🧠 **Soạn yêu cầu phân tích** | Ghép ghi chú + **toàn bộ kho bánh Mitu** (tên, giá, danh mục) + **dịp lễ trong 3 tuần tới** (8/3, 20/10, 20/11, Noel…) |
| 9 | 🧠 **AI phân tích & đề xuất** | Gemini trả về: tóm tắt, bảng đối thủ, so sánh giá, xu hướng, cơ hội, 3 việc nên làm, 5 ý tưởng bài (mỗi ý tưởng gắn với **1 bánh có thật trong kho**) |
| 10 | ✍️ **Soạn báo cáo + lưu file** | Bỏ ý tưởng gắn với bánh không có thật; soạn tin Telegram; lưu báo cáo đầy đủ vào `n8n/bao-cao/doi-thu-YYYY-MM-DD.md` |
| 11 | 📨 **Gửi báo cáo Telegram** | Gửi bản tóm tắt |
| 12 | ➡️ **Chuyển ý tưởng sang WF3** | WF3 viết và hẹn giờ 5 bài cho tuần (xem 4.3) |

Mỗi lần chạy tốn **2 lượt Gemini** (lọc đối thủ + phân tích) và khoảng **10 lượt Tavily** (3 câu tự tìm + số đối thủ + 1).

> Đối thủ tự tìm phụ thuộc vào việc tiệm đó có xuất hiện trên web (Google Maps, bài review, web riêng) hay không. Tiệm chỉ có Fanpage nhỏ thường **không** được tìm thấy. Nếu biết chắc đối thủ nào quan trọng, hãy ghi tay vào `doi-thu.txt`.

### 3.3 Mẫu báo cáo Telegram
```
📊 Báo cáo đối thủ tuần 01/12/2026
🔍 Đã theo dõi: Tiệm A (tự tìm), Tiệm B (bạn ghi)…
<tóm tắt 2–3 câu>

✅ 3 việc nên làm
1. …   2. …   3. …

🏪 Đối thủ
• Tiệm A: điểm nổi bật · Giá: … · KM: …

🔥 Xu hướng
• …

💡 5 ý tưởng bài đăng (đã chuyển sang WF3 để lên lịch)
• Tiêu đề – Bánh …
```
File `.md` trong `n8n/bao-cao/` có thêm bảng so sánh giá, cơ hội và **link nguồn** của từng thông tin.

### 3.4 Quy tắc AI phải theo
- Chỉ dùng thông tin trong kết quả tìm kiếm; kết quả không nói đúng tiệm thì bỏ; không có thì ghi "Chưa có thông tin". **Không bịa.**
- Ý tưởng bài phải gắn với bánh có thật trong kho (chép đúng tên), hệ thống kiểm tra lại lần nữa.

### 3.5 Cài đặt riêng cho WF2
1. Vào **tavily.com** → Sign up (miễn phí, không cần thẻ) → copy **API key** (`tvly-…`) → dán vào `TAVILY_API_KEY=` trong `.env.local` → khởi động lại n8n.
2. **Không bắt buộc:** mở `n8n/cau-hinh/doi-thu.txt` để đổi khu vực tự tìm (`@khu-vuc`), số tiệm (`@tu-tim`), hoặc thêm tiệm muốn theo dõi cố định (mỗi dòng `Tên tiệm | link`).
3. Trong n8n mở **Mitu WF2** → bấm **Execute workflow** (chạy thử) → đợi khoảng 1–2 phút → xem Telegram, thư mục `n8n/bao-cao/` và file `n8n/cau-hinh/doi-thu-tu-tim.txt`.

### 3.6 Tuỳ chỉnh
- **Đổi giờ hoặc ngày chạy:** mở WF2 → bấm ô ⏰ → sửa → **Save / Publish**.
- **Đổi đối thủ / khu vực:** chỉ cần sửa `doi-thu.txt`, không phải mở n8n. Thấy tiệm tự tìm nào đáng theo dõi lâu dài thì chép dòng đó từ `doi-thu-tu-tim.txt` sang `doi-thu.txt`. Tự tìm ra tiệm không liên quan thì đặt `@tu-tim: 0` và ghi tay.
- Báo cáo chung chung, ít thông tin: thêm từ khoá nhận diện vào tên (VD `Tiệm bánh ABC Vạn Phúc`), vì Fanpage Facebook ít được công cụ tìm kiếm đọc tới.

---

## 4. WF3 – Tự đăng bài Facebook

### 4.1 Mục tiêu
Fanpage có bài đều đặn mà không ai phải ngồi viết: **bài Menu hôm nay mỗi sáng** + **5 bài/tuần** theo ý tưởng từ WF2, đăng hoặc hẹn giờ tự động.

### 4.2 Luồng A – Bài "Menu hôm nay" (8:00 mỗi sáng)

| # | Node | Làm gì |
|---|---|---|
| 1 | ⏰ **8:00 mỗi sáng** / ▶️ **Bấm để chạy thử** | Bắt đầu |
| 2 | 🧾 **Chuẩn bị bài Menu hôm nay** | Đọc Firestore: Menu hôm nay, kho bánh, thông tin tiệm. Bỏ qua nếu: menu **không phải của hôm nay**, menu trống, hoặc **đã đăng hôm nay rồi** |
| 3 | **Có bài để đăng?** | Không có bài → **📨 Báo chưa đăng**: Telegram nhắc *"Cập nhật Menu hôm nay ở trang admin rồi bấm chạy lại WF3"* |
| 4 | ✍️ **AI viết bài (A)** | Gemini viết caption theo `giong-van.txt` (tối đa ~900 ký tự, đúng tên + giá, cuối bài có Zalo + địa chỉ) |
| 5 | 🛡️ **Kiểm tra tự động (A)** | Kiểm tra giá, từ cấm, độ dài; sai thì dùng **mẫu an toàn**. Thêm hashtag cố định `#tiembanhmitu #banhkemhadong #banhsinhnhat` |
| 6 | → **Phần đăng chung** (4.4) | Bài nhiều ảnh (tối đa 6 ảnh bánh trong menu), **đăng ngay** |

> Admin chốt menu sau 8:00? Mở WF3 bấm **Execute workflow** là đăng được ngay. Mỗi ngày chỉ đăng 1 lần nên bấm lại cũng không bị trùng.

### 4.3 Luồng B – 5 bài tuần (WF2 gọi vào sáng thứ Hai)

| # | Node | Làm gì |
|---|---|---|
| 1 | ➡️ **Nhận ý tưởng từ WF2** | Nhận 5 ý tưởng |
| 2 | 🗓️ **Lên lịch bài cho tuần** | Ghép mỗi ý tưởng với bánh (ảnh, giá) và xếp giờ: **T3 11:00, T4 19:30, T5 11:00, T6 19:30, T7 11:00** |
| 3 | ✍️ **AI viết bài (B)** → 🛡️ **Kiểm tra tự động (B)** | Như luồng A, mỗi bài cách nhau 13 giây cho khỏi vượt giới hạn Gemini |
| 4 | → **Phần đăng chung** | **Hẹn giờ** trên Facebook. Xem, sửa hoặc xoá ở **Meta Business Suite → Nội dung → Đã lên lịch** |

### 4.4 Phần đăng chung

| # | Node | Làm gì |
|---|---|---|
| 1 | **Chế độ thử?** | `CHE_DO_THU=1` → 👀 **Soạn bản nháp** → 📨 **Gửi bản nháp** (Telegram, kèm link ảnh). **Không đăng.** |
| 2 | 📸 **Tách từng ảnh** → ⬆️ **Tải ảnh lên Facebook (ẩn)** | Up ảnh lên Page ở dạng chưa công khai |
| 3 | 🧩 **Ghép bài** → 📢 **Đăng / hẹn giờ bài** | Tạo 1 bài nhiều ảnh: đăng ngay (luồng A) hoặc hẹn giờ (luồng B) |
| 4 | 📝 **Ghi nhớ + báo kết quả** → 📨 **Báo kết quả đăng** | Telegram: ✅ link bài / 🗓️ giờ hẹn / ❌ lỗi + cách xử lý |

### 4.5 Kiểm tra tự động (thay người duyệt)
- Mọi số tiền trong bài (`350.000đ`, `350k`, `1tr2`…) phải trùng giá của bánh trong bài.
- Không chứa: *giảm giá, khuyến mãi, khuyến mại, sale, freeship, free ship, miễn phí ship, tặng kèm, rẻ nhất, số 1, duy nhất*.
- Dài 60–1.500 ký tự.
- Sai bất kỳ điều nào → dùng **mẫu an toàn** (danh sách bánh + giá + Zalo + địa chỉ) và ghi lý do trong tin Telegram.
- Tiệm **có** khuyến mãi thật và muốn AI được nhắc tới: báo người kỹ thuật sửa danh sách từ cấm (xem [mục 10](#10-phụ-lục-cho-người-sửa-kỹ-thuật)).

### 4.6 Cài đặt riêng cho WF3 – lấy token Fanpage
Cần tài khoản Facebook **là quản trị viên của Fanpage Mitu**.

1. Vào **developers.facebook.com** → đăng nhập → **My Apps → Create App**. Chọn mục đích kiểu *quản lý Page / Other*, loại **Business**, đặt tên `Mitu Auto`.
2. Mở **Tools → Graph API Explorer**:
   - **Meta App**: chọn `Mitu Auto`.
   - **User or Page**: chọn *Get Page Access Token*.
   - **Permissions**: tick `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`. Nếu sẽ làm WF1 thì tick thêm `pages_messaging`, `pages_manage_metadata`, `pages_manage_engagement`, `pages_read_user_content`.
   - Bấm **Generate Access Token** → cho phép → chọn Page **Tiệm bánh Mitu**.
3. Token vừa tạo **chỉ sống ~1 giờ**. Đổi sang token dài hạn:
   - Mở **developers.facebook.com/tools/debug/accesstoken** → dán token → **Debug** → bấm **Extend Access Token** → copy token mới (token người dùng, sống ~60 ngày).
   - Quay lại Graph API Explorer, dán token mới vào ô Access Token, gọi `me/accounts` → **Submit**.
   - Trong kết quả, tìm Page Mitu: copy `access_token` → dán vào `FACEBOOK_PAGE_TOKEN=`; so `id` với `FACEBOOK_PAGE_ID=` (sửa lại nếu khác).
   - Token Page lấy theo cách này thường **không hết hạn**, trừ khi bạn đổi mật khẩu Facebook, gỡ quyền app, hoặc không còn là quản trị viên Page.
4. Khởi động lại n8n. Mở **Mitu WF3** → **Execute workflow**:
   - Với `CHE_DO_THU=1`: Telegram nhận bản nháp.
   - Đổi `CHE_DO_THU=0` (khởi động lại n8n) → chạy lại → bài lên Fanpage, Telegram nhận link.
5. **Kiểm tra bài đầu tiên bằng một tài khoản Facebook khác** (không phải admin). App còn ở chế độ *Development* thì có trường hợp người ngoài không thấy bài do app đăng. Nếu vậy: trong trang app bật **Live** (cần điền link chính sách bảo mật, có thể dùng link web tiệm).

> Nên chạy `CHE_DO_THU=1` **2–3 ngày**, đọc bản nháp trên Telegram. Thấy ổn mới đổi `0`.

---

## 5. WF1 – Tự trả lời khách

### 5.1 Mục tiêu
Khách hỏi lúc nào cũng được trả lời ngay, đúng giá, đúng giọng Mitu; khách muốn đặt thì được hỏi đủ thông tin; việc cần người thật thì báo chủ tiệm qua Telegram.

### 5.2 Ba kênh vào

| Kênh | Node bắt đầu | Ghi chú |
|---|---|---|
| **Chat trên web** | 💬 **Tin nhắn từ chat web** | Nút chat đỏ ở góc phải trang khách (`js/chat.js`), gợi ý bánh kèm ảnh + nút "Đặt qua Zalo" |
| **Messenger** | 📘 **Facebook gửi tin / comment** → 🧹 **Lọc sự kiện Facebook** | Trả lời trong hộp thư Page |
| **Comment Fanpage** | (như trên) | Trả lời ngắn dưới comment + **nhắn riêng** chi tiết (nếu khách hỏi giá/đặt bánh) |

Bộ lọc tự bỏ qua: comment của chính Page, tin "echo" do bot gửi, và khách đang trong **6 tiếng tạm dừng** (chủ tiệm đã tự nhắn).

### 5.3 Luồng xử lý chung

| # | Node | Làm gì |
|---|---|---|
| 1 | 🧠 **Chuẩn bị câu hỏi cho AI** | Lấy kho bánh, Menu hôm nay, thông tin tiệm (lưu tạm 10 phút), `faq.txt`, `giong-van.txt`, **8 lượt chat gần nhất** của khách (nhớ 24 giờ). Với comment: đọc thêm nội dung bài viết để biết "bánh này" là bánh nào |
| 2 | 🤖 **AI trả lời** | Gemini trả về: câu trả lời, câu trả lời công khai (comment), bánh gợi ý, ý định (hỏi thông tin / tư vấn / **đặt bánh** / **khiếu nại** / khen…), thông tin đơn (ngày lấy, bánh, size, chữ, SĐT) |
| 3 | 🛡️ **Kiểm tra + ghi nhớ hội thoại** | Giá sai kho → đổi câu an toàn + báo chủ; AI lỗi → câu dự phòng "nhắn Zalo"; lưu hội thoại; soạn tin Telegram nếu cần |
| 4 | **Trả lời theo kênh** | Web → trả JSON cho khung chat; Messenger → gửi tin; Comment → trả lời dưới comment → (nếu cần) nhắn riêng |
| 5 | **Cần báo chủ tiệm?** → 📨 **Telegram** | 🛒 đặt bánh (kèm thông tin đơn) · 🚨 khiếu nại · 🙋 câu AI không chắc |

### 5.4 Quy tắc AI phải theo
- Trả lời tối đa 4 câu; giá và tên bánh **chỉ lấy từ kho**.
- Bánh theo mẫu riêng: nói giá tuỳ mẫu, mời gửi ảnh qua Zalo.
- Không có trong dữ liệu → không đoán, hẹn kiểm tra lại, báo chủ.
- Đặt bánh: hỏi dần đủ **ngày giờ lấy, bánh/mẫu, size, chữ trên bánh, SĐT**; đủ rồi thì xác nhận và báo chủ để chốt.
- Khiếu nại: xin lỗi chân thành, hẹn chủ tiệm liên hệ, báo chủ.
- Không hứa khuyến mãi/freeship nếu `faq.txt` không ghi.

**Chất lượng trả lời phụ thuộc nhiều vào `faq.txt`.** Điền đúng các chỗ `[...]` (giờ mở cửa, ship, cọc, size, bảo quản) trước khi bật cho khách thật.

### 5.5 Chuyển cho người thật
- Chủ tiệm trả lời khách **trong hộp thư Page** (Meta Business Suite) → bot tự **im 6 tiếng** với khách đó, không chen ngang.
- Chống spam chat web: mỗi khách tối đa 30 tin/giờ.

### 5.6 Cài đặt riêng cho WF1

**Bước 1. Sửa `n8n/cau-hinh/faq.txt`** cho đúng thực tế của tiệm.

**Bước 2. Cài ngrok** (để Internet gọi được vào n8n trên máy):
1. Đăng ký miễn phí ở **ngrok.com** → trong dashboard copy **Authtoken**.
2. Mở PowerShell, chạy lần lượt:
   ```powershell
   winget install ngrok.ngrok
   ```
   ```powershell
   ngrok config add-authtoken <Authtoken-của-bạn>
   ```
3. Dashboard ngrok → **Domains** → nhận 1 **tên miền tĩnh miễn phí** (VD `mitu-abc.ngrok-free.app`) → dán vào `NGROK_DOMAIN=` trong `.env.local`.
4. Tắt rồi mở lại `n8n.bat`. Sẽ có thêm cửa sổ **"Mitu n8n - ngrok"** dưới taskbar.

**Bước 3. Bật khung chat trên web:**
1. Mở `js/config.js`, điền:
   ```js
   const MITU_CHAT_URL = "https://mitu-abc.ngrok-free.app/webhook/mitu-chat";
   ```
2. Push code lên GitHub để Vercel deploy (hoặc nhờ người kỹ thuật).
3. Mở web → nút chat đỏ ở góc phải → thử hỏi *"Menu hôm nay có gì?"*.
   Máy tắt thì khung chat tự trả lời *"Mitu đang hơi bận… nhắn Zalo 0936290932"*, web không bị lỗi.

**Bước 4. Nối Facebook vào WF1:**
1. Trang app `Mitu Auto` → **Add product → Messenger** (hoặc **Webhooks**).
2. **Configure webhooks**:
   - Callback URL: `https://<NGROK_DOMAIN>/webhook/mitu-facebook`
   - Verify token: giá trị `FACEBOOK_VERIFY_TOKEN` trong `.env.local`
   - Bấm **Verify and save** (n8n phải đang chạy).
3. Ở mục Page: chọn Page Mitu → **Add subscriptions** → tick `messages`, `message_echoes`, `feed`.
4. Lấy lại token Page có đủ quyền WF1 (mục 4.6 bước 2–3) nếu lúc trước chưa tick các quyền đó.
5. Thử bằng tài khoản admin/tester của app: nhắn Page, comment *"giá bao nhiêu shop?"* dưới một bài.

**Bước 5. Mở cho khách thật – Meta App Review:**
Khi app còn *Development*, bot **chỉ trả lời người có vai trò trong app** (admin, tester). Muốn trả lời mọi khách:
- Trang app → **App Review → Permissions and Features** → xin **Advanced Access** cho `pages_messaging` (và các quyền đã tick), quay video demo bot trả lời, mô tả mục đích; có thể phải **xác minh doanh nghiệp**.
- Thời gian duyệt thường vài ngày đến vài tuần. Trong lúc chờ, khung chat web vẫn dùng được với mọi khách.

---

## 6. Vận hành hằng ngày / hằng tuần

| Khi nào | Việc | Ai |
|---|---|---|
| Mỗi sáng **trước 8:00** | Cập nhật **Menu hôm nay** ở trang admin như cũ, vì WF3 lấy menu này để đăng | Chủ tiệm |
| Mỗi sáng | Xem Telegram: link bài đã đăng, hoặc nhắc "chưa cập nhật menu" | Marketing |
| Trong ngày | Telegram báo 🛒 đặt bánh / 🚨 khiếu nại → vào hộp thư Page hoặc Zalo xử lý | Chủ tiệm |
| **Thứ Hai** | Đọc báo cáo đối thủ, chọn 1–2 việc nên làm; xem 5 bài hẹn giờ trong Meta Business Suite, xoá/sửa bài không ưng | Marketing |
| Hằng tháng | Cập nhật `faq.txt`, `giong-van.txt`, `doi-thu.txt`; xem câu khách hay hỏi trong Telegram để bổ sung FAQ | Marketing |
| Khi bánh/giá thay đổi | Sửa ở trang admin như cũ, 3 workflow tự dùng dữ liệu mới | Chủ tiệm |

Xem lịch sử chạy: trong n8n bấm **Executions** (từng lần chạy, từng bước, lỗi ở đâu).

---

## 7. Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không nhận được gì trên Telegram | Sai `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`, hoặc chưa bấm Start với bot | Làm lại [Bước 1](#bước-1-tạo-telegram-bot-nhận-báo-cáo-trên-điện-thoại), khởi động lại n8n |
| 7:00 / 8:00 không chạy | Máy tắt, ngủ, hoặc n8n chưa mở | Chạy `n8n-tu-chay.bat`; tắt chế độ ngủ; bấm chạy tay |
| WF2 báo "Thiếu TAVILY_API_KEY" / "Chưa có đối thủ" | Chưa điền khoá / AI không tự tìm được tiệm nào và cũng chưa ghi tay | Xem [3.5](#35-cài-đặt-riêng-cho-wf2) |
| Báo cáo toàn "Chưa có thông tin" | Tavily hết lượt, hoặc tên tiệm khó tìm | Kiểm tra lượt ở dashboard Tavily; ghi tên tiệm cụ thể hơn |
| WF2 chạy nhưng không có 5 bài hẹn giờ | WF3 đang **tắt** (n8n chỉ cho gọi workflow đang bật) | Bật WF3 (công tắc **Active / Publish** trong n8n) |
| Telegram: "Menu trên web vẫn là ngày …" | Chưa cập nhật Menu hôm nay | Cập nhật ở admin → mở WF3 bấm **Execute workflow** |
| Telegram: ❌ Đăng bài lỗi, có chữ *token* / *OAuth* / *permission* | Token Page hết hạn hoặc thiếu quyền | Làm lại [4.6](#46-cài-đặt-riêng-cho-wf3--lấy-token-fanpage) bước 2–3, khởi động lại n8n |
| Bài đăng dùng "mẫu an toàn" | AI viết sai giá hoặc dùng từ cấm (lý do ghi trong tin Telegram) | Bình thường, là cơ chế bảo vệ. Hay gặp thì chỉnh `giong-van.txt` |
| Bot trả lời "Mitu đang hơi đông khách…" | Gemini hết lượt/phút hoặc lỗi | Tự hết sau 1 phút; đông khách thường xuyên thì cân nhắc bật trả phí Gemini |
| Khung chat web báo bận liên tục | Máy tắt / n8n hoặc ngrok không chạy / `MITU_CHAT_URL` sai | Mở `n8n.bat`, kiểm tra cửa sổ ngrok, kiểm tra link |
| Facebook không "Verify" được webhook | n8n/ngrok chưa chạy, sai link, sai verify token | Kiểm tra 2 cửa sổ dưới taskbar; so `FACEBOOK_VERIFY_TOKEN` |
| Messenger: chỉ admin được bot trả lời | App chưa qua App Review | Xem [5.6 bước 5](#56-cài-đặt-riêng-cho-wf1) |
| Sửa workflow trên n8n bị mất | Đã chạy `n8n.bat --nap-lai` (nạp lại ghi đè) | Chỉ dùng `--nap-lai` khi có bản workflow mới |

---

## 8. Giới hạn cần biết

- **Máy phải bật và mở n8n** thì workflow mới chạy, và chat web/Messenger mới được trả lời. Muốn chạy 24/7 không phụ thuộc máy thì phải đưa lên máy chủ (VPS hoặc n8n Cloud), có phí.
- **Gemini miễn phí khoảng 5 lượt/phút.** WF2 và WF3 dùng rất ít. WF1 tốn 1 lượt mỗi tin khách, lúc đông có thể chậm hoặc trả câu dự phòng.
- **Quyền riêng tư:** ở gói miễn phí, Google có thể dùng nội dung gửi lên để cải thiện sản phẩm. Tin nhắn của khách (kể cả SĐT) sẽ đi qua Gemini. Khi mở WF1 cho khách thật nên cân nhắc bật trả phí Gemini (chi phí rất nhỏ với lượng tin của tiệm).
- **Phiên bản n8n được khoá ở 2.49.8**, bản đã chạy thử. Bản n8n mới hơn có thể khác cách chạy (n8n đang có kế hoạch bắt buộc dùng Docker), nên đừng tự nâng cấp nếu chưa thử lại.
- `.env.local` chứa toàn bộ khoá. n8n chỉ mở trên chính máy này (`127.0.0.1`), máy khác trong mạng Wi-Fi không vào được.
- Không thu thập dữ liệu bằng cách cào Fanpage đối thủ (dễ vi phạm điều khoản Facebook). WF2 chỉ dùng kết quả tìm kiếm công khai.

---

## 9. Kết quả đã chạy thử

Chạy trên n8n 2.49.8 thật, dùng khoá Gemini của dự án và dữ liệu Firestore thật, ngày 28/11/2026. Telegram và Facebook chưa có khoá nên chỉ kiểm tra tới bước gửi.

| Thử | Kết quả |
|---|---|
| `n8n.bat` lần đầu | Nạp và bật đủ 3 workflow, n8n lên, chỉ mở trên `127.0.0.1` |
| WF2 chạy đủ luồng | Đọc file đối thủ, đọc kho Firestore, Gemini phân tích, lưu file báo cáo, 5 ý tưởng gắn đúng bánh có thật. Tavily chạy bằng khoá giả nên phần tìm kiếm báo "Chưa có thông tin" |
| WF3 luồng B (5 bài tuần) | 5 bài đúng giọng Mitu, giá khớp kho, hẹn giờ T3–T7. Đã sửa lỗi lặp hashtag và siết quy tắc "không tự thêm số người ăn, cốt bánh" |
| WF3 luồng A | Menu trên web đang là ngày 25/11 nên đúng là không đăng và soạn tin nhắc cập nhật |
| Kiểm tra tự động | Bài có "giảm giá còn 90.000đ" bị đổi sang mẫu an toàn; bài đúng giá thì giữ nguyên |
| WF1 chat web | Gợi ý đúng bánh bé gái ~200k kèm ảnh; nhớ ngữ cảnh khi khách đặt Unicorn và hỏi tiếp size, giờ lấy, SĐT; menu cũ → nói "chưa cập nhật" |
| WF1 Facebook (giả lập) | Xác minh webhook đúng; comment hỏi giá → trả lời dưới comment + nhắn riêng; bỏ qua comment của Page; chủ tiệm nhắn tay → bot im; khiếu nại → xin lỗi + tin 🚨 cho Telegram |
| Khung chat trên web | Hiện nút chat, câu gợi ý nhanh, thẻ bánh + nút Zalo; giữ lịch sử khi tải lại trang |

**Chưa kiểm tra được (cần khoá thật):** đăng/hẹn giờ thật lên Fanpage, gửi Messenger thật, nhận tin Telegram, tìm kiếm Tavily thật, ngrok.

---

## 10. Phụ lục cho người sửa kỹ thuật

- **Nguồn của 3 workflow:** `n8n/tools/build-workflows.js`. Sửa ở đây rồi chạy:
  ```powershell
  node n8n/tools/build-workflows.js
  ```
  để sinh lại `n8n/workflows/*.json`, rồi `n8n.bat --nap-lai` để nạp vào n8n (ghi đè bản trên n8n).
- **Khoá không nằm trong workflow:** mọi node đọc từ biến môi trường (`$env.GEMINI_API_KEY`, `$env.FACEBOOK_PAGE_TOKEN`…) do `n8n.bat` nạp từ `.env.local`. Vì vậy không cần tạo *Credentials* trong n8n, và file workflow commit lên git không lộ khoá. `n8n.bat` bật `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` và `NODE_FUNCTION_ALLOW_BUILTIN=fs,path` để Code node đọc được biến và file cấu hình.
- **Đọc dữ liệu:** Firestore REST công khai (`firestore.rules` cho đọc công khai `cakes`, `settings`); n8n **không ghi** gì vào Firestore.
- **Bộ nhớ tạm:**
  - Dấu "đã đăng menu ngày …" lưu ở `n8n-data/mitu-trang-thai.json`, nên giữ được cả khi bấm chạy tay.
  - Lịch sử chat, tạm dừng bot và giới hạn tin dùng *workflow static data* của WF1 (WF1 luôn chạy bằng webhook thật nên luôn được lưu).
- **Biến trong `.env.local`:**

  | Biến | Dùng ở | Bắt buộc |
  |---|---|---|
  | `GEMINI_API_KEY` | WF1, WF2, WF3 | Có |
  | `GEMINI_MODEL` / `GEMINI_MODEL_CHAT` | Đổi model (mặc định `gemini-3.6-flash`) | Không |
  | `CHE_DO_THU` | WF3: `1` chỉ gửi nháp | Không (mặc định đăng thật nếu khác `1`) |
  | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Cả 3 | Nên có |
  | `TAVILY_API_KEY` | WF2 | Có cho WF2 |
  | `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_TOKEN` | WF3, WF1 | Có cho WF3/WF1 |
  | `FACEBOOK_GRAPH_VERSION` | Phiên bản Graph API (mặc định `v23.0`) | Không |
  | `FACEBOOK_VERIFY_TOKEN` | WF1 webhook | Có cho WF1 |
  | `NGROK_DOMAIN` | WF1 (đường hầm + `WEBHOOK_URL`) | Có cho WF1 |

- **Đổi danh sách từ cấm / giờ hẹn bài tuần:** trong `build-workflows.js`, tìm `BANNED` và `SLOTS`.
- **Webhook:** `POST /webhook/mitu-chat` (chat web, trả `{reply, cakes}`), `GET|POST /webhook/mitu-facebook` (Facebook).
