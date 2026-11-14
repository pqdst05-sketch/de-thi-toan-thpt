# Thư viện Toán THPT – GitHub Pages

## Có gì trong bộ mã nguồn?
- `index.html`: trang chủ gồm thư viện đề thi và liên kết Game.
- `games/index.html`: trang danh mục trò chơi.
- `games/<ten-game>/index.html`: trang chờ để thay bằng game HTML thật.
- `lop10/`, `lop11/`, `lop12/`: thư mục lưu đề HTML.
- `scripts/build_catalog.py`: quét file đề và tạo `catalog.json`.
- `.github/workflows/deploy.yml`: tự động xuất bản lên GitHub Pages.

## Cài đặt lần đầu
1. Tạo repository GitHub tên `de-thi-toan-thpt`.
2. Upload toàn bộ nội dung thư mục này lên nhánh `main`, giữ nguyên thư mục `.github`.
3. Vào Settings → Pages → Build and deployment → Source, chọn **GitHub Actions**.
4. Vào Actions, chờ workflow chạy thành công.
5. Website có địa chỉ dạng `https://TEN-TAI-KHOAN.github.io/On_tap-toan-THPT/`.

## Thêm đề thi
Đưa file HTML vào đúng thư mục, ví dụ `lop10/on-tap-hk1/`. Mỗi lần push lên `main`, workflow quét lại và cập nhật danh mục. Không sửa `index.html` hay `catalog.json`.

Tên đề lấy theo thứ tự: meta `exam-title`, thẻ `<title>`, tên file. Có thể thêm trong phần `<head>`:
```html
<meta name="exam-title" content="Đề ôn tập học kỳ 1">
<meta name="school" content="Trường THPT Rạch Kiến">
<meta name="location" content="Long An">
<meta name="school-year" content="2025–2026">
```

## Thêm game
Trang danh mục game: `/games/`.
Mỗi trò chơi có thư mục riêng. Thay `index.html` trang chờ bằng file HTML chính của game. Nếu game có CSS, JS, hình ảnh hoặc JSON đi kèm, tải tất cả vào đúng thư mục và giữ nguyên đường dẫn tương đối.

## Giới hạn
GitHub Pages chạy website tĩnh. Game chạy độc lập trên một thiết bị thường dùng được ngay. Game cần nhiều điện thoại đồng bộ câu trả lời về máy giáo viên phải kết nối thêm backend thời gian thực như Firebase hoặc Supabase. Không lưu thông tin nhạy cảm hoặc khóa bí mật trong repository công khai.
