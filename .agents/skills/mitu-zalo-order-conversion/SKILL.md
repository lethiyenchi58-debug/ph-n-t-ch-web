---
name: mitu-zalo-order-conversion
description: Hướng dẫn xây dựng quy trình đặt bánh qua Zalo, hiển thị chi tiết bánh, tạo tin nhắn soạn sẵn và mở Zalo tư vấn.
---

# Quy trình Điều hướng Đặt bánh qua Zalo

## Mục tiêu
Hướng dẫn AI xây dựng luồng đặt bánh trực tiếp từ website chuyển tiếp sang Zalo Chat, không sử dụng giỏ hàng hay thanh toán trực tuyến, phù hợp với mô hình tiệm bánh handmade cần tư vấn mẫu và giờ giao bánh.

## Quy trình thực hiện
Khi thực hiện công việc liên quan đến đặt bánh và liên hệ Zalo, hãy tuân thủ các bước sau:

1. **Hiển thị cửa sổ chi tiết bánh khi khách nhấp chọn:**
   - Mở cửa sổ nhỏ (modal) hiển thị ảnh lớn, tên bánh, giá bán (màu đỏ cherry), mô tả chi tiết và khung xem trước nội dung tin nhắn đặt hàng.
   - Cho phép khách đóng cửa sổ bằng nút X, bấm vào nền mờ bên ngoài, bấm phím Escape hoặc vuốt trượt xuống trên màn hình điện thoại.
2. **Tự động soạn sẵn nội dung tin nhắn đặt bánh:**
   - Soạn nội dung tin nhắn rõ ràng, lịch sự theo mẫu:
     ```text
     ĐẶT BÁNH – TIỆM BÁNH MITU
     Bánh: [Tên bánh khách chọn]
     Giá: [Giá tiền]
     Loại: [Danh mục bánh]

     Mình muốn đặt bánh này ạ! Tiệm còn không?
     ```
   - Tin nhắn có đầy đủ tên và giá giúp chủ tiệm biết ngay chiếc bánh khách muốn đặt mà không bị nhầm lẫn.
3. **Thực hiện sao chép tin nhắn an toàn:**
   - Khi khách bấm nút "Sao chép tin nhắn", hệ thống thực hiện sao chép nội dung vào bộ nhớ tạm của máy.
   - Chỉ hiển thị thông báo "Đã sao chép" khi thao tác sao chép thực sự thành công.
   - Nếu thiết bị chặn hoặc sao chép thất bại, hiển thị thông báo hướng dẫn khách tự chọn và sao chép thủ công đoạn văn bản trong khung xem trước.
4. **Điều hướng mở Zalo chat:**
   - Khi khách bấm nút "Mở Zalo đặt bánh", hệ thống kích hoạt sao chép tin nhắn, sau đó mở đường dẫn `https://zalo.me/[số_zalo]`.
   - Bật thông báo nhắc khách: "Đang mở Zalo. Tin nhắn đã được sao chép, bạn chỉ cần dán vào khung chat và gửi".
5. **Đồng bộ thông tin liên hệ toàn website:**
   - Phân biệt rõ số hotline gọi trực tiếp (`shopPhone`) và số Zalo chat (`zaloPhone`) từ cấu hình tiệm:
     - Nút gọi điện dùng liên kết `tel:[shopPhone]`.
     - Nút Zalo dùng liên kết `https://zalo.me/[zaloPhone]`.
   - Đồng bộ thông tin này trên toàn bộ các nút bấm ở menu, banner, nút nổi góc màn hình và chân trang.

## Những nguyên tắc cần tuân thủ
- **Không có giỏ hàng hay thanh toán online:** Không thêm chức năng giỏ hàng gom nhiều bánh hay form thanh toán trực tuyến.
- **Cấu trúc thông tin bánh:** Không tự tạo thêm trường size bánh riêng biệt; thông tin bánh hiển thị đúng theo dữ liệu tên, giá, mô tả và danh mục.
- Số điện thoại Zalo trong đường link phải lọc sạch dấu cách, chỉ để lại các chữ số liền nhau.
- Không thu thập thông tin cá nhân của khách trên web; mọi trao đổi chi tiết diễn ra trong cuộc trò chuyện Zalo.

## Kiểm tra kết quả
- Bấm vào bất kỳ bánh nào trên trang đều mở được cửa sổ chi tiết với ảnh và giá chính xác.
- Bấm nút sao chép, dán thử vào ứng dụng khác ra đúng nội dung tin nhắn mẫu.
- Bấm nút mở Zalo dẫn đúng đến trang chat Zalo của tiệm trên cả máy tính lẫn điện thoại.
- Thay đổi số điện thoại trong cài đặt, toàn bộ các nút liên hệ trên trang tự động cập nhật số mới.
