# 📸 HUMG Social — AI-Integrated Social Network

> **Graduation Project** — A modern social network inspired by Instagram, integrated with Artificial Intelligence (AI) for content moderation, caption generation, and a virtual assistant chatbot.

---

## ✨ Key Features

### 📱 User Experience (UX/UI)
- **Modern Interface**: Responsive layout with support for **Dark / Light Mode**, following a sleek Instagram-style design.
- **Smart Feed**: Automatically updating posts, prioritising pinned posts, and supporting auto-refresh.
- **Explore Tab**: Search users, explore hashtags, and follow trending topics.
- **Advanced Engagement**: Nested comments, `@mentions`, post pinning, and post saving.
- **Personal Profile**: Manage personal posts, tagged posts, and saved collections.

### 💬 Communication & Notifications
- **Realtime Chat**: Instant 1-1 messaging with live online/offline user status indicator.
- **AI Chat Assistant**: Virtual assistant chatbot capable of answering questions and offering real-time guidance.
- **Notification System**: Realtime updates for Likes, Comments, Follows, and Mentions.

### 🤖 Artificial Intelligence (AI Integration)
- **Automated Moderation**: Uses Gemini AI to detect and block violating content (abuse, threats, etc.).
- **Creative Assistance**: Automatic Caption and Hashtag suggestions powered by AI Workflows (Dify.ai).
- **Sentiment Analysis**: Automatically evaluates the sentiment of posts and comments.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | NestJS 11, TypeORM, PostgreSQL, Helmet, Throttler |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Phosphor Icons, Framer Motion |
| **Realtime** | Socket.IO (Chat & Notifications) |
| **AI Engine** | Dify.ai (Agent & Workflow) |
| **Cloud** | Cloudinary (Media Hosting) |
| **DevOps** | Docker, Docker Compose |
| **API Docs** | Swagger (OpenAPI) available at `/api/docs` |

---

## 🚀 Installation & Local Startup

### 1. System Requirements
- **Node.js** 18+
- **Docker** & **Docker Compose**

### 2. Environment Variables Configuration
The project requires `.env` files in 3 locations to function correctly:

1. **Root Directory (`./.env`)** (for Docker Compose):
   ```env
   DB_USERNAME=postgres
   DB_PASSWORD=your_secure_password
   DB_DATABASE=datn_social
   ```
2. **Backend (`./backend/.env`)**: Refer to [backend/.env.example].
3. **Frontend (`./frontend/.env`)**: Refer to [frontend/.env.example].

### 3. Running with Docker Compose
This is the fastest way to boot up the entire stack (Database, Backend, Frontend):

```bash
# Start all containers
docker compose up --build

# Run database migrations (only needed on the first run or when database schema changes)
docker exec datn_backend npm run migration:run
```

---

## 📂 Project Structure

```text
datn-social/
├── backend/            # NestJS Server & API logic
├── frontend/           # React SPA & UI Components
├── dify/               # AI Agent & Workflows config (Dify Cloud)
├── docs/               # Detailed technical documents (Architecture, ERD, Flow)
├── screenshots/        # Feature screenshots
└── docker-compose.yml  # Container deployment config (PostgreSQL + Backend + Frontend)
```

---

## 👨‍💻 Author
- **Nguyen The Tam** — Student at Hanoi University of Mining and Geology (HUMG)
- GitHub: [@tam130103](https://github.com/tam130103)

---
*Developed as a Graduation Project — 2026.*
