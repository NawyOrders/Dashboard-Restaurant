# Restaurant admin dashboard image. One image serves every tenant: the browser
# derives the tenant API origin from the request hostname, so nothing
# tenant-specific (and no `.env`) is baked in at build time.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` = tsc -b && vite build -> /app/dist
RUN npm run build

# Unprivileged nginx listens on 8080 as a non-root user.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
