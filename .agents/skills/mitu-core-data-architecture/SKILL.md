---
name: mitu-core-data-architecture
description: Hướng dẫn quản lý dữ liệu website Tiệm bánh Mitu trên Firebase Firestore, phân quyền truy cập và duy trì dữ liệu dự phòng.
---

# Kiến trúc Dữ liệu và Tích hợp Firebase Firestore

## Mục tiêu
Hướng dẫn AI tổ chức, lưu trữ và kết nối dữ liệu giữa cơ sở dữ liệu Firebase Firestore và website Tiệm bánh Mitu, bảo đảm dữ liệu hiển thị chính xác và an toàn.

## Quy trình thực hiện
Khi thực hiện công việc liên quan đến dữ liệu hệ thống, hãy tuân thủ các bước sau:

1. **Kết nối và tổ chức dữ liệu Firestore:**
   - Kết nối Firestore qua thư viện Firebase nạp từ CDN trong file cấu hình `js/config.js` và `js/db.js`.
   - Tổ chức dữ liệu thành các nhóm riêng:
     - `cakes`: Danh sách toàn bộ bánh trong kho của tiệm.
     - `feedbacks`: Hình ảnh và lời nhận xét của khách hàng.
     - `settings/shop`: Thông tin cửa hàng (tên tiệm, slogan, địa chỉ, hotline, zalo, liên kết mạng xã hội).
     - `settings/today`: Dữ liệu Menu hôm nay gồm ngày và danh sách mã bánh.
2. **Phân quyền truy cập rõ ràng:**
   - Dữ liệu hiển thị công khai: Khách xem web có thể đọc danh sách bánh, phản hồi, thông tin tiệm và Menu hôm nay mà không cần tài khoản hay đăng nhập.
   - Dữ liệu quản trị: Các thao tác thêm, sửa, xóa bánh, đổi thông tin tiệm hay cập nhật menu bắt buộc phải đăng nhập tài khoản quản trị viên thông qua Firebase Authentication.
   - Kiểm tra tính hợp lệ khi lưu bánh: Tên bánh không để trống, giá tiền là số không âm.
3. **Cung cấp dữ liệu dự phòng:**
   - Duy trì danh sách bánh mẫu và thông tin tiệm mặc định trong file cấu hình.
   - Khi website chưa kết nối được Firestore hoặc cơ sở dữ liệu trống, tự động nạp dữ liệu mẫu để trang web vẫn hiển thị đầy đủ hình ảnh, giá cả, không bị lỗi màn hình trắng.
4. **Đồng bộ dữ liệu khi thao tác:**
   - Khi quản trị viên thêm, sửa hoặc xóa dữ liệu, gửi yêu cầu lên Firestore đồng thời cập nhật ngay vào bộ nhớ trạng thái trên trình duyệt để giao diện thay đổi tức thì.
   - Khi xóa một chiếc bánh khỏi kho, nếu bánh đó đang nằm trong Menu hôm nay thì phải tự động gỡ bánh ra khỏi menu.

## Những nguyên tắc cần tuân thủ
- **Phân biệt dữ liệu mẫu và menu hôm nay:** Dữ liệu mẫu chỉ dùng để trưng bày kho bánh dự phòng khi mất kết nối; tuyệt đối không tự ý đưa dữ liệu mẫu vào Menu hôm nay khi tiệm chưa chọn.
- **Không có giỏ hàng hay đơn hàng:** Không tạo các bảng dữ liệu lưu giỏ hàng hay trạng thái thanh toán vì website chỉ điều hướng khách đặt qua Zalo.
- Khách xem web không cần tài khoản; chỉ quản trị viên mới cần đăng nhập.

## Kiểm tra kết quả
- Website mở lên hiển thị đầy đủ bánh và thông tin tiệm ngay từ lần tải đầu tiên.
- Người dùng chưa đăng nhập không thể thực hiện các thao tác thêm, sửa hoặc xóa dữ liệu.
- Khi ngắt kết nối mạng hoặc Firestore trống, website vẫn hiển thị được các bánh mẫu từ bộ nhớ dự phòng.
