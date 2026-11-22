---
name: mitu-today-menu-sync
description: Hướng dẫn quản lý tính năng Menu hôm nay, khóa ngày theo giờ Việt Nam và đồng bộ bánh có sẵn từ trang Admin sang website công khai.
---

# Quản lý và Đồng bộ Menu Hôm Nay

## Mục tiêu
Hướng dẫn AI thực hiện nghiệp vụ Menu hôm nay, giúp tiệm thông báo chính xác những chiếc bánh đang có sẵn tại cửa hàng trong ngày, tránh việc khách đặt nhầm bánh của ngày hôm trước.

## Quy trình thực hiện
Khi thực hiện công việc liên quan đến Menu hôm nay, hãy tuân thủ các bước sau:

1. **Khóa ngày chuẩn theo giờ Việt Nam:**
   - Lấy ngày hiện tại dựa trên múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) để đảm bảo cả khách hàng và chủ tiệm luôn nhìn thấy cùng một ngày lịch.
2. **Kiểm tra tính hợp lệ của Menu đã lưu:**
   - So sánh ngày lưu trong hệ thống với ngày hiện tại của tiệm:
     - Nếu trùng ngày: Hiển thị các bánh chủ tiệm đã chọn cho hôm nay.
     - Nếu là ngày cũ: Coi như menu đã hết hạn, không hiển thị bánh của ngày hôm trước sang ngày hôm sau.
3. **Hiển thị Menu phía khách hàng:**
   - Hiển thị ngày hôm nay ở đầu khu vực menu để khách biết đây là danh sách mới nhất.
   - Khi đã có menu: Hiển thị lưới các bánh đang có sẵn tại tiệm.
   - Khi tiệm chưa lên menu: Hiển thị thông báo "Tiệm đang cập nhật menu hôm nay" kèm nút hướng dẫn khách nhắn tin qua Zalo để hỏi bánh có sẵn hoặc bấm cuộn xuống xem các mẫu bánh khác.
   - Gắn thêm nhãn "Có hôm nay" vào các mẫu bánh tương ứng khi khách lướt xem ở danh mục chung bên dưới.
4. **Cơ chế lưu và đồng bộ từ Admin:**
   - Trên trang Admin, hiển thị danh sách bánh trong kho kèm ô tích chọn để chủ tiệm chọn nhanh những bánh tiệm làm sẵn hôm nay.
   - Khi chủ tiệm bấm lưu, hệ thống ghi dữ liệu lên Firestore gồm ngày hiện tại và danh sách mã bánh được chọn.
   - Dữ liệu hiển thị trên website công khai khi khách tải trang hoặc làm mới trang (không khẳng định website tự cập nhật thời gian thực ngay tức khắc vì hệ thống không dùng kết nối socket liên tục).
   - Khi một bánh trong kho bị xóa, tự động gỡ bánh đó ra khỏi Menu hôm nay nếu bánh đang có tên trong danh sách.

## Những nguyên tắc cần tuân thủ
- **Menu chỉ áp dụng cho ngày hiện tại:** Tuyệt đối không để bánh của ngày hôm trước hiển thị sang ngày hôm sau.
- **Không lấy cả kho thế chỗ:** Khi tiệm chưa lên menu, chỉ hiện thông báo đang cập nhật; tuyệt đối không tự ý lấy toàn bộ bánh trong kho ra hiển thị vì menu hôm nay là danh sách bánh tiệm ĐÃ LÀM SẴN tại cửa hàng.
- Chỉ lưu danh sách mã bánh trong menu ngày để tránh sai lệch khi bánh trong kho được cập nhật lại giá hay đổi ảnh.

## Kiểm tra kết quả
- Sang ngày mới, mục Menu hôm nay tự động chuyển sang trạng thái đang cập nhật nếu chủ tiệm chưa lưu menu mới.
- Chủ tiệm chọn bánh và bấm lưu trên trang Admin, tải lại trang khách sẽ hiển thị đúng các bánh đó.
- Các bánh có trong Menu hôm nay xuất hiện thêm huy hiệu "Có hôm nay" tại mục danh mục bánh bên dưới.
