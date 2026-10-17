FROM php:8.4-apache-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libonig-dev qrencode \
    && docker-php-ext-install pdo_pgsql mbstring \
    && rm -rf /var/lib/apt/lists/*
COPY . /app
COPY apache.conf /etc/apache2/sites-available/000-default.conf
COPY production.ini /usr/local/etc/php/conf.d/production.ini
RUN chmod +x /app/entrypoint.sh && mkdir -p /data && chown www-data:www-data /data
EXPOSE 80
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["apache2-foreground"]
