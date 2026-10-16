FROM php:8.4-cli-alpine

WORKDIR /app

RUN apk add --no-cache \
    postgresql-dev \
    sqlite-dev \
    libsodium-dev \
    qrencode \
    tesseract-ocr \
    tesseract-ocr-data-ben \
    && docker-php-ext-install pdo pdo_pgsql pdo_sqlite sodium

COPY . .

RUN php artisan migrate:fresh --seed

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
