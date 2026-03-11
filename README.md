# DATN Social - Instagram-like Social Media Platform

A full-featured social media application built with NestJS (backend) and React (frontend), featuring real-time notifications, messaging, and a modern responsive UI.

## Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Database**: [PostgreSQL](https://www.postgresql.org/) - Relational database
- **ORM**: [TypeORM](https://typeorm.io/) - TypeScript ORM
- **Authentication**: JWT (JSON Web Tokens), Google OAuth 2.0
- **Real-time**: [Socket.IO](https://socket.io/) - WebSocket library
- **Validation**: class-validator
- **File Upload**: Multer (local storage)
- **Language**: TypeScript

### Frontend
- **Framework**: [React 18](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **State Management**: React Context API
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Authentication**: Google Identity Services
- **Notifications**: React Hot Toast
- **Language**: TypeScript

## Features

### Authentication
- Google OAuth 2.0 login
- Email/password login and registration
- JWT-based authentication
- Protected routes and API endpoints
- User profile management

### User System
- User profiles with avatar, bio, username
- Follow/unfollow functionality
- Follower/following counts
- Optimistic UI updates
- Notification preference toggle

### Posts
- Create posts with multiple media (images/videos)
- Like/unlike posts
- Comment system with nested replies
- Hashtag extraction and linking
- Cursor-based pagination for feed

### Engagement
- Real-time notifications for likes and comments
- Unread notification count
- Mark as read functionality
- Notification preferences (enable/disable)

### Real-time Chat
- Direct messaging between users
- Group conversations
- Online status tracking
- Real-time message delivery
- Message history
- Typing indicators

### Search & Explore
- Search users by username/name
- Search hashtags
- Trending hashtags page
- Hashtag feed page
- DB indexing for fast searches

## Project Structure

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
|   |   |-- config/
|   |   |-- migrations/
|   |   |-- app.module.ts
|   |   `-- main.ts
|   `-- .env
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- contexts/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- types/
|   |   |-- main.tsx
|   |   `-- App.tsx
|   `-- .env
`-- docs/
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- Google Cloud Console account (for OAuth)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd datn-social
```

### 2. Database Setup
Create a PostgreSQL database:
```sql
CREATE DATABASE datn_social;
```

### 3. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file in `backend/`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=datn_social

JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
API_PREFIX=api/v1
UPLOAD_DIR=./uploads
```

Start the backend:
```bash
npm run start:dev
```

The current backend config uses `synchronize: false`, so schema changes are not auto-synced at startup. Use the migration scripts when changing entities:
```bash
npm run migration:run
npm run migration:revert
```

### 4. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 5. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Identity / OAuth consent configuration as needed
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origin: `http://localhost:5173`
6. Copy Client ID and Client Secret to the environment files

### 6. Run the Application
Backend:
```bash
cd backend
npm run start:dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## API Endpoints
All HTTP endpoints are served under `/api/v1`.

### Authentication
- `POST /api/v1/auth/register` - Register with email/password
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/google` - Login with Google
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users/me` - Get current user profile
- `GET /api/v1/users/:username` - Get user by username
- `PATCH /api/v1/users/me` - Update profile
- `PATCH /api/v1/users/me/notification` - Update notification settings
- `POST /api/v1/users/:id/follow` - Follow user
- `DELETE /api/v1/users/:id/follow` - Unfollow user
- `GET /api/v1/users/:id/followers` - Get followers
- `GET /api/v1/users/:id/following` - Get following

### Posts and Engagement
- `GET /api/v1/posts/feed` - Get feed posts
- `POST /api/v1/posts` - Create post
- `GET /api/v1/posts/:id` - Get post by ID
- `DELETE /api/v1/posts/:id` - Delete post
- `POST /api/v1/posts/:id/like` - Toggle like
- `DELETE /api/v1/posts/:id/like` - Toggle unlike
- `GET /api/v1/posts/:id/comments` - Get post comments
- `POST /api/v1/posts/:id/comments` - Create comment
- `DELETE /api/v1/posts/comments/:commentId` - Delete comment

### Chat
- `POST /api/v1/conversations` - Create or find a conversation
- `GET /api/v1/conversations` - Get user conversations
- `GET /api/v1/conversations/:id/messages` - Get conversation messages
- `GET /api/v1/conversations/unread-count` - Get unread message count
- `POST /api/v1/conversations/:id/leave` - Leave conversation

### Notifications
- `GET /api/v1/notifications` - Get notifications
- `GET /api/v1/notifications/unread-count` - Get unread count
- `POST /api/v1/notifications/:id/read` - Mark one notification as read
- `POST /api/v1/notifications/read-all` - Mark all notifications as read

### Search
- `GET /api/v1/search/users?q=query` - Search users
- `GET /api/v1/search/hashtags?q=query` - Search hashtags
- `GET /api/v1/search/hashtags/:name/posts` - Get posts by hashtag
- `GET /api/v1/search/global?q=query` - Global search
- `GET /api/v1/search/trending` - Get trending hashtags

## WebSocket Namespaces
- `/chat`
- `/notifications`

## Development Notes
- Backend build currently passes with `npm run build`.
- Frontend requires Vite env typing and strict TypeScript compliance to build cleanly.
- The login UI currently links to `/forgot-password`, but that route is not implemented yet.

## License
This project is developed for DATN (thesis) purposes.
