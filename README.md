# Course E-Attendance — Cloudflare Edition

Migrated from Next.js + Firebase to **React (Vite) + Hono** on **Cloudflare**.

## Architecture

```
e-attendance/
├── client/                 # React + Vite frontend (→ Cloudflare Pages)
│   ├── src/
│   │   ├── components/     # LoginScreen, LecturerDashboard, StudentDashboard, PolikuMap
│   │   ├── lib/            # Store (context), API client (fetch+normalize), geoUtils
│   │   ├── App.tsx         # Root — routes to login or dashboard by role
│   │   └── main.tsx        # Entry — AppProvider + Toaster
│   ├── vite.config.ts      # Vite + Tailwind v4 + proxy
│   └── package.json
├── server/                 # Hono API (→ Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts        # Main Hono app with CORS + storage + route mounts
│   │   ├── routes/         # auth, courses, sessions, records, alerts
│   │   ├── db/schema.sql   # D1 schema (6 tables)
│   │   └── middleware/     # JWT auth (jose) + role-based guard
│   ├── wrangler.jsonc      # D1 + KV + R2 bindings
│   └── package.json
└── README.md
```

## Cloudflare Services

- **Pages** — Static React frontend
- **Workers** — Hono API runtime
- **D1** (`DB`) — SQLite — users, courses, sessions, records, alerts
- **KV** (`KV`) — Session cache, auth tokens
- **R2** (`STORAGE`) — Evidence files (MC, letters)

## Quick Start

```bash
# 1. Install
cd client && npm install
cd ../server && npm install

# 2. Create Cloudflare resources
cd server
npx wrangler d1 create e-attendance-db
npx wrangler d1 execute e-attendance-db --file=./src/db/schema.sql
npx wrangler kv:namespace create e-attendance-kv
npx wrangler r2 bucket create e-attendance-storage

# 3. Update wrangler.jsonc with returned IDs

# 4. Dev
cd server && npx wrangler dev   # API on :8787
cd client && npm run dev        # UI on :3000

# 5. Deploy
cd server && npx wrangler deploy
cd client && npm run build && npx wrangler pages deploy dist
```

## API Routes

- `POST /api/auth/login` — Login or register (Public)
- `GET /api/auth/me` — Current user (Auth)
- `GET /api/courses` — List courses (Auth)
- `POST /api/courses` — Create course (Lecturer)
- `POST /api/courses/:id/enroll` — Enroll student (Student)
- `POST /api/courses/scan-qr` — QR code enrollment (Student)
- `GET /api/sessions` — List sessions (Auth)
- `POST /api/sessions` — Create session (Lecturer)
- `POST /api/sessions/:id/checkin` — Student check-in (Student)
- `POST /api/sessions/:id/complete` — Complete session (Lecturer)
- `GET /api/records` — List records (Auth)
- `PUT /api/records/:id` — Approve or reject appeal (Lecturer)
- `GET /api/alerts` — List alerts (Auth)
- `POST /api/alerts` — Create alert (Lecturer)
- `POST /api/alerts/send-bulk` — Bulk attendance warnings (Lecturer)
- `PUT /api/storage/upload/:key` — Upload file to R2 (Auth)
- `GET /api/storage/download/:key` — Download file from R2 (Auth)
