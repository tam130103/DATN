# Instagram Social (DATN Social)

Mạng xã hội lấy cảm hứng từ Instagram, được xây dựng với kiến trúc hiện đại, hỗ trợ các tính năng như bài viết, hashtag, mention, chat thời gian thực và thông báo thông minh.

## ✨ Tính năng nổi bật

- **Giao diện Instagram-like**: Giao diện người dùng sạch sẽ, hiện đại, hỗ trợ responsive hoàn toàn.
- **User Tagging & Mentions**: Tự động gợi ý người dùng khi gõ `@`, xử lý tag trong bài viết và hiển thị ở tab "Tagged" trên profile.
- **Realtime Chat**: Nhắn tin tức thời giữa các người dùng với trạng thái online/offline và thông báo tin nhắn chưa đọc.
- **Hệ thống Thông báo**: Thông báo thời gian thực cho lượt thích, bình luận, người theo dõi mới và tag.
- **Luồng Bài viết (Feed)**: Hiển thị bài viết từ những người đang theo dõi, hỗ trợ hình ảnh và video.
- **Khám phá (Explore)**: Tìm kiếm người dùng, hashtag và xem các hashtag đang thịnh hành.

## 🛠 Công nghệ sử dụng

### Backend (NestJS)
- **Framework**: NestJS 10
- **Database**: PostgreSQL với TypeORM
- **Authentication**: JWT (Email/Password & Google Login)
- **Realtime**: Socket.IO
- **Validation**: class-validator & class-transformer
- **Media**: Multer (Local storage)

### Frontend (React)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (Instagram design tokens) + Tailwind CSS (Layout)
- **State Management**: React Context API
- **Networking**: Axios & Socket.IO Client

## 📂 Cơ cấu dự án

```text
datn-social/
|-- backend/          # NestJS Server & API
|   |-- src/
|   |   |-- modules/  # Auth, User, Post, Chat, Notification, Search...
|   |   `-- main.ts   # Entry point
|   `-- uploads/      # Media storage
|-- frontend/         # React SPA
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   `-- services/
`-- docs/             # Tài liệu kiến trúc & ERD
```

## 🚀 Cài đặt nhanh

### 1. Chuẩn bị môi trường
- Node.js 18+
- PostgreSQL 14+

### 2. Cài đặt Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Cấu hình Biến môi trường
Tạo file `.env` trong cả hai thư mục `backend/` và `frontend/` dựa theo mẫu trong documentation.

### 4. Chạy dự án
```bash
# Chạy Backend (Cổng mặc định: 3000)
cd backend && npm run start:dev

# Chạy Frontend (Cổng mặc định: 5173)
cd frontend && npm run dev
```

## 📝 API Endpoints

Hệ thống cung cấp đầy đủ các API RESTful cho các tài nguyên:
- `/auth`: Đăng ký, đăng nhập (Local & Google), làm mới token.
- `/users`: Quản lý hồ sơ, theo dõi, tìm kiếm.
- `/posts`: Tạo, xóa, xem feed, xử lý hashtag & mention.
- `/engagement`: Like, comment.
- `/conversations`: Quản lý tin nhắn.
- `/notifications`: Quản lý thông báo.

## 📄 Tài liệu chi tiết
Xem thêm các tài liệu thiết kế tại thư mục `docs/`:
- `ARCHITECTURE.md`: Kiến trúc hệ thống.
- `ERD.md`: Sơ đồ thực thể quan hệ.

---
*Dự án được thực hiện phục vụ Đồ án tốt nghiệp (DATN).*
