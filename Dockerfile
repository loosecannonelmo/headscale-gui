# ── Stage 1: Build ───────────────────────────────────────────────────────────
# $BUILDPLATFORM is always the native runner platform (linux/amd64).
# This means Node runs natively regardless of the target platform, so
# QEMU emulation is never needed for the slow build step. The output
# (JS/CSS/HTML) is architecture-independent and works on any platform.
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config templates
COPY nginx/ /etc/nginx/headscale-gui/

# Copy and set the entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Remove the default nginx site config (we generate ours at runtime)
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
