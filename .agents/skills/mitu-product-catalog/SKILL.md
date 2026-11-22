---
name: mitu-product-catalog
description: Hướng dẫn quản lý danh mục bánh, bộ lọc tìm kiếm và khu vực sản phẩm bán chạy trên website Tiệm bánh Mitu.
---

# Quản lý Danh mục và Bộ lọc Sản phẩm Mitu

## Mục tiêu
Hướng dẫn AI tổ chức danh mục bánh, xây dựng bộ lọc và tìm kiếm giúp khách hàng nhanh chóng tìm thấy mẫu bánh ưng ý trên website.

## Quy trình thực hiện
Khi thực hiện công việc liên quan đến danh mục bánh và bộ lọc, hãy tuân thủ các bước sau:

1. **Tổ chức hệ thống phân loại bánh:**
   - Danh mục chính gồm 9 nhóm: Bánh sinh nhật, Bánh mini, Bánh hoa quả, Bánh vuông, Bánh cho nam, Bánh cho nữ, Bánh bé trai, Bánh bé gái, Bánh troll vui nhộn.
   - Nhãn phụ hỗ trợ lọc chi tiết: Đối tượng nhận bánh (`audience`), kiểu dáng bánh (`type`) và phong cách trang trí (`style`).
2. **Hiển thị danh mục trực quan:**
   - Tạo hàng ô danh mục chính có ảnh minh họa đại diện và số lượng mẫu bánh để khách bấm chọn nhanh.
   - Nhấp vào một danh mục để xem bánh thuộc nhóm đó; nhấp lại chính ô đó để quay về xem tất cả bánh.
3. **Cài đặt bộ lọc và tìm kiếm:**
   - Cho phép khách gõ từ khóa tìm kiếm (tên bánh, hương vị) có dấu hoặc không dấu.
   - Kết hợp linh hoạt giữa danh mục chính và các nhãn phụ (ví dụ: vừa chọn bánh mini, vừa chọn phong cách dễ thương).
   - Tự động cập nhật đường dẫn trên thanh địa chỉ khi chọn bộ lọc để khách có thể copy link chia sẻ cho người khác.
4. **Hiển thị lưới bánh và nút xem thêm:**
   - Mỗi thẻ bánh hiển thị ảnh rõ nét, tên bánh, giá tiền (màu đỏ cherry `--cherry: #D63A2A`, đơn vị VNĐ), nhãn danh mục và nút "Đặt bánh ngay".
   - Ban đầu hiển thị khoảng 8 bánh, có nút "Xem thêm" để mở rộng danh sách khi khách muốn xem tiếp.
   - Đánh dấu huy hiệu riêng cho bánh thuộc nhóm "Bán chạy" hoặc bánh "Có hôm nay".
5. **Khu vực Bánh bán chạy nhất:**
   - Lọc các bánh được chủ tiệm đánh dấu bán chạy để đưa lên băng chuyền nổi bật ở đầu trang, tự dừng cuộn khi khách rê chuột hoặc chạm tay vào.

## Những nguyên tắc cần tuân thủ
- **Cấu trúc dữ liệu bánh:** Mỗi bánh gồm tên, danh mục, giá, ảnh, mô tả và các nhãn phân loại. Mã nguồn không có trường kích thước (size) riêng biệt (thông tin size nếu có chỉ nằm tự do trong mô tả bánh); tuyệt đối không tự tạo trường dữ liệu mới trong cơ sở dữ liệu hay giao diện.
- **Không tự tạo thông tin bánh:** Chỉ sử dụng đúng tên, giá và nhãn có trong cơ sở dữ liệu, không tự ý bịa thêm sản phẩm hoặc đổi giá bánh.
- Khi tìm kiếm hoặc lọc không có kết quả, hiển thị thông báo lịch sự kèm nút để khách bấm quay về xem tất cả bánh.
- Thao tác lọc và tìm kiếm phải phản hồi nhanh ngay trên trang, không tải lại toàn bộ website.

## Kiểm tra kết quả
- Bấm vào từng danh mục lọc ra đúng các mẫu bánh tương ứng.
- Gõ từ khóa tìm kiếm (kể cả tiếng Việt không dấu) tìm ra đúng bánh.
- Thẻ bánh hiển thị đầy đủ ảnh, tên và giá tiền màu đỏ cherry được định dạng rõ ràng (ví dụ: 380.000đ).
