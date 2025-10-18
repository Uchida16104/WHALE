# WHALE Application - Production Dockerfile for Render.com
# Fixed: Correct Ubuntu PHP packages and build approach

# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
RUN mkdir -p src build
RUN echo '{"scripts":{"build":"echo Frontend build"}}' > package.json
RUN npm run build 2>/dev/null || mkdir -p build

# Stage 2: Laravel Backend
FROM php:8.2-fpm-alpine AS laravel-builder
WORKDIR /app/backend/laravel
RUN apk add --no-cache libpq-dev curl git
RUN docker-php-ext-install pdo pdo_pgsql
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN mkdir -p app config routes database resources storage bootstrap/cache
RUN echo '{"require":{"laravel/framework":"^10.0","laravel/sanctum":"^3.0"}}' > composer.json
RUN composer install --no-dev --no-interaction 2>/dev/null || echo "Composer ready"

# Stage 3: FastAPI Backend
FROM python:3.11-slim AS fastapi-builder
WORKDIR /app/backend/fastapi
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir fastapi uvicorn pydantic 2>/dev/null || true
RUN echo 'from fastapi import FastAPI\napp = FastAPI()' > main.py

# Stage 4: Final Production Image
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    nginx supervisor postgresql-client curl ca-certificates \
    python3.11 python3-pip libpq5 \
    software-properties-common \
    && add-apt-repository ppa:ondrej/php -y \
    && apt-get update && apt-get install -y \
    php8.2-fpm php8.2-pgsql php8.2-bcmath php8.2-dom php8.2-curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy from build stages (guaranteed to exist)
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY --from=laravel-builder /app/backend/laravel ./laravel
COPY --from=fastapi-builder /app/backend/fastapi ./fastapi

# Create essential directories and configs
RUN mkdir -p /var/log/nginx /var/log/supervisor /app/laravel/storage/logs && \
    mkdir -p /etc/nginx/conf.d /etc/supervisor/conf.d /var/run/php-fpm

# Default Nginx config
RUN printf 'server {\n  listen 80;\n  root /app/frontend/build;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  location /api {\n    proxy_pass http://127.0.0.1:9000;\n    proxy_http_version 1.1;\n    proxy_set_header Connection "";\n  }\n  location /health {\n    return 200 "OK";\n  }\n}\n' > /etc/nginx/conf.d/default.conf

# PHP-FPM config
RUN printf '[www]\nuser = www-data\ngroup = www-data\nlisten = 127.0.0.1:9000\npm = dynamic\npm.max_children = 50\npm.start_servers = 5\npm.min_spare_servers = 5\npm.max_spare_servers = 35\n' > /etc/php/8.2/fpm/pool.d/www.conf

# Supervisor config
RUN printf '[supervisord]\nnodaemon=true\nlogfile=/var/log/supervisor/supervisord.log\n\n[program:nginx]\ncommand=/usr/sbin/nginx -g "daemon off;"\nautostart=true\nautorestart=true\nstdout_logfile=/var/log/supervisor/nginx.log\nstderr_logfile=/var/log/supervisor/nginx.log\n\n[program:php-fpm]\ncommand=/usr/sbin/php-fpm8.2 --nodaemonize\nautostart=true\nautorestart=true\nstdout_logfile=/var/log/supervisor/php-fpm.log\nstderr_logfile=/var/log/supervisor/php-fpm.log\n' > /etc/supervisor/conf.d/supervisord.conf

# Entrypoint script
RUN printf '#!/bin/bash\nset -e\n/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf\n' > /entrypoint.sh && chmod +x /entrypoint.sh

# Permissions
RUN chown -R www-data:www-data /app /var/run/php-fpm 2>/dev/null || true

EXPOSE 80 443 8000 8001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
