# System Architecture

## Overview

The datn-social application follows a client-server architecture with real-time communication capabilities using WebSocket connections.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        React Frontend                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │   AuthContext│  │SocketContext │  │  Components  │               │  │
│  │  │              │  │              │  │              │               │  │
│  │  │ - User state │  │ - Socket.IO  │  │ - FeedPage   │               │  │
│  │  │ - Login      │  │ - Notif.     │  │ - ProfilePage│               │  │
│  │  │ - Logout     │  │ - Chat       │  │ - ChatPage   │               │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (REST API)
                                    │ WebSocket (Socket.IO)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SERVER LAYER                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        NestJS Application                             │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐     │  │
│  │  │                    Modules                                  │     │  │
│  │  │                                                             │     │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │     │  │
│  │  │  │   Auth   │ │   User   │ │   Post   │ │  Follow  │      │     │  │
│  │  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │      │     │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │     │  │
│  │  │                                                             │     │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │     │  │
│  │  │  │   Like   │ │ Comment  │ │   Chat   │ │  Search  │      │     │  │
│  │  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │      │     │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │     │  │
│  │  │                                                             │     │  │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │     │  │
│  │  │  │ Notification │ │   Media      │ │   Hashtag    │       │     │  │
│  │  │  │   Module     │ │   Module     │ │   Module     │       │     │  │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘       │     │  │
│  │  └─────────────────────────────────────────────────────────────┘     │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐     │  │
│  │  │                    Gateways (WebSocket)                     │     │  │
│  │  │                                                             │     │  │
│  │  │  ┌──────────────────┐    ┌──────────────────┐             │     │  │
│  │  │  │ NotificationGateway│    │  ChatGateway     │             │     │  │
│  │  │  │ - Real-time notif │    │  - Messaging     │             │     │  │
│  │  │  │ - Unread count    │    │  - Online status │             │     │  │
│  │  │  └──────────────────┘    └──────────────────┘             │     │  │
│  │  └─────────────────────────────────────────────────────────────┘     │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐     │  │
│  │  │                    Guards & Decorators                      │     │  │
│  │  │  - JwtAuthGuard      - @CurrentUser                         │     │  │
│  │  │  - GoogleAuthGuard    - @Roles                               │     │  │
│  │  └─────────────────────────────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ TypeORM (ORM)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         PostgreSQL Database                           │  │
│  │                                                                       │  │
│  │  Tables: users | posts | media | likes | comments | follows |        │  │
│  │          conversations | conversation_members | messages |            │  │
│  │          notifications | hashtags | post_hashtags                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT (JSON Web Tokens), Google OAuth 2.0
- **Real-time**: Socket.IO
- **Validation**: class-validator
- **File Upload**: Multer (local storage)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context API
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **UI Components**: Tailwind CSS
- **Authentication**: Google Identity Services

## Communication Patterns

### HTTP REST API
Standard REST endpoints for CRUD operations:
- `GET /posts` - Fetch feed posts
- `POST /posts` - Create new post
- `POST /posts/:id/like` - Like/unlike post
- `GET /users/:id` - Get user profile

### WebSocket (Socket.IO)
Real-time bidirectional communication:
- **Notification Namespace**: `/notifications`
  - Events: `notification`, `unreadCount`, `markAsRead`

- **Chat Namespace**: `/chat`
  - Events: `message`, `online`, `offline`, `typing`

## Key Design Patterns

1. **Module Structure**: Each feature (User, Post, Chat, etc.) is a separate NestJS module
2. **Repository Pattern**: TypeORM repositories for data access
3. **Service Layer**: Business logic separated from controllers
4. **Guard Pattern**: JWT-based authentication guards
5. **Decorator Pattern**: Custom decorators (`@CurrentUser`) for dependency injection
6. **Observer Pattern**: Socket.IO event emitters for real-time updates
7. **Optimistic UI**: Client updates state immediately, rolls back on error

## Security Features

1. **JWT Authentication**: Stateful auth with access tokens
2. **Google OAuth**: Third-party authentication
3. **Protected Routes**: Auth guards on all private endpoints
4. **User Authorization**: Verify ownership before allowing modifications
5. **Input Validation**: class-validator on all DTOs
6. **SQL Injection Prevention**: TypeORM parameterized queries
