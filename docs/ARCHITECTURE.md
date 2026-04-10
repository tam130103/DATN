# Kiến trúc hệ thống (System Architecture)

## Tổng quan

Ứng dụng DATN Social theo kiến trúc **Client-Server** với khả năng giao tiếp thời gian thực qua WebSocket. Backend được tổ chức theo mô hình **Module-based** của NestJS, frontend sử dụng React SPA.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                            │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Google AI   │  │   Dify.ai    │  │  Cloudinary  │              │
│  │  (Gemini)    │  │  (Workflow   │  │  (Media      │              │
│  │  Moderation  │  │   + Agent)   │  │   Storage)   │              │
│  │  Hashtags    │  │  Caption     │  └──────────────┘              │
│  │  Sentiment   │  │  Chat Bot    │                                 │
│  └──────────────┘  └──────────────┘                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐                                 │
│  │  Facebook    │  │   Google     │                                 │
│  │  Graph API   │  │   OAuth 2.0  │                                 │
│  │  (Page Sync) │  │              │                                 │
│  └──────────────┘  └──────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     React Frontend (Vite)                      │  │
│  │                                                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │ Contexts     │  │  Services    │  │     Pages            │ │  │
│  │  │              │  │              │  │                      │ │  │
│  │  │ AuthContext   │  │ api.ts       │  │ FeedPage             │ │  │
│  │  │ SocketContext │  │ post.service │  │ ProfilePage          │ │  │
│  │  │ ThemeContext  │  │ chat.service │  │ MessagesPage         │ │  │
│  │  │              │  │ chat-socket  │  │ ExplorePage          │ │  │
│  │  │              │  │ user.service │  │ NotificationsPage    │ │  │
│  │  │              │  │ admin.serv.  │  │ admin/* (Dashboard,  │ │  │
│  │  │              │  │ ...          │  │   Users, Posts, ...)  │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                    │                        │
                    │ HTTP (REST API)        │ WebSocket (Socket.IO)
                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SERVER LAYER                                │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  NestJS Application (Port 3000)                │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │                   Core Modules                           │   │  │
│  │  │                                                           │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │  │
│  │  │  │   Auth   │ │   User   │ │   Post   │ │   Chat   │   │   │  │
│  │  │  │  JWT     │ │  Profile │ │  CRUD    │ │ Messaging│   │   │  │
│  │  │  │  Google  │ │  Follow  │ │  Pin     │ │  1-on-1  │   │   │  │
│  │  │  │  Guards  │ │  Settings│ │  Edit    │ │  AI Bot  │   │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │  │
│  │  │                                                           │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │  │
│  │  │  │Engagement│ │   Search │ │Notificat.│ │Cloudinary│   │   │  │
│  │  │  │  Like    │ │  Users   │ │  Realtime│ │  Upload  │   │   │  │
│  │  │  │  Comment │ │  Hashtags│ │  Push    │ │  Images  │   │   │  │
│  │  │  │  Save    │ │  Trending│ │  History │ │  Videos  │   │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │  │
│  │  │                                                           │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │   │  │
│  │  │  │    AI    │ │ AI-Tools │ │  Admin   │                 │   │  │
│  │  │  │ Gemini   │ │ Dify API │ │Dashboard │                 │   │  │
│  │  │  │Moderation│ │ Endpoints│ │  Users   │                 │   │  │
│  │  │  │Sentiment │ │          │ │  Reports │                 │   │  │
│  │  │  │ Hashtags │ │          │ │Moderation│                 │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘                 │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │              Facebook Sync Layer                         │   │  │
│  │  │  ┌──────────────────┐    ┌──────────────────┐           │   │  │
│  │  │  │ FacebookSync     │    │ FacebookWebhook  │           │   │  │
│  │  │  │  Service         │    │  Controller      │           │   │  │
│  │  │  │ - Auto import    │    │ - Verify         │           │   │  │
│  │  │  │ - Interval sync  │    │ - Signature      │           │   │  │
│  │  │  │ - Bot management │    │ - Payload handler│           │   │  │
│  │  │  └──────────────────┘    └──────────────────┘           │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │              WebSocket Gateways                          │   │  │
│  │  │  ┌──────────────────┐    ┌──────────────────┐           │   │  │
│  │  │  │NotificationGateway│    │  ChatGateway     │           │   │  │
│  │  │  │ /notifications   │    │  /chat            │           │   │  │
│  │  │  │ - Realtime notif │    │  - Send message   │           │   │  │
│  │  │  │ - Unread count   │    │  - Online status  │           │   │  │
│  │  │  │ - Mark as read   │    │  - Typing         │           │   │  │
│  │  │  └──────────────────┘    └──────────────────┘           │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │              Guards & Decorators                         │   │  │
│  │  │  - JwtAuthGuard     - RolesGuard (admin)                 │   │  │
│  │  │  - @CurrentUser     - @Roles('admin')                    │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ TypeORM
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL (Supabase)                       │  │
│  │                                                                 │  │
│  │  Tables: users | posts | media | likes | comments | follows   │  │
│  │          conversations | conversation_members | messages       │  │
│  │          notifications | hashtags | post_hashtags              │  │
│  │          post_mentions | saved_posts | reports                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Công nghệ sử dụng

### Backend
| Công nghệ | Mục đích |
|------------|----------|
| **NestJS 10** | Framework chính (Node.js) |
| **TypeORM** | ORM cho PostgreSQL |
| **PostgreSQL 14+** | Database |
| **JWT** | Authentication (access tokens) |
| **Google OAuth 2.0** | Đăng nhập bằng Google |
| **Socket.IO** | WebSocket cho chat & notifications |
| **class-validator** | Validation DTOs |
| **Cloudinary** | Upload & lưu trữ media (ảnh, video) |
| **Google Gemini API** | AI moderation, sentiment, hashtag suggestion |
| **Dify.ai** | AI caption generation (workflow), chat assistant (agent) |
| **Facebook Graph API** | Import bài viết từ Page |
| **axios** | HTTP client cho external API calls |

### Frontend
| Công nghệ | Mục đích |
|------------|----------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **React Context API** | State management (Auth, Socket, Theme) |
| **Socket.IO Client** | Realtime chat & notifications |
| **Axios** | HTTP client |
| **Vanilla CSS** | Design tokens (colors, spacing, theming) |
| **Tailwind CSS** | Layout utilities |
| **react-hot-toast** | Toast notifications |

---

## Luồng xử lý chính

### 1. Authentication Flow
```
User → Login/Register Form → POST /auth/login → JWT Token
User → Google Sign-In → POST /auth/google → JWT Token
Token → Stored in localStorage → Attached to all API requests via Axios interceptor
```

### 2. Post Creation Flow (với AI)
```
User nhập caption + upload media
    → POST /posts (multipart)
        → Cloudinary upload → media URLs
        → AI moderation check (Gemini)
            ├─ Unsafe → 400 BadRequest (bài bị chặn)
            └─ Safe → Sentiment analysis (Gemini)
                → Save post + media + hashtags + mentions
                → Return enriched post
```

### 3. Feed Flow
```
GET /posts/feed?cursor=...
    → Lấy danh sách following + Facebook bot ID
    → Query posts WHERE userId IN followingIds
    → ORDER BY isPinned DESC, date DESC (bài ghim lên đầu)
    → Enrich: user info, media, likes, comments, saved status
    → Cursor-based pagination
```

### 4. Facebook Sync Flow
```
Server start → FacebookSyncService.onModuleInit()
    → Ensure bot user exists → Auto-follow all users to bot
    → Subscribe webhook → Sync latest posts from Page
    → Interval sync (configurable)

Webhook callback → POST /facebook/webhook
    → Verify HMAC signature
    → Extract post IDs (create/remove)
    → Import new posts / delete removed posts
```

### 5. AI Chat Flow
```
User gửi tin nhắn cho AI bot
    → ChatGateway nhận message event
    → Detect AI conversation (có difyConversationId)
    → POST /chat-messages (Dify Agent API, streaming)
    → Parse SSE chunks → Emit từng phần response
    → Save AI response as message
```

### 6. Admin Moderation Flow
```
User report bài → POST /admin/reports
Admin review → GET /admin/reports → PATCH /admin/reports/:id/review
Admin moderate → PATCH /admin/posts/:id/moderate (hide/visible)
Admin manage users → PATCH /admin/users/:id/status (block/unblock)
```

---

## Design Patterns

| Pattern | Sử dụng |
|---------|---------|
| **Module Pattern** | Mỗi feature là 1 NestJS module riêng biệt |
| **Repository Pattern** | TypeORM repositories cho data access |
| **Service Layer** | Business logic tách khỏi controllers |
| **Guard Pattern** | `JwtAuthGuard`, `RolesGuard` bảo vệ endpoints |
| **Decorator Pattern** | `@CurrentUser()`, `@Roles()` |
| **Observer Pattern** | Socket.IO event emitters cho realtime |
| **Strategy Pattern** | Auth strategies (JWT, Google) |
| **Counter Cache** | `followersCount`, `followingCount`, `hashtag.count` |
| **Cursor Pagination** | Feed & danh sách dùng cursor thay vì offset |
| **Optimistic UI** | Client cập nhật state ngay, rollback khi lỗi |

---

## Bảo mật

1. **JWT Authentication**: Stateful auth với access tokens, expired check.
2. **Google OAuth 2.0**: Xác thực qua bên thứ ba.
3. **Role-Based Access Control (RBAC)**: Guard kiểm tra role `admin` cho admin endpoints.
4. **Protected Routes**: Auth guard trên tất cả private endpoints.
5. **User Authorization**: Verify ownership trước khi cho phép sửa/xóa.
6. **Input Validation**: `class-validator` trên tất cả DTOs.
7. **SQL Injection Prevention**: TypeORM parameterized queries.
8. **AI Content Moderation**: Tự động kiểm duyệt nội dung trước khi đăng.
9. **Facebook Webhook Signature**: HMAC SHA-256 verification.
10. **Password Hashing**: Bcrypt cho local authentication.
11. **CORS**: Whitelist origins cấu hình qua env.

---

## Deployment Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   Fly.io     │     │  Supabase    │
│  (Frontend)  │────▶│  (Backend)   │────▶│ (PostgreSQL) │
│  React SPA   │     │  NestJS API  │     │  Managed DB  │
│  CDN + Edge  │     │  Docker      │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                     ┌─────┴─────┐
                     ▼           ▼
              ┌──────────┐ ┌──────────┐
              │Cloudinary│ │  Dify.ai │
              │  Media   │ │  AI APIs │
              └──────────┘ └──────────┘
```
