---
name: mitu-admin-portal
description: Hướng dẫn xây dựng trang quản trị website Tiệm bánh Mitu, quản lý kho bánh, tải ảnh Cloudinary và sao lưu dữ liệu.
---

# Xây dựng và Quản trị Cổng Admin Mitu

## Mục tiêu
Hướng dẫn AI xây dựng và bảo trì trang quản trị nội bộ (`admin.html`), giúp chủ tiệm dễ dàng quản lý kho bánh, chọn Menu hôm nay, đăng ảnh phản hồi, chỉnh sửa thông tin tiệm và sao lưu dữ liệu an toàn.

## Quy trình thực hiện
Khi thực hiện công việc liên quan đến trang quản trị, hãy tuân thủ các bước sau:

1. **Bảo vệ trang bằng đăng nhập tài khoản:**
   - Sử dụng chức năng đăng nhập email và mật khẩu của Firebase Auth.
   - Giao diện trang quản trị sử dụng đồng bộ bảng màu vàng cam (`--marigold: #F4A81D`), nâu socola (`--cocoa: #2B170E`) và nền giấy làm việc (`--paper: #F7F2EA`).
   - Khi chưa đăng nhập: Ẩn toàn bộ nội dung quản trị, chỉ hiển thị form đăng nhập ở giữa màn hình.
   - Cung cấp chức năng đổi mật khẩu cho quản trị viên trong phần Cài đặt, yêu cầu xác thực mật khẩu cũ trước khi đổi.
2. **Quản lý kho bánh (Thêm, Sửa, Xóa):**
   - Bảng danh sách hiển thị các bánh trong kho với ảnh nhỏ, tên, giá, danh mục và nhãn bán chạy.
   - Form thêm/sửa bánh gồm: Tên bánh, giá tiền, danh mục chính, các nhãn đối tượng/kiểu dáng/phong cách, mô tả ngắn và ô tích chọn "Bán chạy nhất".
3. **Tải ảnh bánh lên dịch vụ Cloudinary:**
   - Cho phép chủ tiệm chọn ảnh từ máy tính hoặc điện thoại (nhận ảnh JPG, PNG, WebP).
   - Tự động thu nhỏ ảnh trực tiếp trên trình duyệt trước khi tải lên để tiết kiệm dung lượng và gửi nhanh hơn.
   - Tải ảnh lên dịch vụ Cloudinary theo cấu hình upload preset của tiệm, lấy đường link ảnh trả về để lưu cùng thông tin chiếc bánh vào Firestore.
4. **Quản lý Feedback và Cài đặt cửa hàng:**
   - Thêm hoặc xóa ảnh chụp màn hình nhận xét của khách kèm trích dẫn ngắn.
   - Chỉnh sửa thông tin tiệm (tên tiệm, khẩu hiệu, hotline, số Zalo, địa chỉ, liên kết mạng xã hội).
   - Cung cấp nút "Khởi tạo dữ liệu mẫu" để nạp sẵn danh sách bánh mặc định nếu cơ sở dữ liệu ban đầu đang trống.
5. **Sao lưu và khôi phục dữ liệu bằng file JSON:**
   - Chức năng sao lưu: Cho phép tải toàn bộ dữ liệu tiệm (kho bánh, menu, phản hồi, cài đặt) về máy tính thành một file `.json` để lưu trữ an toàn.
   - Chức năng khôi phục: Cho phép tải file `.json` sao lưu lên để khôi phục lại dữ liệu khi cần thiết.

## Những nguyên tắc cần tuân thủ
- **Bắt buộc có xác nhận khi thao tác nguy hiểm:** Khi chủ tiệm bấm xóa bánh, xóa toàn bộ kho hoặc khôi phục dữ liệu, bắt buộc phải hiện hộp thoại hỏi lại để tránh bấm nhầm làm mất dữ liệu.
- **Khóa nút bấm khi đang xử lý:** Khi hệ thống đang tải ảnh lên Cloudinary hoặc đang lưu dữ liệu, tạm thời vô hiệu hóa các nút bấm để tránh chủ tiệm bấm nhiều lần gây trùng lặp.
- Không lưu mật khẩu hay khóa quản trị nhạy cảm trong mã nguồn công khai.

## Kiểm tra kết quả
- Người lạ chưa đăng nhập không thể xem hoặc chỉnh sửa nội dung trang quản trị.
- Thêm một bánh mới kèm chọn ảnh từ máy tính: Ảnh tải lên Cloudinary thành công và bánh mới xuất hiện ngay trên danh sách.
- Bấm nút sao lưu dữ liệu tải về đúng file JSON chứa toàn bộ thông tin của tiệm.
