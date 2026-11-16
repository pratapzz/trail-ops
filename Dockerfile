# Cloud Run image for TrailOPS (Express API + Vite PWA).
FROM node:22-slim
WORKDIR /app

# Install all deps (tsx and vite are needed at runtime).
COPY package.json bun.lock* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .
ENV NODE_ENV=production

# Build the web bundle when the container starts, so it uses the service's own
# VITE_* settings (Supabase URL/anon key, Maps key) without baking them into
# the repo or the image. Then start the API server on Cloud Run's $PORT.
CMD ["sh", "-c", "npx vite build && npx tsx server.ts"]
