# DATN Social

Mang xa hoi kieu Instagram, gom backend NestJS + frontend React, co xac thuc JWT, bai viet, binh luan, theo doi nguoi dung, chat realtime va thong bao realtime.

## 1) Cong nghe su dung

### Backend
- NestJS 10
- TypeORM + PostgreSQL
- JWT auth (email/password + Google ID token)
- Socket.IO (chat, notifications)
- class-validator
- Multer (upload anh/video cuc bo)

### Frontend
- React 18 + TypeScript
- Vite
- React Router v6
- Axios
- Socket.IO Client
- Tailwind CSS
- React Hot Toast

## 2) Cau truc thu muc

```text
datn-social/
|-- backend/
|   |-- src/
|   |   |-- modules/
|   |   |   |-- auth/
|   |   |   |-- user/
|   |   |   |-- post/
|   |   |   |-- engagement/
|   |   |   |-- notification/
|   |   |   |-- chat/
|   |   |   `-- search/
|   |   |-- migrations/
|   |   |-- config/
|   |   |-- app.module.ts
|   |   `-- main.ts
|   |-- package.json
|   `-- uploads/
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- contexts/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- types/
|   `-- package.json
`-- docs/
```

## 3) Yeu cau moi truong

- Node.js 18+
- npm 9+
- PostgreSQL 14+

## 4) Cai dat nhanh

### Buoc 1: Clone du an

```bash
git clone <repository-url>
cd datn-social
```

### Buoc 2: Cai dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Buoc 3: Tao database

```sql
CREATE DATABASE datn_social;
```

### Buoc 4: Tao bien moi truong backend

Tao file `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=datn_social

JWT_SECRET=replace_with_strong_secret
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
JWT_EXPIRATION=15m

PORT=3000
FRONTEND_URL=http://localhost:5173
API_PREFIX=api/v1
UPLOAD_DIR=uploads

# Optional
DATABASE_LOGGING=false
```

Luu y:
- `JWT_EXPIRATION` la ten bien backend dang doc.
- `synchronize=false`, vi vay can chay migration de cap nhat schema.

### Buoc 5: Tao bien moi truong frontend

Tao file `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 5) Chay du an

### Backend

```bash
cd backend
npm run migration:run
npm run start:dev
```

### Frontend

```bash
cd frontend
npm run dev
```

Sau khi chay:
- Backend: `http://localhost:3000`
- API prefix mac dinh: `http://localhost:3000/api/v1`
- Frontend: `http://localhost:5173`

## 6) Scripts quan trong

### Backend (`backend/package.json`)
- `npm run build`: build NestJS
- `npm run start`: start thuong
- `npm run start:dev`: start watch mode
- `npm run start:prod`: chay ban build dist
- `npm run migration:run`: chay migration
- `npm run migration:revert`: rollback migration gan nhat

### Frontend (`frontend/package.json`)
- `npm run dev`: chay local
- `npm run build`: kiem tra type + build Vite
- `npm run preview`: preview ban build
- `npm run lint`: chay ESLint

## 7) API hien co

Tat ca endpoint HTTP dung prefix `/api/v1`.

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/refresh`
- `GET /auth/me`

### Users
- `GET /users/me`
- `POST /users/me/avatar`
- `GET /users/:id/followers`
- `GET /users/:id/following`
- `GET /users/:username`
- `PATCH /users/me`
- `PATCH /users/me/notification`
- `POST /users/:id/follow`
- `DELETE /users/:id/follow`

### Posts + Engagement
- `POST /posts/upload`
- `POST /posts`
- `GET /posts/feed`
- `GET /posts/user/:id`
- `GET /posts/:id`
- `DELETE /posts/:id`
- `POST /posts/:id/like`
- `DELETE /posts/:id/like`
- `POST /posts/:id/comments`
- `GET /posts/:id/comments`
- `DELETE /posts/comments/:commentId`

### Chat
- `POST /conversations`
- `GET /conversations`
- `GET /conversations/:id/messages`
- `GET /conversations/unread-count`
- `POST /conversations/:id/leave`
- `POST /conversations/:id/messages`

### Notifications
- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`

### Search
- `GET /search/users?q=...`
- `GET /search/hashtags?q=...`
- `GET /search/hashtags/:name/posts`
- `GET /search/global?q=...`
- `GET /search/trending`

## 8) Realtime Socket.IO

### Namespace `/chat`
Su kien chinh:
- Client emit: `joinConversation`, `leaveConversation`, `sendMessage`, `markAsRead`, `typing`
- Server emit: `newMessage`, `conversationRead`, `userTyping`, `userOnline`, `userOffline`, `membersOnline`, `unreadCount`

### Namespace `/notifications`
Su kien chinh:
- Client emit: `markAsRead`, `markAllAsRead`
- Server emit: `notification`, `unreadCount`

## 9) Frontend routes hien co

- `/login`
- `/register`
- `/feed`
- `/profile`
- `/:username`
- `/explore`
- `/hashtag/:name`
- `/messages`
- `/messages/:conversationId`
- `/notifications`
- `/posts/:postId`

## 10) Luu y khi phat trien

- Backend dang dung `synchronize=false`, schema DB phai duoc dong bo qua migration.
- Co script `backend/reset-db.js` de reset DB local, nhung dang hardcode thong tin ket noi. Nen sua lai cho an toan truoc khi dung.
- Link "Forgot password?" tren trang login hien chua tro den route chuc nang quen mat khau.

## 11) Tai lieu bo sung

- `docs/ARCHITECTURE.md`
- `docs/ERD.md`
- `docs/REALTIME_FLOW.md`

## 12) License

Du an duoc thuc hien phuc vu DATN (do an tot nghiep).
