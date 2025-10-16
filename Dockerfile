# Multi-stage build for WHALE application

# Stage 1: Node.js Frontend Build
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: PHP Laravel Backend
FROM php:8.2-fpm AS laravel

WORKDIR /app/backend/laravel

RUN apt-get update && apt-get install -y \
    libpq-dev \
    libssl-dev \
    git \
    curl \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql

COPY backend/laravel/composer.lock backend/laravel/composer.json ./
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-dev --no-interaction --prefer-dist

COPY backend/laravel/ ./
RUN php artisan config:cache && php artisan route:cache

# Stage 3: Python FastAPI
FROM python:3.11-slim AS fastapi

WORKDIR /app/backend/fastapi

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/fastapi/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/fastapi/ ./

# Stage 4: C++ Web Toolkit
FROM ubuntu:22.04 AS cpp-builder

WORKDIR /app/backend/cpp

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libssl-dev \
    libpq-dev \
    curl \
    git

# Download and build Wt (C++ Web Toolkit)
RUN git clone https://github.com/emweb/wt.git && \
    cd wt && \
    cmake . && \
    make && \
    make install

COPY backend/cpp/ ./
RUN cmake . && make

# Stage 5: Nginx reverse proxy and final image
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    postgresql-client \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node runtime for frontend
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install PHP runtime
RUN apt-get update && apt-get install -y \
    php8.2-fpm \
    php8.2-pgsql \
    php8.2-bcmath \
    php8.2-dom \
    && rm -rf /var/lib/apt/lists/*

# Install Python runtime
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    libpq5 \
    && rm -rf /var/lib/apt/lists*

# Copy built artifacts
COPY --from=frontend-builder /app/frontend/build /app/frontend/build
COPY --from=laravel /app/backend/laravel /app/backend/laravel
COPY --from=fastapi /app/backend/fastapi /app/backend/fastapi
COPY --from=cpp-builder /app/backend/cpp/dist /app/backend/cpp/dist

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY .env.production /app/.env
COPY docker-entrypoint.sh /

RUN chmod +x /docker-entrypoint.sh

# Create necessary directories
RUN mkdir -p /app/storage /app/logs && \
    chown -R www-data:www-data /app

# Expose ports
EXPOSE 80 443 8000 8001 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["start"]