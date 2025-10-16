#!/bin/bash

set -e

echo "================================"
echo "WHALE Application Initialization"
echo "================================"

# Function to wait for database
wait_for_db() {
    echo "Waiting for PostgreSQL database..."
    until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "\q" 2>/dev/null; do
        echo "Database is unavailable - sleeping"
        sleep 1
    done
    echo "Database is up - continuing startup sequence"
}

# Function to wait for Redis
wait_for_redis() {
    echo "Waiting for Redis..."
    while ! nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
        echo "Redis is unavailable - sleeping"
        sleep 1
    done
    echo "Redis is up - continuing startup sequence"
}

# Wait for services
wait_for_db
wait_for_redis

# Laravel setup
echo "Setting up Laravel application..."
cd /app/backend/laravel

# Generate application key if not exists
if [ ! -f .env ] || ! grep -q "APP_KEY=" .env; then
    echo "Generating application key..."
    php artisan key:generate --force
fi

# Run migrations
echo "Running database migrations..."
php artisan migrate --force

# Clear caches
echo "Clearing application caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize application
echo "Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Seed database if needed
if [ "$APP_ENV" = "development" ]; then
    echo "Seeding database..."
    php artisan db:seed --force
fi

# Create necessary directories
mkdir -p storage/logs storage/app/exports
chown -R www-data:www-data storage

# Set permissions
chmod -R 755 storage
chmod -R 755 bootstrap/cache

echo "================================"
echo "Starting WHALE Services"
echo "================================"

case "$1" in
    start)
        echo "Starting all services..."
        
        # Start PHP-FPM
        echo "Starting PHP-FPM..."
        php-fpm -D
        
        # Start Supervisor for background jobs
        echo "Starting Supervisor..."
        supervisord -c /etc/supervisor/conf.d/supervisord.conf
        
        # Start Nginx
        echo "Starting Nginx..."
        exec nginx -g "daemon off;"
        ;;
    
    dev)
        echo "Starting development environment..."
        exec php-fpm
        ;;
    
    migrate)
        echo "Running migrations..."
        cd /app/backend/laravel
        php artisan migrate
        ;;
    
    seed)
        echo "Seeding database..."
        cd /app/backend/laravel
        php artisan db:seed
        ;;
    
    tinker)
        echo "Starting Tinker..."
        cd /app/backend/laravel
        exec php artisan tinker
        ;;
    
    bash)
        echo "Starting bash shell..."
        exec /bin/bash
        ;;
    
    *)
        echo "Unknown command: $1"
        echo "Available commands: start, dev, migrate, seed, tinker, bash"
        exit 1
        ;;
esac