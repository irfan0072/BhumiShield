#!/bin/sh
set -eu
umask 0007
if [ -n "${PORT:-}" ]; then
    sed -i "s/80/${PORT}/g" /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf 2>/dev/null || true
fi
if [ "${APP_ENV:-development}" = "production" ] || [ "${APP_ENV:-development}" = "staging" ]; then
    php -r "require '/app/vendor/autoload.php'; App\Services\JwtAuthService::getSecret(); App\Services\LedgerService::getPublicKeyHex();"
fi
mkdir -p /data
chown www-data:www-data /data
for file in /data/bhumishield.sqlite /data/bhumishield.sqlite-wal /data/bhumishield.sqlite-shm; do
    if [ -f "$file" ]; then chown www-data:www-data "$file"; fi
done
if [ "${INIT_SYNTHETIC_SEED:-false}" = "true" ]; then
    su -s /bin/sh www-data -c 'cd /app && php artisan migrate --seed'
else
    su -s /bin/sh www-data -c 'cd /app && php artisan migrate --force'
fi
exec "$@"
