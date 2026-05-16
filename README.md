# 📸 DATN Social — Mạng xã hội tích hợp AI

> **Đồ án tốt nghiệp** — Mạng xã hội hiện đại lấy cảm hứng từ Instagram, tích hợp trí tuệ nhân tạo (AI) để kiểm duyệt nội dung, gợi ý caption và trợ lý ảo.

---

## ✨ Tính năng nổi bật

### 📱 Trải nghiệm người dùng
- **Giao diện hiện đại**: Responsive, hỗ trợ **Dark / Light mode**, thiết kế Sleek phong cách Instagram.
- **Feed thông minh**: Tự động cập nhật bài viết, ưu tiên bài ghim, hỗ trợ auto-refresh.
- **Khám phá (Explore)**: Tìm kiếm người dùng, hashtag và theo dõi xu hướng thịnh hành.
- **Tương tác nâng cao**: Bình luận lồng nhau (Nested Comments), tagging `@mention`, ghim và lưu bài viết.
- **Profile cá nhân**: Quản lý bài viết cá nhân, bài được gắn thẻ và bộ sưu tập đã lưu.

### 💬 Giao tiếp & Thông báo
- **Realtime Chat**: Nhắn tin tức thời 1-1 với trạng thái online/offline.
- **AI Chat Assistant**: Bot trợ lý ảo hỗ trợ trả lời câu hỏi và tư vấn người dùng thời gian thực.
- **Hệ thống thông báo**: Cập nhật realtime cho các tương tác Like, Comment, Follow và Mention.

### 🤖 Trí tuệ nhân tạo (AI Integration)
- **Kiểm duyệt tự động**: Sử dụng Gemini AI để phát hiện và chặn nội dung vi phạm.
- **Hỗ trợ sáng tạo**: Tự động gợi ý Caption và Hashtag thông qua AI Workflow (Dify).
- **Phân tích cảm xúc**: Tự động đánh giá thái độ (Sentiment) của bài viết và bình luận.

---

## 🛠 Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Backend** | NestJS 11, TypeORM, PostgreSQL, Helmet, Throttler |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Phosphor Icons, Framer Motion |
| **Realtime** | Socket.IO (Chat & Notifications) |
| **AI Engine** | Dify.ai (Agent & Workflow) |
| **Cloud** | Cloudinary (Media) |
| **DevOps** | Docker, Docker Compose |
| **API Docs** | Swagger (OpenAPI) tại `/api/docs` |

---

## 🚀 Cài đặt & Khởi chạy (Local)

### 1. Yêu cầu hệ thống
- **Node.js** 18+
- **Docker** & **Docker Compose**

### 2. Cấu hình biến môi trường
Dự án yêu cầu các file `.env` tại 3 vị trí để hoạt động chính xác:

1.  **Thư mục gốc (`./.env`)**: Dành cho Docker Compose.
    ```env
    DB_USERNAME=postgres
    DB_PASSWORD=your_secure_password
    DB_DATABASE=datn_social
    ```
2.  **Backend (`./backend/.env`)**: Xem mẫu tại [backend/.env.example].
3.  **Frontend (`./frontend/.env`)**: Xem mẫu tại [frontend/.env.example].

### 3. Khởi chạy với Docker Compose
Đây là cách nhanh nhất để chạy toàn bộ hệ thống (DB, Backend, Frontend):

```bash
# Khởi động toàn bộ stack
docker compose up --build

# Chạy migrations (chỉ cần ở lần đầu tiên hoặc khi có thay đổi DB)
docker exec datn_backend npm run migration:run
```

---

## 📂 Cấu trúc dự án

```text
datn-social/
├── backend/            # NestJS Server & API logic
├── frontend/           # React SPA & UI Components
├── dify/               # Cấu hình AI Agent & Workflows (Dify Cloud)
├── docs/               # Tài liệu kỹ thuật chi tiết (Architecture, ERD, Flow)
├── screenshots/        # Hình ảnh minh họa tính năng
└── docker-compose.yml  # Cấu hình triển khai container (PostgreSQL + Backend + Frontend)
```

---

## 👨‍💻 Tác giả
- **Nguyễn Thế Tâm** — Sinh viên Đại học Mỏ - Địa chất (HUMG)
- GitHub: [@tam130103](https://github.com/tam130103)

---
*Dự án thực hiện phục vụ Đồ án tốt nghiệp (DATN) — 2026.*
