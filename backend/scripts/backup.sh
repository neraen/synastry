#!/bin/bash
# =============================================================================
# AstroMatch Backend - Database Backup Script
# =============================================================================
# Usage: ./scripts/backup.sh
# Recommended: Add to crontab for daily backups
# 0 3 * * * /path/to/backend/scripts/backup.sh
# =============================================================================

set -e

# Configuration
BACKUP_DIR="./backups"
COMPOSE_FILE="docker-compose.prod.yml"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Load environment
if [ -f .env.prod ]; then
    source .env.prod
fi

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
log_info "Starting database backup..."
BACKUP_FILE="$BACKUP_DIR/astromatch_db_$DATE.sql.gz"

docker-compose -f $COMPOSE_FILE exec -T db mysqldump \
    -u ${MYSQL_USER:-astromatch} \
    -p${MYSQL_PASSWORD} \
    ${MYSQL_DATABASE:-astromatch} \
    | gzip > $BACKUP_FILE

log_success "Database backup created: $BACKUP_FILE"

# Backup JWT keys
log_info "Backing up JWT keys..."
if [ -d config/jwt ]; then
    tar -czf "$BACKUP_DIR/jwt_keys_$DATE.tar.gz" config/jwt/
    log_success "JWT keys backup created"
fi

# Clean old backups
log_info "Cleaning backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

log_success "Backup completed!"

# List recent backups
log_info "Recent backups:"
ls -lh $BACKUP_DIR | tail -10
