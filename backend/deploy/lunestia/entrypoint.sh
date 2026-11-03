#!/bin/sh
set -eu
if [ "${1:-}" = worker ] && [ "${LUNESTIA_WORKER_ENABLED:-false}" != true ]; then
    echo 'Lunestia worker disabled for migration validation.'
    exec sleep infinity
fi
# No automatic migration, fixture import or schema update.
php /var/www/deploy/lunestia/readiness.php --startup
php bin/console cache:warmup --env=prod --no-debug --no-interaction
if [ "${1:-}" = worker ]; then
    exec php bin/console messenger:consume scheduler_notifications async --time-limit=3600 --memory-limit=256M --no-interaction
fi
exec docker-php-entrypoint "$@"
