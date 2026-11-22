---
name: mitu-ui-design-system
description: Hướng dẫn thiết kế giao diện website Tiệm bánh Mitu với tông màu vàng cam, nâu socola và nền trắng kem, kiểu chữ Baloo 2, Be Vietnam Pro và Pangolin.
---

# Hệ thống Giao diện và Trải nghiệm Trực quan Mitu

## Mục tiêu
Hướng dẫn AI xây dựng và chỉnh sửa giao diện website công khai (`index.html`, `css/style.css`), mang lại cảm giác ấm áp, ngon miệng của một tiệm bánh ngọt thủ công với bộ màu thương hiệu lấy từ logo và hiển thị tối ưu trên cả máy tính lẫn điện thoại di động.

## Quy trình thực hiện
Khi thực hiện công việc liên quan đến giao diện và trải nghiệm người dùng, hãy tuân thủ các bước sau:

1. **Áp dụng bảng màu nhận diện thực tế của Mitu:**
   - Màu chủ đạo: Vàng cam ruy băng (`--marigold: #F4A81D`, `--marigold-deep: #C77C00`) dùng cho nút bấm chính, đường viền active và điểm nhấn thương hiệu.
   - Màu nền: Trắng kem sữa (`--icing: #FFFDF8`) làm nền trang chính, vàng bơ nhạt (`--butter: #FFF3D1`) làm nền các thẻ và khối phụ.
   - Màu chữ và đường nét: Nâu socola đậm (`--cocoa: #2B170E`) cho chữ chính và viền nút; nâu socola mềm (`--cocoa-soft: #6B4A39`) cho chữ phụ, mô tả; viền kẻ be (`--line: #EEDFC7`).
   - Màu điểm nhấn nổi bật: Đỏ cherry áo đầu bếp (`--cherry: #D63A2A`) dùng cho giá tiền, huy hiệu bán chạy và các dòng chữ viết tay nhấn mạnh.
   - Màu kênh liên lạc: Xanh Zalo (`--zalo: #0068FF`).
2. **Thiết lập kiểu chữ (Typography):**
   - Font tiêu đề (`--font-display`): Sử dụng `Baloo 2` với nét chữ tròn trịa, đậm, mang lại cảm giác ngọt ngào, thân thiện.
   - Font nội dung (`--font-body`): Sử dụng `Be Vietnam Pro` cho các đoạn văn bản, thông tin sản phẩm, bảo đảm hiển thị dấu tiếng Việt rõ ràng, sắc nét.
   - Font viết tay trang trí (`--font-hand`): Sử dụng `Pangolin` kết hợp vệt mũi tên vẽ tay SVG (`.section-tag`, `.hero-badge`) mô phỏng những nét ghi chú tay của thợ làm bánh.
3. **Xây dựng bố cục các khu vực chính:**
   - Phần đầu trang: Thanh thông tin hotline, logo tiệm (ảnh logo, tên tiệm, khẩu hiệu), menu điều hướng và nút nhắn Zalo.
   - Banner chính (Hero): Khung ảnh bánh lớn kèm khẩu hiệu tiệm, hỗ trợ tự động chuyển ảnh và vuốt tay trên màn hình cảm ứng.
   - Khu vực Menu hôm nay và các mẫu bánh bán chạy nhất.
   - Khu vực Danh mục bánh và thanh tìm kiếm, lọc sản phẩm.
   - Khu vực giới thiệu bánh đặt theo yêu cầu, ảnh phản hồi của khách và video TikTok của tiệm.
   - Chân trang: Địa chỉ tiệm, bản đồ, số điện thoại và liên kết mạng xã hội.
4. **Thêm các chi tiết trang trí đặc trưng của Mitu:**
   - Dùng hiệu ứng vệt kem chảy mềm mại để ngăn cách giữa các khối nội dung.
   - Băng chuyền phản hồi khách hàng chạy êm ái, nhấp vào ảnh sẽ mở cửa sổ phóng to để đọc rõ tin nhắn khen của khách.
   - Thẻ video TikTok cho phép mở xem trực tiếp video trên trang.
   - Nút Zalo tròn nổi cố định ở góc dưới màn hình giúp khách bấm nhắn tin bất kỳ lúc nào.
5. **Tối ưu hiển thị trên điện thoại di động:**
   - Bổ sung thanh điều hướng gắn cố định ở đáy màn hình điện thoại (Trang chủ, Menu hôm nay, Mẫu bánh, Đặt bánh, Gọi điện).
   - Đảm bảo các nút bấm đủ lớn để chạm ngón tay thuận tiện, chữ không bị tràn viền.

## Những nguyên tắc cần tuân thủ
- Sử dụng hoàn toàn HTML, CSS và JavaScript thuần, không nhúng các thư viện giao diện nặng bên ngoài.
- Tuân thủ đúng bảng màu vàng cam, nâu socola và đỏ cherry từ file `css/style.css`, không dùng màu hồng pastel.
- Khi ảnh bánh bị lỗi đường dẫn, tự động thay thế bằng khung ảnh mang tên tiệm, không để hiện biểu tượng ảnh vỡ.
- Đảm bảo thanh menu khi cuộn trang không che mất tiêu đề các mục bên dưới.

## Kiểm tra kết quả
- Giao diện hiển thị đúng tông màu vàng cam, nâu socola và nền trắng kem trên toàn trang web.
- Tiêu đề dùng font `Baloo 2`, nội dung dùng `Be Vietnam Pro`, các nhãn ghi chú hiển thị font viết tay `Pangolin` kèm mũi tên vẽ tay.
- Giao diện hiển thị cân đối trên cả điện thoại và máy tính; các nút bấm và thanh điều hướng đáy hoạt động mượt mà.
