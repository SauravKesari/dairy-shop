# Multi-stage production Dockerfile for Dairy Parlour Management System
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies cleanly
RUN npm ci || npm install

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Production runtime stage using lightweight Caddy web server
FROM caddy:2-alpine

# Copy built frontend assets
COPY --from=builder /app/dist /srv

# Copy Caddyfile configuration
COPY deploy/Caddyfile /etc/caddy/Caddyfile

# Expose ports for HTTP and HTTPS
EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
