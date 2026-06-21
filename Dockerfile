# Sipiary — one image that builds the React frontend and runs the Express API,
# which serves both /api and the built frontend from a single origin.

# ── Stage 1: build the React frontend → frontend/dist ──
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: backend runtime (serves API + the built frontend) ──
FROM node:20-slim AS runtime
# better-sqlite3 prebuilds (g++/make/python3 are a safety net) + curl/ca-certs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Litestream — continuous SQLite backup. Resilient: if the download ever fails,
# the build still succeeds and the app simply runs without backups.
RUN curl -fsSL https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb -o /tmp/litestream.deb \
    && dpkg -i /tmp/litestream.deb && rm -f /tmp/litestream.deb \
    || echo "WARN: litestream install failed — backups will be disabled."
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
# Bring the compiled SPA in so Express finds it at ../frontend/dist
COPY --from=frontend /app/frontend/dist /app/frontend/dist
COPY litestream.yml /etc/litestream.yml
# Normalize line endings (Windows checkout) and make the entrypoint executable.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
# DATA_DIR is set in fly.toml to the mounted volume (/data) so SQLite + uploads persist.
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
