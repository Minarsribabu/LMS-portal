# ─── Stage 1: Install dependencies ───
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production --silent

# ─── Stage 2: Run ───
FROM node:18-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Switch to non-root user
USER appuser

EXPOSE 5000
CMD ["node", "src/index.js"]
