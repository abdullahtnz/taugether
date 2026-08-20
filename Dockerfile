# ============================================================================
# taugether — production image
#
# A single container that serves everything from ONE origin:
#   nginx (React SPA)  -> /usr/share/nginx/html
#   Go API             -> /api/*, /health
#   uploaded files     -> /uploads/*
#
# Because the SPA, API and uploads share one origin, the frontend's relative
# URLs (/api/v1, /uploads/...) work with zero CORS or cross-origin headaches.
#
# Build:
#   docker build -t taugether .
# Run:
#   docker run -p 8080:8080 --env-file .env taugether
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — build the React frontend
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Optional: point the built SPA at an absolute API URL. Leave empty for the
# recommended same-origin setup (relative /api/v1).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — compile the Go backend (static binary, no CGO)
# ---------------------------------------------------------------------------
FROM golang:1.22-alpine AS backend-build
WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---------------------------------------------------------------------------
# Stage 3 — runtime: nginx + API + schema bootstrap
# ---------------------------------------------------------------------------
FROM nginx:1.27

# postgresql-client -> applies schema.sql on first boot
# supervisor        -> keeps nginx and the API running together
# gettext-base      -> envsubst to inject ports into the nginx template
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-client supervisor gettext-base \
 && rm -rf /var/lib/apt/lists/*

COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY --from=backend-build /out/server /app/server
COPY schema.sql /app/schema.sql
COPY nginx.conf.template /etc/nginx/conf.d/app.conf.template
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh \
 && rm -f /etc/nginx/conf.d/default.conf

ENV PORT=8080 \
    BACKEND_PORT=9000 \
    UPLOAD_DIR=/data/uploads

EXPOSE 8080
WORKDIR /app
ENTRYPOINT ["/app/entrypoint.sh"]
