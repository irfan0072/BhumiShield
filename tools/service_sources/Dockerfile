# Build with repository root as context, independently of the existing API image.
FROM php:8.4-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates libsqlite3-dev libonig-dev libpq-dev \
    && docker-php-ext-install pdo_sqlite pdo_pgsql mbstring \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend /app/backend
COPY tools/service_sources /app/tools/service_sources
ENV SOURCE_COLLECTOR_PYTHON=/usr/bin/python3
# Set DB_CONNECTION/DB_DATABASE or PostgreSQL configuration; share the API database.
CMD ["php", "/app/tools/service_sources/worker.php", "--watch", "--limit=2"]
