# taugether

**taugether** is the community platform for the students of **Türkiye–Azerbaijan University (TAU)**.
It brings the whole student community together: share study notes, discuss exams and classes, ask
questions, find classmates before the year starts, join student clubs, and follow official
university news — all in one place.

- **Backend:** Go (chi router + pgx / pgxpool)
- **Database:** PostgreSQL
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Colors:** TAU red (`#DC2626`) and white
- **Domain:** https://taugether.org

---

## ✨ Features

### Accounts
- Sign up with **username, e-mail and password**
- **Strong password enforcement** — minimum 8 characters, must contain an uppercase letter,
  a lowercase letter, a digit and a special character (with a live strength meter in the UI)
- Secure **bcrypt password hashing** and **JWT authentication** (short-lived access token +
  rotating refresh token)
- Change username, profile picture, year role and password from Settings
- **5 preset profile pictures** + a default avatar showing the first letter of the username
  on a red background
- **Terms of Service and Privacy Policy** — signing up requires ticking both agreement
  checkboxes (enforced in the API too), and the full documents live at `/terms` and `/privacy`

### Posts
- Share posts with **one tag**: `Exam`, `Study`, `University` or `Question`
- Attach **images (max 2 MB each)** and **files (no size limit)** to any post
- Click an image to view it full size; click a file to download it
- **Like** posts (like count shown) and **save/bookmark** posts for later
- **Report** posts — reports are only visible to admins
- Edit or delete your own posts (edited posts are marked)
- **Full-text search** across titles and content, filterable by tag

### Comments
- Nested comments, **up to 4 levels deep**
- Reply to comments, delete your own comments
- **Notifications** when someone comments on your post or replies to your comment

### Roles & Clubs
- **Discord-style role system** with colors chosen by admins
- **One year role** per student: Prep, 1st–4th Year, Graduate (selected at signup, changeable later)
- **Unlimited club roles** — join Football, Tennis, Books and any club the admin creates
- Clubs are selected at signup or added later from Settings
- Browse clubs, see member lists and join/leave any club

### Profiles
- Public profile pages showing **username, year role, club roles and recent posts**
- See other students' roles at a glance

### News
- Dedicated **News section** — only admins can publish news
- News looks like posts but appears only in the News tab

### Admin Panel
- **Admins are granted from the database** (see setup below)
- Manage **roles**: create, rename, delete and pick colors
- Manage **clubs**: create, edit, delete (a matching club role is created automatically)
- Manage **post tags**: add, rename, delete
- Manage **posts by ID** — post IDs are shown to admins on every post
- View **reported posts** and delete them or resolve the report
- Publish **university news**

### SEO
- Semantic HTML, meta description, Open Graph and Twitter cards
- `robots.txt` and `sitemap.xml` for taugether.org
- Canonical URLs and per-page `react-helmet-async` titles/descriptions

### Performance & Security
- **pgx connection pooling** tuned for many concurrent requests
- Indexed tables, partial indexes and **GIN full-text search**
- **Rate limiting** on auth endpoints and post creation
- CORS restricted to the configured frontend origin
- Upload validation (image size limit, allowed extensions, randomized filenames)
- bcrypt password hashing, JWT claim validation, refresh-token rotation
- No raw string concatenation in SQL — all queries are parameterized (SQL-injection safe)

---

## 📦 Project structure

```
taugether/
├── schema.sql                  # PostgreSQL schema + seed data (run first)
├── README.md
├── backend/                    # Go API
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/             # .env configuration
│   │   ├── database/           # pgx pool + all queries
│   │   ├── handler/            # HTTP handlers
│   │   ├── middleware/         # auth, admin, CORS, rate limit
│   │   ├── models/             # shared structs
│   │   └── router/             # route definitions
│   ├── uploads/                # uploaded images & files
│   └── .env                    # backend secrets (fill in)
└── frontend/                   # React + TypeScript + Tailwind
    ├── public/                 # favicon, robots.txt, sitemap.xml
    ├── src/
    │   ├── api/client.ts       # axios client + all API calls
    │   ├── components/         # UI, layout, post, admin components
    │   ├── context/            # AuthContext
    │   ├── pages/              # all routes
    │   ├── types/              # TypeScript types
    │   └── utils/              # helpers (avatars, formatting)
    └── .env                    # frontend config (fill in)
```

---

## 🚀 Getting started

### 1. Create the database

```bash
createdb taugether
psql -U postgres -d taugether -f schema.sql
```

### 2. Configure the backend

Copy `backend/.env` and fill it in:

```env
PORT=8080
DATABASE_URL=postgres://USERNAME:PASSWORD@localhost:5432/taugether
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<long random string>
JWT_ACCESS_EXPIRY_MIN=15
JWT_REFRESH_EXPIRY_DAYS=7
UPLOAD_DIR=./uploads
CORS_ORIGIN=http://localhost:5173
```

Generate secrets with: `openssl rand -hex 64`

### 3. Run the backend

```bash
cd backend
go mod download
go run ./cmd/server
```

### 4. Configure the frontend

Copy `frontend/.env` and fill it in (leave `VITE_API_URL` empty in development —
Vite proxies `/api` to `localhost:8080` automatically).

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 6. Build for production

```bash
cd frontend && npm run build   # outputs to frontend/dist
```

---

## 🛠 Making a user an admin

Admin rights are granted directly in the database. As the admin you run:

```sql
UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
```

That user can now open the **Admin panel** from the user menu.

---

## 📋 Migrations

If you created your database with an earlier version of `schema.sql`, run this to add the
terms-acceptance column used by the signup flow:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
```

---

## 🔌 API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Create account |
| POST | `/api/v1/auth/login` | Log in |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Log out |
| GET  | `/api/v1/me` | Current user |
| PUT  | `/api/v1/me` | Update username / picture |
| PUT  | `/api/v1/me/year-role` | Change year role |
| PUT  | `/api/v1/me/password` | Change password |
| GET  | `/api/v1/users/:username` | Public profile |
| GET  | `/api/v1/users/:username/posts` | A user's posts |
| GET  | `/api/v1/posts` | List posts (`?tag=&q=&offset=&limit=`) |
| GET  | `/api/v1/posts/:id` | Post detail |
| POST | `/api/v1/posts` | Create post (JSON or multipart) |
| PUT  | `/api/v1/posts/:id` | Edit post |
| DELETE | `/api/v1/posts/:id` | Delete post |
| POST | `/api/v1/posts/:id/like` | Like / unlike |
| POST | `/api/v1/posts/:id/bookmark` | Save / unsave |
| POST | `/api/v1/posts/:id/report` | Report post |
| GET  | `/api/v1/posts/:id/comments` | Comment tree |
| POST | `/api/v1/posts/:id/comments` | Add comment / reply |
| DELETE | `/api/v1/comments/:id` | Delete comment |
| GET  | `/api/v1/news` | News list |
| GET  | `/api/v1/clubs` · `GET /api/v1/clubs/:id` | Clubs |
| GET  | `/api/v1/clubs/:id/members` | Club members |
| POST | `/api/v1/clubs/:id/join` · `/leave` | Join / leave club |
| GET  | `/api/v1/tags` | Post tags |
| GET  | `/api/v1/roles` | All roles (`?type=year|club`) |
| GET  | `/api/v1/search?q=` | Search posts |
| GET  | `/api/v1/me/bookmarks` | Saved posts |
| GET  | `/api/v1/me/notifications` | Notifications |
| POST | `/api/v1/me/notifications/read` | Mark notifications read |

**Admin-only:**
`/admin/reports`, `/admin/reports/:id/resolve`, `/admin/posts/:id`,
`/tags`, `/tags/:id`, `/roles`, `/roles/:id`, `/clubs`, `/clubs/:id`, `/news`.

---

## 🌐 Deploying to taugether.org

1. Build the frontend (`npm run build`) and serve `frontend/dist` with a static server (Nginx/Caddy).
2. Run the Go backend behind the same reverse proxy on `api.taugether.org`.
3. Set `VITE_API_URL=https://api.taugether.org/api/v1` and rebuild the frontend.
4. Point the backend `CORS_ORIGIN` to `https://taugether.org`.
5. Proxy `/uploads/*` to the backend so images and files load, and configure Nginx to serve
   `robots.txt` and `sitemap.xml` from `frontend/dist`.

Example Nginx server block:

```nginx
server {
    listen 80;
    server_name taugether.org;
    root /var/www/taugether/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

---

© taugether — built for the students of Türkiye–Azerbaijan University.
