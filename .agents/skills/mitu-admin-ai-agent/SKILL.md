---
name: mitu-admin-ai-agent
description: Hướng dẫn tích hợp và phát triển trợ lý AI Agent (Gemini Function Calling) trên trang Admin, tự động phân tích ảnh bánh để gợi ý thông tin và lên Menu hôm nay bằng câu lệnh.
---

# Tích hợp Trợ lý AI Agent Quản trị Tiệm bánh Mitu

## Mục tiêu
Hướng dẫn AI lập trình, tích hợp và bảo trì chức năng Trợ lý AI Agent trên trang quản trị (`admin.html`), kết nối dịch vụ Google Gemini thông qua Serverless Function (`api/admin-agent.js`). Hệ thống hỗ trợ chủ tiệm tự động hóa hai nghiệp vụ: phân tích hình ảnh bánh để gợi ý thông tin đăng kho và lập danh sách Menu hôm nay thông qua câu lệnh tiếng Việt tự nhiên.

## Quy trình thực hiện
Khi phát triển hoặc chỉnh sửa tính năng AI Agent cho trang quản trị, hãy tuân thủ các bước sau:

1. **Xây dựng Serverless Function trung gian (`api/admin-agent.js`):**
   - Triển khai hàm xử lý trên nền tảng Vercel Serverless Function (hoặc chạy thử cục bộ bằng `dev.js`), tiếp nhận yêu cầu bằng phương thức POST.
   - Nhận mã xác thực `idToken` từ phía client và kiểm tra tính hợp lệ qua Firebase Authentication (`MituDB.getIdToken()`).
   - Đối chiếu email của người dùng với danh sách quản trị viên được phép sử dụng AI (`ADMIN_EMAILS`). Nếu không khớp, từ chối xử lý để bảo vệ hạn ngạch và chi phí API.
   - Đọc khóa bí mật `GEMINI_API_KEY` từ biến môi trường của máy chủ, tuyệt đối không gửi khóa này về trình duyệt.

2. **Thiết lập cơ chế gọi công cụ (Gemini Function Calling):**
   - Sử dụng mô hình Gemini hỗ trợ Function Calling với cấu hình bắt buộc gọi công cụ (`functionCallingConfig.mode = "ANY"`), duy trì vòng lặp suy luận tối đa một số bước nhất định và bước cuối cùng luôn chốt đề xuất.
   - **Tác vụ phân tích ảnh bánh (`describe_cake`):**
     - Tiếp nhận ảnh bánh và ghi chú bổ sung của chủ tiệm (nếu có).
     - Khai báo công cụ `find_similar_cakes` để agent tra cứu các mẫu bánh tương đồng trong kho của tiệm (theo danh mục, kiểu dáng, phong cách hoặc từ khóa), lấy khoảng giá tham khảo (tối thiểu, trung vị, tối đa).
     - Khai báo công cụ chốt kết quả `propose_cake` để agent trả về: tên bánh, mô tả ngắn, danh mục chính, các nhãn phân loại, giá tiền đề xuất và lý do định giá.
   - **Tác vụ lên Menu hôm nay (`plan_menu`):**
     - Tiếp nhận câu lệnh tự nhiên của chủ tiệm kèm danh mục kho bánh và danh sách menu hiện tại.
     - Khai báo công cụ `search_cakes` để agent tìm kiếm bánh trong kho không phân biệt dấu tiếng Việt.
     - Khai báo công cụ chốt kết quả `propose_menu` để agent trả về: danh sách bánh đề xuất kèm lý do, danh sách các yêu cầu không tìm thấy (`unmatched`) và đoạn tóm tắt giải thích cho chủ tiệm.

3. **Kiểm tra và chuẩn hóa dữ liệu đề xuất phía máy chủ:**
   - **Xác thực mã bánh:** Kiểm tra mọi mã bánh trong đề xuất menu phải tồn tại thực tế trong kho; tự động loại bỏ các mã bánh không hợp lệ do mô hình tự suy đoán.
   - **Chuẩn hóa giá trị:** Đảm bảo danh mục và các nhãn phụ nằm đúng danh mục quy định của website; làm tròn giá tiền về hàng nghìn hoặc chục nghìn đồng.
   - **Xử lý ảnh không hợp lệ:** Nếu ảnh gửi lên không phải là bánh (ví dụ ảnh thú cưng, đồ vật lạ), hệ thống phản hồi cảnh báo rõ ràng để thông báo cho chủ tiệm, không điền thông tin sai lệch vào form.
   - **Bảo mật nguồn ảnh:** Chỉ chấp nhận phân tích ảnh từ các nguồn lưu trữ an toàn đã cấu hình (như Cloudinary) để ngăn chặn tấn công giả mạo yêu cầu từ máy chủ (SSRF).

4. **Xây dựng giao diện tương tác trên trang Admin (`js/admin-ai.js` và `admin.html`):**
   - **Form thêm bánh:** Bổ sung nút "Phân tích ảnh" và ô ghi chú gợi ý. Khi nhận kết quả từ AI, tự động điền các trường dữ liệu vào form, tô màu nền nổi bật các ô vừa được điền và cung cấp nút "Hoàn tác" để chủ tiệm dễ dàng khôi phục nội dung cũ.
   - **Tab Menu hôm nay:** Bổ sung khung nhập câu lệnh tự nhiên. Hiển thị kết quả đề xuất trực quan với các nhãn trạng thái (Thêm / Giữ / Bỏ), liệt kê các món không tìm thấy trong kho và nút "Áp dụng & lưu".
   - **Chủ tiệm tự chỉnh đề xuất menu:** Cuối mỗi dòng bánh có một nút bật/tắt ("✕ Bỏ" / "+ Thêm") để loại bánh AI đề xuất hoặc giữ lại bánh AI định bỏ. Dòng bị loại hiển thị mờ, gạch ngang và nhãn đổi thành "Không thêm" (bánh mới) hoặc "Bỏ" (bánh đang có trong menu). Nút "Áp dụng & lưu (N bánh)" cập nhật số bánh theo lựa chọn, chỉ lưu các bánh đang được chọn và bị vô hiệu khi không còn bánh nào.
   - **Minh bạch quá trình suy luận:** Hiển thị khu vực xem chi tiết các bước mà Agent đã thực hiện (tên công cụ đã gọi và tham số) để chủ tiệm dễ dàng theo dõi và kiểm chứng.

5. **Xử lý lỗi, hạn mức và cơ chế dự phòng (Error Handling & Fallback):**
   - **Xử lý hết hạn mức (Rate Limit):** Khi API Gemini phản hồi mã lỗi hết lượt gọi hoặc dịch vụ tạm thời bận, hệ thống đọc thời gian chờ từ máy chủ Google để tự động thử lại hoặc thông báo người dùng tạm nghỉ vài phút.
   - **Chuyển đổi mô hình dự phòng:** Cấu hình mô hình dự phòng nhẹ hơn (`gemini-3.5-flash-lite`) để tự động chuyển tiếp xử lý khi mô hình chính gặp sự cố quá tải.
   - **Xử lý sản phẩm không tìm thấy:** Khi câu lệnh của chủ tiệm nhắc đến món không có trong kho, hiển thị rõ ràng tại khu vực "Không tìm thấy trong kho", tuyệt đối không tự ý gán bừa một chiếc bánh khác.

## Những nguyên tắc cần tuân thủ
- **AI chỉ đóng vai trò đề xuất (Human-in-the-loop):** Toàn bộ chức năng của AI Agent chỉ tạo ra dữ liệu gợi ý trên giao diện, tuyệt đối không cấp quyền hoặc công cụ để AI tự động ghi, sửa hoặc xóa dữ liệu trực tiếp trong Firestore. Dữ liệu chỉ được lưu khi chủ tiệm chủ động bấm nút "Lưu bánh" hoặc "Áp dụng & lưu".
- **Bảo vệ tuyệt đối thông tin nhạy cảm:** Khóa API Gemini và các biến môi trường chỉ nằm ở phía máy chủ (`.env.local` hoặc cấu hình Vercel), không nhúng vào mã JavaScript phía client hoặc file cấu hình công khai.
- **Không suy diễn sai lệch:** Giá tiền đề xuất phải dựa trên khoảng giá thực tế của các bánh tương đồng trong kho, không định giá tùy tiện; không tự ý bịa kích thước bánh nếu không nhìn rõ trong ảnh hoặc không có ghi chú từ chủ tiệm.
- **Giới hạn phạm vi tài nguyên:** Thiết lập thời gian chờ tối đa (timeout) hợp lý cho hàm Serverless (khoảng 60 giây) và giới hạn kích thước dữ liệu gửi lên để tránh treo tiến trình.

## Kiểm tra kết quả
Để xác minh chức năng AI Agent hoạt động đúng thiết kế, cần tiến hành kiểm tra các trường hợp sau:
- **Kiểm tra phân quyền:** Gọi API khi chưa đăng nhập Firebase hoặc đăng nhập bằng email không nằm trong danh sách `ADMIN_EMAILS`, hệ thống phải từ chối truy cập.
- **Kiểm tra phân tích ảnh bánh hợp lệ:** Chọn ảnh một chiếc bánh sinh nhật hoặc bánh hoa quả kèm ghi chú tùy chọn; xác minh AI gợi ý đúng danh mục, nhãn phong cách và mức giá nằm trong khoảng giá của các bánh cùng loại trong kho.
- **Kiểm tra nhận diện ảnh không hợp lệ:** Chọn ảnh không phải bánh ngọt (ví dụ ảnh phong cảnh, động vật); xác minh hệ thống hiển thị thông báo ảnh không phù hợp và không điền bừa vào form.
- **Kiểm tra câu lệnh Menu đầy đủ:** Nhập câu lệnh yêu cầu các loại bánh có sẵn trong kho (ví dụ: bánh dâu, tiramisu và số lượng bánh mini); xác minh AI đề xuất đúng danh sách bánh tương ứng.
- **Kiểm tra câu lệnh điều chỉnh (Thêm/Bớt):** Nhập câu lệnh bổ sung hoặc lược bỏ một loại bánh khi menu hiện tại đang có dữ liệu; xác minh hệ thống giữ nguyên các món cũ và đánh dấu đúng nhãn Thêm hoặc Bỏ.
- **Kiểm tra chỉnh tay đề xuất menu:** Sau khi AI đề xuất, bấm "✕ Bỏ" ở một bánh và "+ Thêm" ở một bánh AI định bỏ; xác minh nhãn và số bánh trên nút lưu thay đổi theo, và menu lưu ra đúng với lựa chọn cuối cùng.
- **Kiểm tra món không có trong kho:** Nhập câu lệnh có chứa tên một loại bánh chưa từng có trong cơ sở dữ liệu; xác minh món đó xuất hiện trong danh sách "Không tìm thấy trong kho" và không bị gán nhầm sang bánh khác.
- **Kiểm tra cơ chế lưu an toàn:** Sau khi AI đề xuất xong, nếu không bấm nút lưu thì dữ liệu trong kho và Menu hôm nay của website phải hoàn toàn không bị thay đổi.
