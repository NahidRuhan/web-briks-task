# Mini Kanban Board

A production-ready Mini Kanban Board with real-time collaboration. Build workflows, drag-and-drop tasks, and collaborate instantly across multiple clients.

## 🚀 Live Demo
- **Frontend (Vercel):** [https://kanban-app-kohl.vercel.app](https://kanban-app-kohl.vercel.app)
- **Backend API (Render):** [https://mini-kanban-backend-klrq.onrender.com](https://mini-kanban-backend-klrq.onrender.com)
  - *Health Check:* `GET /health` (Used by UptimeRobot to prevent 15-minute server sleep)

---

## ✨ Features
- **Real-Time Collaboration:** Changes (moving tasks, creating columns, adding members) broadcast instantly to all active users via Socket.io.
- **Drag and Drop Workspace:** Smooth, interactive Kanban board powered by `@dnd-kit`, supporting reordering within columns and moving between columns.
- **Stable Ordering:** Uses fractional indexing algorithms to guarantee stable, conflict-free task order when collaborating in real-time.
- **Authentication & Security:** Secure JWT-based authentication with automatic refresh token rotation.
- **Access Control:** Boards can be securely shared with specific users; unauthorized users are strictly prevented from viewing or modifying boards.
- **Modern UI:** Built with Next.js App Router, React 19, and Tailwind CSS for a fast, responsive, and beautiful user experience.

---

## 🛠️ Architecture & Dependencies

### **Frontend** (`/frontend`)
- **Framework**: Next.js 16+ (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide React, Sonner (for toast notifications)
- **Interactions**: `@dnd-kit/core` & `@dnd-kit/sortable` (for complex drag-and-drop)
- **Real-Time**: `socket.io-client`
- **Testing**: Vitest, React Testing Library, Playwright (E2E)

### **Backend** (`/backend`)
- **Framework**: NestJS v12 (Node.js)
- **Database**: PostgreSQL (Hosted on Neon)
- **ORM**: Prisma ORM v7
- **Auth**: Passport.js with JWT Strategy (`@nestjs/jwt`)
- **Real-Time**: Socket.io via `@nestjs/websockets`
- **Validation**: `class-validator` & `class-transformer`

---

## ⚙️ Environment Variables Example

Before running locally, you must create environment files in both the frontend and backend directories.

### `backend/.env`
```env
# Database connection string (e.g. from Neon, Supabase, or local Postgres)
DATABASE_URL="postgresql://user:password@localhost:5432/kanban?schema=public"

# Authentication Secrets
JWT_SECRET="super_secret_jwt_key_example"
JWT_REFRESH_SECRET="super_secret_jwt_refresh_key_example"

# Server Configuration
BACKEND_PORT=5000
FRONTEND_URL="http://localhost:3000"
```

### `frontend/.env.local`
```env
# Points to your local or remote backend API
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

---

## 🐳 Docker Setup (Recommended)

The absolute easiest way to run the entire application locally is using Docker. You do **not** need Node.js, npm, or PostgreSQL installed on your actual machine.

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### 2. Start the App
Simply open your terminal, clone the repository, and run the Docker command:
```bash
# Clone the repository
git clone https://github.com/NahidRuhan/kanban-app.git
cd kanban-app

# Build and start the containers
docker compose up -d --build
```

That's it! 
- The **Frontend** will be available at: `http://localhost:3000`
- The **Backend API** will be available at: `http://localhost:5000`

---
🛑 **IMPORTANT NOTE ABOUT STARTUP TIME** 🛑       
The database is automatically migrated and seeded with test data for you on startup. **It takes about 10 seconds for the backend to complete its cold-boot sequence**, so wait just a moment before trying to log in!
---

**Useful Commands:**
- View live logs: `docker compose logs -f`
- Stop the app: `docker compose down`
- Reset everything: `docker compose down -v`

---

## 💻 Local Setup Instructions (Manual)

### 1. Prerequisites
- Node.js v20+
- A running PostgreSQL database (or Neon/Supabase URL)

### 2. Backend Setup
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Generate the Prisma Client
npx prisma generate

# 4. Sync Prisma schema with your database
npx prisma db push

# 5. Seed the database with demo users and boards
node seed.js

# 6. Start the backend development server
npm run start:dev
```
*The backend API will run on `http://localhost:5000` (or `3001` if configured).*

### 3. Frontend Setup
```bash
# 1. Open a new terminal and navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the frontend development server
npm run dev
```
*The frontend app will run on `http://localhost:3000`.*

---

## 🌍 Deployment Strategy

- **Frontend (Vercel):** Deployed effortlessly using Vercel's zero-config Next.js builder. Root directory is set to `frontend`.
- **Backend (Render):** Deployed as a Node Web Service using the `render.yaml` Blueprint file located in the project root. Uses `0.0.0.0` port binding and reads the dynamic `$PORT`.
- **Keep-Alive:** Because Render spins down free web services after 15 minutes of inactivity, a 3rd-party ping service (UptimeRobot) pings the `@Public()` `GET /health` endpoint every 5 minutes.

---

## 📡 API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user & receive tokens |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET`  | `/api/auth/me` | Get current user profile |

### Boards & Collaboration
| Method | Endpoint | Description |
|---|---|---|
| `GET`    | `/api/boards` | Get all boards for current user |
| `POST`   | `/api/boards` | Create a new board |
| `GET`    | `/api/boards/:id` | Get specific board with columns and tasks |
| `PATCH`  | `/api/boards/:id` | Update board title |
| `DELETE` | `/api/boards/:id` | Delete board |
| `POST`   | `/api/boards/:id/members` | Share board with a new member |
| `GET`    | `/api/boards/:id/members` | List board members |
| `DELETE` | `/api/boards/:id/members/:memberId` | Remove member access |

### Columns
| Method | Endpoint | Description |
|---|---|---|
| `POST`   | `/api/boards/:boardId/columns` | Add a column |
| `PATCH`  | `/api/columns/:id` | Update a column title |
| `PATCH`  | `/api/columns/:id/reorder` | Update column position |
| `DELETE` | `/api/columns/:id` | Delete a column |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| `POST`   | `/api/columns/:columnId/tasks` | Add a task |
| `GET`    | `/api/tasks/:id` | Get specific task details |
| `PATCH`  | `/api/tasks/:id` | Update task details |
| `PATCH`  | `/api/tasks/:id/move` | Move task between columns or reorder (fractional indexing) |
| `DELETE` | `/api/tasks/:id` | Delete a task |

---

## 🧪 Testing

### Backend
```bash
cd backend
npm run test       # Unit tests
npm run test:e2e   # End-to-End tests
```

### Frontend
```bash
cd frontend
npm run test       # Component and Integration tests (Vitest)
npx playwright test # E2E tests (Playwright)
```
