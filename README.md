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
- JWT-based authentication
- Protected routes and API endpoints
- User profile management

### User System
- User profiles with avatar, bio, username
- Follow/unfollow functionality
- Follower/following counts
- Optimistic UI updates

### Posts
- Create posts with multiple media (images/videos)
- Carousel for multiple media items
- Like/unlike posts
- Comment system with nested replies
- Hashtag extraction and linking
- Cursor-based pagination for feed

### Engagement
- Real-time notifications for:
  - Likes on posts
  - Comments on posts
  - New followers
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

```
datn-social/
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── auth/              # Authentication module
│       │   ├── user/              # User module
│       │   ├── post/              # Post module
│       │   ├── follow/            # Follow module
│       │   ├── like/              # Like module
│       │   ├── comment/           # Comment module
│       │   ├── engagement/        # Engagement service
│       │   ├── notification/      # Notification module + gateway
│       │   ├── chat/              # Chat module + gateway
│       │   ├── media/             # Media module
│       │   ├── hashtag/           # Hashtag module
│       │   └── search/            # Search module
│       ├── common/
│       │   ├── guards/            # JWT guards
│       │   ├── decorators/        # Custom decorators
│       │   └── dtos/              # Shared DTOs
│       ├── main.ts                # Application entry point
│       └── app.module.ts          # Root module
│   ├── uploads/                   # Media uploads directory
│   └── .env                       # Environment variables
│
├── frontend/
│   └── src/
│       ├── components/            # React components
│       │   ├── common/            # Shared components
│       │   ├── PostCard.tsx       # Post display component
│       │   ├── CreatePost.tsx     # Post creation component
│       │   ├── NotificationBell.tsx # Notification icon
│       │   └── ...
│       ├── contexts/              # React contexts
│       │   ├── AuthContext.tsx    # Authentication state
│       │   └── SocketContext.tsx  # Socket state
│       ├── pages/                 # Page components
│       │   ├── LoginPage.tsx
│       │   ├── FeedPage.tsx
│       │   ├── ProfilePage.tsx
│       │   ├── ExplorePage.tsx
│       │   ├── HashtagPage.tsx
│       │   ├── MessagesPage.tsx
│       │   └── NotificationsPage.tsx
│       ├── services/              # API services
│       │   ├── api.ts             # Axios client
│       │   ├── auth.service.ts
│       │   ├── post.service.ts
│       │   ├── chat.service.ts
│       │   └── ...
│       ├── types/                 # TypeScript types
│       └── main.tsx               # Application entry point
│
└── docs/                          # Documentation
    ├── ARCHITECTURE.md            # System architecture
    ├── ERD.md                     # Entity relationship diagram
    └── REALTIME_FLOW.md           # Real-time communication flow
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

Create `.env` file in backend directory:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=datn_social

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/login/callback

# Server
PORT=3000
NODE_ENV=development

# Upload
UPLOAD_DIR=./uploads
```

Run database migrations (TypeORM sync):
```bash
npm run start:dev
```
The application will automatically sync the database schema on first run.

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file in frontend directory:
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 5. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5173/login/callback`
6. Copy Client ID and Client Secret to `.env` files

### 6. Run the Application

**Backend** (from `backend/` directory):
```bash
npm run start:dev
```
Backend will run on `http://localhost:3000`

**Frontend** (from `frontend/` directory):
```bash
npm run dev
```
Frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/google` - Login with Google
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:username` - Get user by username
- `PATCH /api/users/me` - Update profile
- `PATCH /api/users/me/notification-settings` - Update notification settings
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user

### Posts
- `GET /api/posts/feed` - Get feed posts (cursor pagination)
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/:id/comments` - Get post comments

### Comments
- `POST /api/comments` - Create comment
- `POST /api/comments/:id/like` - Like/unlike comment

### Chat
- `GET /api/chat/conversations` - Get user conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations/:id/messages` - Get conversation messages
- `POST /api/chat/conversations/:id/read` - Mark messages as read

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

### Search
- `GET /api/search/users?q=query` - Search users
- `GET /api/search/hashtags?q=query` - Search hashtags
- `GET /api/search/hashtags/:name/posts` - Get posts by hashtag
- `GET /api/search/trending` - Get trending hashtags

## WebSocket Events

### Notification Namespace (`/notifications`)

**Client → Server:**
- `markAsRead` - Mark notification as read
- `markAllAsRead` - Mark all notifications as read

**Server → Client:**
- `notification` - New notification received
- `unreadCount` - Updated unread count

### Chat Namespace (`/chat`)

**Client → Server:**
- `message` - Send message
- `joinConversation` - Join conversation room

**Server → Client:**
- `message` - New message received
- `online` - User came online
- `offline` - User went offline
- `typing` - User is typing
- `stopTyping` - User stopped typing

## Database Schema

See [docs/ERD.md](./docs/ERD.md) for detailed entity relationships.

Key tables:
- `users` - User accounts
- `posts` - User posts
- `media` - Post media files
- `likes` - Post likes
- `comments` - Post comments
- `follows` - User follows
- `notifications` - User notifications
- `conversations` - Chat conversations
- `conversation_members` - Conversation participants
- `messages` - Chat messages
- `hashtags` - Hashtags
- `post_hashtags` - Post-hashtag relationships

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system architecture details.

Key patterns:
- Modular architecture (feature-based modules)
- Repository pattern for data access
- Service layer for business logic
- Guards for authentication
- WebSockets for real-time features
- Optimistic UI updates

## Real-time Communication

See [docs/REALTIME_FLOW.md](./docs/REALTIME_FLOW.md) for detailed flow diagrams.

## Development Notes

### Performance Optimizations
- Database indexes on frequently queried fields
- Cursor-based pagination for efficient feed loading
- Optimistic UI updates for better UX
- Room-based WebSocket emission (targeted delivery)
- N+1 query prevention with TypeORM joins

### Security Features
- JWT authentication with access tokens
- Google OAuth 2.0 integration
- Protected routes and endpoints
- User authorization checks
- Input validation with class-validator
- SQL injection prevention via TypeORM

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Modular architecture for maintainability
- Clear separation of concerns
- Comprehensive documentation

## License

This project is developed for DATN (thesis) purposes.

## Author

DATN Social Media Platform - 2025
