# syntax=docker/dockerfile:1
# Pet Shop backend (NestJS). Debian slim چون sharp/bcrypt نیتیو هستند و prebuild دارند.

# ---- builder ----
FROM docker.arvancloud.ir/node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runner ----
FROM docker.arvancloud.ir/node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/main"]
