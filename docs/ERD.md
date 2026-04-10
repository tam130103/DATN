# Entity Relationship Diagram (ERD)

## Tổng quan Database

Hệ thống sử dụng **PostgreSQL** với **TypeORM** để quản lý toàn bộ dữ liệu. Dưới đây là sơ đồ quan hệ đầy đủ giữa các bảng.

---

## Sơ đồ quan hệ

```
┌──────────────────────────────────────────────────────────────────────┐
│                              USERS                                    │
├──────────────────────────────────────────────────────────────────────┤
│ id                │ uuid         │ PK                                │
│ email             │ varchar      │ UNIQUE, NOT NULL                   │
│ username          │ varchar      │ UNIQUE, NULLABLE, INDEXED          │
│ name              │ varchar      │ NULLABLE                           │
│ password          │ varchar      │ NULLABLE (OAuth users)             │
│ googleId          │ varchar      │ UNIQUE, NULLABLE                   │
│ avatarUrl         │ varchar      │ NULLABLE                           │
│ bio               │ text         │ NULLABLE                           │
│ provider          │ enum         │ 'local' | 'google'                 │
│ role              │ enum         │ 'user' | 'admin' | 'system'       │
│ status            │ enum         │ 'active' | 'blocked'               │
│ blockedReason     │ text         │ NULLABLE                           │
│ blockedAt         │ timestamptz  │ NULLABLE                           │
│ followersCount    │ int          │ DEFAULT 0                          │
│ followingCount    │ int          │ DEFAULT 0                          │
│ notificationEnabled │ boolean    │ DEFAULT true                       │
│ createdAt         │ timestamptz  │ AUTO                               │
│ updatedAt         │ timestamptz  │ AUTO                               │
└──────────────────────────────────────────────────────────────────────┘
         │
         │ has many
         ├──────────────────────────────────────────────┐
         │                    │                          │
         ▼                    ▼                          ▼
┌─────────────────┐  ┌─────────────────┐     ┌──────────────────┐
│     POSTS       │  │    FOLLOWS      │     │  NOTIFICATIONS   │
├─────────────────┤  ├─────────────────┤     ├──────────────────┤
│ id         (PK) │  │ id         (PK) │     │ id          (PK) │
│ userId     (FK) │  │ followerId (FK) │     │ recipientId (FK) │
│ caption         │  │ followingId(FK) │     │ senderId    (FK) │
│ source          │  │ createdAt       │     │ type             │
│ sourceId        │  └─────────────────┘     │ data      (JSON) │
│ sourceCreatedAt │                           │ isRead           │
│ status          │                           │ createdAt        │
│ isPinned        │                           └──────────────────┘
│ isEdited        │
│ moderationReason│
│ moderatedBy(FK) │
│ moderatedAt     │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
         │
         │ has many
         ├────────────────┬────────────────┬────────────────┐
         ▼                ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    MEDIA     │ │POST_HASHTAGS │ │POST_MENTIONS │ │  SAVED_POSTS │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│ id      (PK) │ │ id      (PK) │ │ id      (PK) │ │ id      (PK) │
│ postId  (FK) │ │ postId  (FK) │ │ postId  (FK) │ │ postId  (FK) │
│ url          │ │ hashtagId(FK)│ │ userId  (FK) │ │ userId  (FK) │
│ type         │ └──────────────┘ │ createdAt    │ │ createdAt    │
│ orderIndex   │        │         └──────────────┘ └──────────────┘
└──────────────┘        ▼
                ┌──────────────┐
                │  HASHTAGS    │
                ├──────────────┤
                │ id      (PK) │
                │ name  (UNIQ) │
                │ count        │
                │ createdAt    │
                └──────────────┘

┌──────────────┐  ┌──────────────┐
│    LIKES     │  │   COMMENTS   │
├──────────────┤  ├──────────────┤
│ id      (PK) │  │ id      (PK) │
│ postId  (FK) │  │ postId  (FK) │
│ userId  (FK) │  │ userId  (FK) │
│ createdAt    │  │ parentId(FK) │
└──────────────┘  │ content      │
                  │ status       │
                  │ createdAt    │
                  │ updatedAt    │
                  └──────────────┘

┌───────────────────┐
│   CONVERSATIONS   │
├───────────────────┤
│ id           (PK) │
│ isGroup           │
│ name              │
│ difyConversationId│
│ createdAt         │
│ updatedAt         │
└───────────────────┘
         │
         │ has many
         ├──────────────────────┐
         ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│  CONV_MEMBERS    │  │    MESSAGES      │
├──────────────────┤  ├──────────────────┤
│ id          (PK) │  │ id          (PK) │
│ conversationId   │  │ conversationId   │
│   (FK)           │  │   (FK)           │
│ userId      (FK) │  │ senderId    (FK) │
│ hasLeft          │  │ content          │
│ joinedAt         │  │ mediaUrl         │
│ lastReadAt       │  │ isRead           │
└──────────────────┘  │ createdAt        │
                      └──────────────────┘

┌──────────────────┐
│    REPORTS       │
├──────────────────┤
│ id          (PK) │
│ reporterId  (FK) │
│ postId      (FK) │
│ reason           │
│ description      │
│ status           │
│ reviewedBy  (FK) │
│ reviewNote       │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

---

## Chi tiết từng bảng

### Users
Lưu trữ thông tin tài khoản người dùng, bao gồm xác thực, profile, và trạng thái admin.

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | Auto-generated |
| `email` | varchar | UNIQUE, NOT NULL | |
| `username` | varchar | UNIQUE, NULLABLE | Tự chọn sau khi đăng ký |
| `name` | varchar | NULLABLE | Tên hiển thị |
| `password` | varchar | NULLABLE | NULL nếu dùng Google OAuth |
| `googleId` | varchar | UNIQUE, NULLABLE | Google OAuth ID |
| `avatarUrl` | varchar | NULLABLE | URL ảnh đại diện |
| `bio` | text | NULLABLE | Tiểu sử |
| `provider` | enum | DEFAULT 'local' | `local` / `google` |
| `role` | enum | DEFAULT 'user' | `user` / `admin` / `system` |
| `status` | enum | DEFAULT 'active' | `active` / `blocked` |
| `blockedReason` | text | NULLABLE | Lý do bị chặn |
| `blockedAt` | timestamptz | NULLABLE | Thời điểm bị chặn |
| `followersCount` | int | DEFAULT 0 | Counter cache |
| `followingCount` | int | DEFAULT 0 | Counter cache |
| `notificationEnabled` | boolean | DEFAULT true | Bật/tắt thông báo |

### Posts
Bài viết, hỗ trợ cả bài gốc và bài import từ Facebook.

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `userId` | uuid | FK → users, INDEXED | |
| `caption` | text | NOT NULL | Nội dung bài viết |
| `source` | varchar(50) | NULLABLE | `null` (gốc) hoặc `'facebook'` |
| `sourceId` | varchar(100) | NULLABLE | ID bài viết gốc trên Facebook |
| `sourceCreatedAt` | timestamptz | NULLABLE | Ngày đăng gốc trên source |
| `status` | enum | DEFAULT 'visible' | `visible` / `hidden` / `deleted` |
| `isPinned` | boolean | DEFAULT false | Ghim bài viết |
| `isEdited` | boolean | DEFAULT false | Đã chỉnh sửa |
| `moderationReason` | text | NULLABLE | Lý do kiểm duyệt (admin) |
| `moderatedBy` | uuid | FK → users, NULLABLE | Admin kiểm duyệt |
| `moderatedAt` | timestamptz | NULLABLE | Thời điểm kiểm duyệt |

**Unique Index**: `(userId, source, sourceId)` — tránh import trùng Facebook post.

### Media
File đính kèm cho bài viết (ảnh, video).

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `postId` | uuid | FK → posts | |
| `url` | varchar | NOT NULL | URL Cloudinary |
| `type` | enum | NOT NULL | `IMAGE` / `VIDEO` |
| `orderIndex` | int | DEFAULT 0 | Thứ tự hiển thị |

### Hashtags
Danh sách hashtag toàn hệ thống.

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `name` | varchar | UNIQUE | Tên hashtag (lowercase) |
| `count` | int | DEFAULT 0 | Số bài viết chứa hashtag |

### Post Hashtags
Bảng trung gian Many-to-Many giữa Posts ↔ Hashtags.

### Post Mentions
Tag/mention người dùng trong bài viết.

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `postId` | uuid | FK → posts | |
| `userId` | uuid | FK → users | Người được mention |

### Likes

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `postId` | uuid | FK → posts | |
| `userId` | uuid | FK → users | |

**Unique Constraint**: `(postId, userId)` — mỗi user chỉ like 1 lần.

### Comments

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `postId` | uuid | FK → posts | |
| `userId` | uuid | FK → users | |
| `parentId` | uuid | FK → comments, NULLABLE | Reply (self-referential) |
| `content` | text | NOT NULL | |
| `status` | enum | DEFAULT 'visible' | `visible` / `hidden` |

### Saved Posts
Bài viết đã lưu (bookmark).

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `postId` | uuid | FK → posts | |
| `userId` | uuid | FK → users | |

**Unique Constraint**: `(postId, userId)`.

### Follows

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `followerId` | uuid | FK → users | Người follow |
| `followingId` | uuid | FK → users | Người được follow |

**Unique Constraint**: `(followerId, followingId)`.

### Notifications

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `recipientId` | uuid | FK → users | Người nhận |
| `senderId` | uuid | FK → users | Người gửi |
| `type` | varchar | NOT NULL | `LIKE` / `COMMENT` / `FOLLOW` / `MENTION` |
| `data` | jsonb | NULLABLE | Metadata bổ sung |
| `isRead` | boolean | DEFAULT false | |

### Conversations

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `isGroup` | boolean | DEFAULT false | |
| `name` | varchar | NULLABLE | Tên nhóm |
| `difyConversationId` | varchar | NULLABLE | ID conversation bên Dify (AI chat) |

### Conversation Members

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `conversationId` | uuid | FK → conversations | |
| `userId` | uuid | FK → users | |
| `hasLeft` | boolean | DEFAULT false | Đã rời nhóm |

**Unique Constraint**: `(conversationId, userId)`.

### Messages

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `conversationId` | uuid | FK → conversations | |
| `senderId` | uuid | FK → users | |
| `content` | text | | |
| `mediaUrl` | varchar | NULLABLE | Ảnh/video đính kèm |
| `isRead` | boolean | DEFAULT false | |

### Reports
Báo cáo vi phạm từ người dùng.

| Column | Type | Constraints | Ghi chú |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `reporterId` | uuid | FK → users | Người báo cáo |
| `postId` | uuid | FK → posts | Bài viết bị báo cáo |
| `reason` | varchar | NOT NULL | Loại vi phạm |
| `description` | text | NULLABLE | Mô tả chi tiết |
| `status` | enum | DEFAULT 'pending' | `pending` / `reviewed` / `dismissed` |
| `reviewedBy` | uuid | FK → users, NULLABLE | Admin xử lý |
| `reviewNote` | text | NULLABLE | Ghi chú xử lý |

---

## Quan hệ giữa các bảng

| Từ | Đến | Loại quan hệ |
|----|-----|--------------|
| Users | Posts | One-to-Many |
| Users | Comments | One-to-Many |
| Users | Likes | One-to-Many |
| Users | Follows | Self Many-to-Many |
| Users | Notifications (sender) | One-to-Many |
| Users | Notifications (recipient) | One-to-Many |
| Users | Conversation Members | One-to-Many |
| Users | Messages | One-to-Many |
| Users | Saved Posts | One-to-Many |
| Users | Post Mentions | One-to-Many |
| Users | Reports (reporter) | One-to-Many |
| Posts | Media | One-to-Many |
| Posts | Likes | One-to-Many |
| Posts | Comments | One-to-Many |
| Posts | Hashtags | Many-to-Many (qua Post Hashtags) |
| Posts | Post Mentions | One-to-Many |
| Posts | Saved Posts | One-to-Many |
| Posts | Reports | One-to-Many |
| Comments | Comments | Self-Referential (replies) |
| Conversations | Conv Members | One-to-Many |
| Conversations | Messages | One-to-Many |

---

## Indexes

```sql
-- Users
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_google_id ON users("googleId");

-- Posts
CREATE INDEX idx_posts_user_id ON posts("userId");
CREATE INDEX idx_posts_user_created ON posts("userId", "createdAt");
CREATE UNIQUE INDEX idx_posts_source ON posts("userId", source, "sourceId");

-- Likes
CREATE UNIQUE INDEX idx_likes_post_user ON likes("postId", "userId");

-- Comments
CREATE INDEX idx_comments_post_id ON comments("postId");
CREATE INDEX idx_comments_parent_id ON comments("parentId");

-- Follows
CREATE UNIQUE INDEX idx_follows_pair ON follows("followerId", "followingId");

-- Saved Posts
CREATE UNIQUE INDEX idx_saved_posts_pair ON saved_posts("postId", "userId");

-- Hashtags
CREATE UNIQUE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_post_hashtags_post ON post_hashtags("postId");

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications("recipientId");
CREATE INDEX idx_notifications_read ON notifications("isRead");

-- Messages
CREATE INDEX idx_messages_conversation ON messages("conversationId");
CREATE INDEX idx_messages_created ON messages("createdAt" DESC);

-- Conversation Members
CREATE UNIQUE INDEX idx_conv_members ON conversation_members("conversationId", "userId");

-- Reports
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_post ON reports("postId");
```

---

## Chiến lược Data Integrity

1. **Foreign Keys**: Tất cả quan hệ enforce bằng FK constraints.
2. **Unique Constraints**: Ngăn dữ liệu trùng lặp (likes, follows, saved posts).
3. **Enum Types**: Đảm bảo giá trị hợp lệ cho status, role, type.
4. **Counter Cache**: `followersCount`, `followingCount`, `hashtag.count` được cập nhật đồng bộ khi thay đổi.
5. **Soft Delete**: Bài viết và bình luận sử dụng `status` thay vì xóa cứng.
6. **Parameterized Queries**: TypeORM luôn sử dụng prepared statements, ngăn SQL injection.
