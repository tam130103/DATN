# 📸 DATN Social — Mạng xã hội tích hợp AI

Mạng xã hội hiện đại lấy cảm hứng từ Instagram, được xây dựng với NestJS + React, tích hợp trí tuệ nhân tạo (AI) để kiểm duyệt nội dung, gợi ý caption, phân tích cảm xúc và trợ lý ảo.

> **Đồ án tốt nghiệp** — Đại học Mỏ - Địa chất (HUMG)

---

## ✨ Tính năng nổi bật

### 📱 Trải nghiệm người dùng
- **Giao diện hiện đại**: Responsive, hỗ trợ **Dark / Light mode**, thiết kế sạch theo phong cách Instagram.
- **Feed thông minh**: Hiển thị bài viết từ những người đang theo dõi, bài ghim ưu tiên lên đầu, auto-refresh 30 giây.
- **Khám phá (Explore)**: Tìm kiếm người dùng, hashtag, xem xu hướng thịnh hành.
- **Tagging & Mentions**: Tự động gợi ý `@username`, hiển thị tab "Bài viết được gắn thẻ" trên profile.
- **Bình luận lồng nhau (Nested Comments)**: Hệ thống bình luận đa tầng (Reply), hỗ trợ nhắc tên, tự động cuộn và làm nổi bật (highlight) bình luận từ thông báo.
- **Ghim bài viết**: Ghim 1 bài viết yêu thích lên đầu trang cá nhân & cả trên feed.
- **Lưu bài viết**: Bookmark bài viết để xem lại sau, hiển thị trong tab riêng trên profile.
- **Chỉnh sửa bài viết**: Sửa caption sau khi đăng, tự động cập nhật hashtag & mention.
- **Truy cập nhanh**: Nhấn vào bất kỳ ảnh đại diện (avatar) nào trong hệ thống để truy cập nhanh vào trang cá nhân người dùng đó.

### 💬 Giao tiếp & Thông báo
- **Realtime Chat**: Nhắn tin tức thời 1-1 với trạng thái online/offline, đánh dấu đã đọc.
- **AI Chat Assistant**: Bot trợ lý ảo tích hợp trong chat (thông qua Dify Agent), hỗ trợ hỏi đáp realtime.
- **Thông báo đa kênh**: Cập nhật thời gian thực cho lượt thích, bình luận, người theo dõi mới, lượt nhắc tên.

### 🤖 Tích hợp Trí tuệ nhân tạo (AI)
- **Kiểm duyệt nội dung (Content Moderation)**: Lọc từ ngữ cấm nhanh + gọi Gemini AI để phân tích nội dung phức tạp, tự động chặn bài viết & bình luận vi phạm.
- **Phân tích cảm xúc (Sentiment Analysis)**: Ghi nhận sentiment mỗi bài viết (positive / negative / neutral).
- **Gợi ý Caption**: Tạo mô tả bài viết từ prompt & tone (thông qua Dify Chatbot App).
- **Gợi ý Hashtag**: Đề xuất các hashtag phù hợp dựa trên nội dung bài viết (Gemini API).
- **AI Chat Assistant**: Bot trợ lý ảo (Dify Agent) có context về hệ thống, hỗ trợ người dùng.

### 🔗 Facebook Page Sync
- **Auto Import**: Tự động đồng bộ bài viết từ Facebook Page qua Graph API.
- **Webhook Realtime**: Nhận thông báo tức thì khi có bài mới / bài bị xóa trên Page.
- **Bot Account**: Tài khoản bot tự tạo, tất cả users auto-follow để thấy bài Facebook trong feed.

### 🛡️ Quản trị (Admin Panel)
- **Dashboard**: Tổng quan thống kê users, posts, comments, reports.
- **Quản lý người dùng**: Xem, tìm kiếm, thay đổi role (user/admin), chặn/mở chặn tài khoản.
- **Kiểm duyệt bài viết**: Ẩn/hiện bài viết vi phạm với lý do kiểm duyệt.
- **Kiểm duyệt bình luận**: Ẩn bình luận vi phạm.
- **Xử lý báo cáo**: Xem xét và phản hồi các report từ người dùng (spam, quấy rối, bạo lực, …).

---

## 🛠 Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Backend** | NestJS 10 (Node.js), TypeORM, PostgreSQL |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Vanilla CSS (design tokens) + Tailwind CSS (layout) |
| **Auth** | JWT (Email/Password + Google OAuth 2.0) |
| **Realtime** | Socket.IO (Chat + Notifications) |
| **AI** | Google Gemini API (moderation, hashtags, sentiment), Dify.ai (caption, chat agent) |
| **Media** | Cloudinary (upload ảnh/video) |
| **Facebook** | Graph API v19.0, Webhooks |
| **Deploy** | Fly.io (Backend), Vercel (Frontend), Supabase (PostgreSQL) |
| **Container** | Docker, Docker Compose |

---

## 📂 Cấu trúc dự án

```text
datn-social/
├── backend/                    # NestJS Server & API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── admin/          # Admin CRUD, reports, moderation
│   │   │   ├── ai/             # Gemini AI: moderation, sentiment, caption
│   │   │   ├── ai-tools/       # Dify external tool endpoints
│   │   │   ├── auth/           # JWT + Google OAuth, guards, decorators
│   │   │   ├── chat/           # Realtime messaging, Socket.IO gateway
│   │   │   ├── cloudinary/     # Media upload provider
│   │   │   ├── engagement/     # Likes, comments, saved posts
│   │   │   ├── notification/   # Notifications, Socket.IO gateway
│   │   │   ├── post/           # Posts, media, hashtags, mentions, Facebook sync
│   │   │   ├── search/         # Search users, hashtags, trending
│   │   │   └── user/           # Profiles, follows, settings
│   │   ├── migrations/         # TypeORM database migrations
│   │   ├── config/             # Data source config
│   │   └── main.ts             # Entry point
│   ├── Dockerfile
│   └── fly.toml                # Fly.io deployment config
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # AppShell, AdminShell, AuthLayout
│   │   │   ├── common/         # Avatar, ThemeToggle, ProtectedRoute
│   │   │   └── branding/       # BrandLogo
│   │   ├── pages/
│   │   │   ├── admin/          # Admin dashboard & management pages
│   │   │   ├── FeedPage.tsx    # Main feed
│   │   │   ├── ProfilePage.tsx # User profile (posts, saved, tagged)
│   │   │   ├── MessagesPage.tsx# Realtime chat
│   │   │   └── ...
│   │   ├── contexts/           # Auth, Socket, Theme providers
│   │   ├── services/           # API & socket service layers
│   │   └── types/              # TypeScript interfaces
│   ├── Dockerfile
│   └── vercel.json             # Vercel deployment config
│
├── dify/                       # Dify AI configurations
│   ├── datn-ai-agent.yml       # Chat assistant agent
│   ├── datn-caption-workflow.yml # Caption generation workflow
│   ├── datn-ai-tools.openapi.yml # External tools API spec
│   └── project_knowledge.md    # Knowledge base for AI agent
│
├── docs/                       # Tài liệu kỹ thuật
│   ├── ARCHITECTURE.md         # Kiến trúc hệ thống
│   ├── ERD.md                  # Sơ đồ quan hệ database
│   └── REALTIME_FLOW.md        # Luồng xử lý realtime
│
└── docker-compose.yml          # Local development stack
```

---

## 🚀 Cài đặt & Chạy dự án

### 1. Yêu cầu hệ thống
- **Node.js** 18+
- **PostgreSQL** 14+ (hoặc dùng Docker)
- **Docker** (tùy chọn)

### 2. Clone & Cài đặt

```bash
git clone https://github.com/tam130103/DATN.git
cd DATN

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Cấu hình biến môi trường

#### Backend (`backend/.env`)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=datn_social

# Auth
JWT_SECRET=your_jwt_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Services
GEMINI_API_KEY=your_gemini_api_key
DIFY_API_URL=https://api.dify.ai/v1
DIFY_CAPTION_CHATBOT_KEY=your_caption_chatbot_key
DIFY_GENERAL_API_KEY=your_general_dify_key
DIFY_CHATBOT_API_KEY=your_chatbot_dify_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Facebook Sync (tùy chọn)
FB_SYNC_ENABLED=false
FB_PAGE_ID=
FB_PAGE_ACCESS_TOKEN=
FB_WEBHOOK_ENABLED=false
FB_WEBHOOK_VERIFY_TOKEN=
FB_APP_SECRET=

# CORS
CORS_ORIGINS=http://localhost:5173
```

#### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Khởi chạy database (Docker)

```bash
docker compose up db -d
```

### 5. Khởi động ứng dụng

```bash
# Backend (port 3000)
cd backend && npm run start:dev

# Frontend (port 5173)
cd frontend && npm run dev
```

### 6. Chạy toàn bộ với Docker Compose

```bash
docker compose up --build
```

---

## 🗄️ API Endpoints tổng quan

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/v1/auth/login` | Đăng nhập |
| `POST` | `/api/v1/auth/google` | Đăng nhập Google OAuth |
| `GET` | `/api/v1/auth/me` | Thông tin user hiện tại |

### Posts
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/posts/feed` | Lấy feed bài viết |
| `POST` | `/api/v1/posts` | Tạo bài viết mới |
| `PATCH` | `/api/v1/posts/:id/caption` | Sửa caption |
| `PATCH` | `/api/v1/posts/:id/pin` | Ghim / bỏ ghim bài viết |
| `DELETE` | `/api/v1/posts/:id` | Xóa bài viết |
| `POST` | `/api/v1/posts/ai/generate-caption` | AI gợi ý caption |
| `POST` | `/api/v1/posts/ai/suggest-hashtags` | AI gợi ý hashtag |

### Engagement
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/posts/:id/like` | Like / unlike bài viết |
| `POST` | `/api/v1/posts/:id/comments` | Bình luận |
| `POST` | `/api/v1/posts/:id/save` | Lưu / bỏ lưu bài viết |

### Users & Social
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/users/:id` | Xem profile |
| `PATCH` | `/api/v1/users/profile` | Cập nhật profile |
| `POST` | `/api/v1/users/:id/follow` | Follow / unfollow |
| `GET` | `/api/v1/search` | Tìm kiếm users & hashtags |

### Chat
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/chat/conversations` | Danh sách hội thoại |
| `POST` | `/api/v1/chat/conversations` | Tạo hội thoại mới |
| `GET` | `/api/v1/chat/conversations/:id/messages` | Lấy tin nhắn |

### Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/admin/dashboard` | Thống kê tổng quan |
| `GET` | `/api/v1/admin/users` | Quản lý users |
| `PATCH` | `/api/v1/admin/users/:id/role` | Đổi role |
| `PATCH` | `/api/v1/admin/users/:id/status` | Chặn / mở chặn |
| `PATCH` | `/api/v1/admin/posts/:id/moderate` | Kiểm duyệt bài viết |
| `GET` | `/api/v1/admin/reports` | Xem danh sách reports |

### WebSocket Events

| Namespace | Event | Mô tả |
|-----------|-------|-------|
| `/notifications` | `notification` | Thông báo mới (like, comment, follow, mention) |
| `/notifications` | `unreadCount` | Số thông báo chưa đọc |
| `/chat` | `message` | Tin nhắn mới |
| `/chat` | `online` / `offline` | Trạng thái online |
| `/chat` | `typing` | Đang gõ |

---

## 🧪 Testing

```bash
# Unit tests (Backend)
cd backend && npm test

# E2E tests (Frontend - Playwright)
cd frontend && npx playwright test
```

---

## 🚢 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Backend API | Fly.io | `https://datn-social-api.fly.dev` |
| Frontend | Vercel | `https://datn-social.vercel.app` |
| Database | Supabase | PostgreSQL managed |

---

## 📄 Tài liệu chi tiết

- [Kiến trúc hệ thống](docs/ARCHITECTURE.md) — Sơ đồ tổng quan client-server, modules, gateways
- [Sơ đồ Database (ERD)](docs/ERD.md) — Toàn bộ bảng, quan hệ, indexes
- [Luồng xử lý Realtime](docs/REALTIME_FLOW.md) — Socket.IO chat & notification flows

---

## 👨‍💻 Tác giả

- **Nguyễn Thế Tâm** — Sinh viên Đại học Mỏ - Địa chất (HUMG)
- GitHub: [@tam130103](https://github.com/tam130103)

---

*Dự án thực hiện phục vụ Đồ án tốt nghiệp (DATN) — 2026.*
