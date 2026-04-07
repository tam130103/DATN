# 📸 Instagram Social (DATN Social)

Mạng xã hội hiện đại lấy cảm hứng từ Instagram, được thiết kế với kiến trúc Microservices-ready, tích hợp trí tuệ nhân tạo (AI) để tối ưu hóa trải nghiệm người dùng.

---

## ✨ Tính năng nổi bật

### 📱 Trải nghiệm người dùng
- **Giao diện hiện đại**: Thiết kế sạch sẽ, responsive hoàn toàn, tối ưu cho cả di động và máy tính.
- **Feed thông minh**: Hiển thị bài viết từ những người đang theo dõi, hỗ trợ đa phương tiện (hình ảnh, video).
- **Khám phá (Explore)**: Tìm kiếm người dùng, hashtag và theo dõi xu hướng thực tế.
- **Tagging & Mentions**: Tự động gợi ý người dùng khi gõ `@`, tích hợp hiển thị bài viết được gắn thẻ trên profile.

### 💬 Giao tiếp & Thông báo
- **Realtime Chat**: Nhắn tin tức thời với trạng thái online/offline, thông báo tin nhắn chưa đọc.
- **Thông báo đa kênh**: Cập nhật thời gian thực cho lượt thích, bình luận, người theo dõi mới và các lượt nhắc tên.

### 🤖 Tích hợp Trí tuệ nhân tạo (AI)
Dự án ứng dụng AI vào nhiều khía cạnh để nâng cao tính tương tác và an toàn:
- **AI Chat Assistant**: Trợ lý ảo được tích hợp trong hệ thống nhắn tin (thông qua Dify), cho phép người dùng trò chuyện và nhận hỗ trợ ngay lập tức.
- **Gemini AI Integration**:
  - **Kiểm duyệt nội dung**: Tự động phát hiện và cảnh báo nội dung không phù hợp.
  - **Gợi ý Caption**: Tự động tạo mô tả bài viết dựa trên từ khóa hoặc cảm xúc.
  - **Hashtag thông minh**: Gợi ý các hashtag liên quan để tăng khả năng tiếp cận bài viết.

### 🔗 Kết nối mạng xã hội
- **Facebook Sync**: Cho phép nhập trực tiếp bài viết và dữ liệu từ Facebook Page thông qua Graph API.

---

## 🛠 Công nghệ sử dụng

### Backend (NestJS)
- **Framework**: NestJS 10 (Node.js)
- **Database**: PostgreSQL với TypeORM
- **Authentication**: JWT (Hỗ trợ Email/Password & Google OAuth)
- **Realtime**: Socket.IO
- **AI Services**: Google Gemini API, Dify.ai
- **Khác**: Docker, Multer (Local storage), Facebook Graph API

### Frontend (React)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (Instagram design tokens) + Tailwind CSS (Layout)
- **State Management**: React Context API
- **Networking**: Axios, Socket.IO Client

---

## 📂 Cấu trúc thư mục

```text
datn-social/
|-- backend/          # NestJS Server & API
|   |-- src/
|   |   |-- modules/  # Auth, User, Post, Chat, AI...
|   |   `-- main.ts   # Entry point
|-- frontend/         # React SPA
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   `-- services/
|-- dify/             # AI Agent configurations
|`-- docs/             # Tài liệu thiết kế & ERD
```

---

## 🚀 Cài đặt & Chạy dự án

### 1. Chuẩn bị
- Node.js 18+
- PostgreSQL 14+
- Docker (Tùy chọn cho việc chạy các services phụ trợ)

### 2. Cài đặt
```bash
# Clone dự án
git clone https://github.com/your-repo/datn-social.git
cd datn-social

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Cấu hình
Tạo file `.env` trong cả hai thư mục `backend/` và `frontend/` dựa trên các file mẫu trong tài liệu.
- Lưu ý cấu hình: `GEMINI_API_KEY`, `DIFY_API_KEY`, `DATABASE_URL`, `JWT_SECRET`.

### 4. Khởi động
```bash
# Chạy Backend (Cổng: 3000)
cd backend && npm run start:dev

# Chạy Frontend (Cổng: 5173)
cd frontend && npm run dev
```

---

## 📄 Tài liệu chi tiết
Dự án đi kèm với bộ tài liệu thiết kế chi tiết trong thư mục `docs/`:
- [Kiến trúc hệ thống](file:///d:/Dev/DATN/datn-social/docs/ARCHITECTURE.md)
- [Sơ đồ Database (ERD)](file:///d:/Dev/DATN/datn-social/docs/ERD.md)
- [Luồng xử lý Real-time](file:///d:/Dev/DATN/datn-social/docs/REALTIME_FLOW.md)

---
*Dự án thực hiện phục vụ Đồ án tốt nghiệp (DATN).*
