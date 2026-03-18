#!/bin/bash
# =============================================================================
# AstroMatch Backend - Deployment Script
# =============================================================================
# Usage: ./scripts/deploy.sh [--initial]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
APP_SERVICE="app"
WEB_SERVICE="web"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.prod exists
check_env() {
    if [ ! -f .env.prod ]; then
        log_error ".env.prod file not found!"
        log_info "Copy .env.prod.example to .env.prod and configure it"
        exit 1
    fi
}

# Pull latest code
pull_code() {
    log_info "Pulling latest code..."
    git pull origin main
}

# Build and start containers
build_and_start() {
    log_info "Building Docker images..."
    docker-compose -f $COMPOSE_FILE build --no-cache

    log_info "Starting containers..."
    docker-compose -f $COMPOSE_FILE up -d
}

# Run migrations
run_migrations() {
    log_info "Waiting for database to be ready..."
    sleep 10

    log_info "Running database migrations..."
    docker-compose -f $COMPOSE_FILE exec -T $APP_SERVICE php bin/console doctrine:migrations:migrate --no-interaction
}

# Clear and warm up cache
clear_cache() {
    log_info "Clearing cache..."
    docker-compose -f $COMPOSE_FILE exec -T $APP_SERVICE php bin/console cache:clear --env=prod --no-debug

    log_info "Warming up cache..."
    docker-compose -f $COMPOSE_FILE exec -T $APP_SERVICE php bin/console cache:warmup --env=prod --no-debug
}

# Generate JWT keys if needed
generate_jwt_keys() {
    if [ ! -f config/jwt/private.pem ]; then
        log_info "Generating JWT keys..."
        mkdir -p config/jwt
        openssl genpkey -out config/jwt/private.pem -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096 -pass pass:${JWT_PASSPHRASE:-changeme}
        openssl pkey -in config/jwt/private.pem -out config/jwt/public.pem -pubout -passin pass:${JWT_PASSPHRASE:-changeme}
        chmod 644 config/jwt/public.pem
        chmod 600 config/jwt/private.pem
        log_success "JWT keys generated"
    else
        log_info "JWT keys already exist"
    fi
}

# Initial SSL setup with Certbot
setup_ssl() {
    log_info "Setting up SSL certificates..."

    # Create directories
    mkdir -p certbot/conf certbot/www

    # Get domain from env
    source .env.prod
    DOMAIN=${DOMAIN:-api.astromatch.app}
    EMAIL=${LETSENCRYPT_EMAIL:-admin@example.com}

    # Start nginx for ACME challenge
    docker-compose -f $COMPOSE_FILE up -d web

    # Get certificate
    docker-compose -f $COMPOSE_FILE run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN

    log_success "SSL certificates obtained for $DOMAIN"
}

# Health check
health_check() {
    log_info "Running health check..."

    # Wait for services to be ready
    sleep 5

    # Check app container
    if docker-compose -f $COMPOSE_FILE exec -T $APP_SERVICE php -v > /dev/null 2>&1; then
        log_success "PHP-FPM is running"
    else
        log_error "PHP-FPM is not responding"
        exit 1
    fi

    # Check web container
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
        log_success "Nginx is running"
    else
        log_warning "Nginx health check failed (might be normal if SSL not configured yet)"
    fi
}

# Show status
show_status() {
    log_info "Container status:"
    docker-compose -f $COMPOSE_FILE ps
}

# Main deployment function
deploy() {
    log_info "Starting deployment..."

    check_env
    pull_code
    build_and_start
    run_migrations
    clear_cache
    health_check
    show_status

    log_success "Deployment completed successfully!"
}

# Initial setup
initial_setup() {
    log_info "Running initial setup..."

    check_env
    generate_jwt_keys
    build_and_start
    setup_ssl

    # Restart with SSL
    docker-compose -f $COMPOSE_FILE restart web

    run_migrations
    clear_cache
    health_check
    show_status

    log_success "Initial setup completed!"
}

# Parse arguments
case "$1" in
    --initial)
        initial_setup
        ;;
    --ssl-only)
        setup_ssl
        ;;
    --migrate)
        run_migrations
        ;;
    --cache)
        clear_cache
        ;;
    --status)
        show_status
        ;;
    *)
        deploy
        ;;
esac
