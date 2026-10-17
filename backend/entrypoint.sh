#!/bin/sh
set -eu
umask 0007
if [ "${APP_ENV:-development}" = "production" ]; then
    php -r "require '/app/vendor/autoload.php'; App\Services\JwtAuthService::getSecret(); App\Services\LedgerService::getPublicKeyHex();"
fi
mkdir -p /data
chown www-data:www-data /data
for file in /data/bhumishield.sqlite /data/bhumishield.sqlite-wal /data/bhumishield.sqlite-shm; do
    if [ -f "$file" ]; then chown www-data:www-data "$file"; fi
done
su -s /bin/sh www-data -c 'cd /app && php artisan migrate'
exec "$@"
