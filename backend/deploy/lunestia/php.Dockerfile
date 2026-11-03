FROM php:8.2-fpm-alpine
RUN apk add --no-cache icu-dev libzip-dev oniguruma-dev libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j2 bcmath gd intl mbstring opcache pdo_mysql zip \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis-6.1.0 && docker-php-ext-enable redis \
    && apk del .build-deps
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www
ENV APP_ENV=prod APP_DEBUG=0
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN printf 'APP_ENV=prod\nAPP_DEBUG=0\n' > .env \
    && composer dump-autoload --no-dev --classmap-authoritative --no-scripts \
    && mkdir -p var/cache var/log \
    && chown -R www-data:www-data var
COPY deploy/lunestia/fpm.conf /usr/local/etc/php-fpm.d/zz-lunestia.conf
RUN printf 'memory_limit=256M\nexpose_php=Off\ndisplay_errors=Off\nlog_errors=On\nerror_log=/proc/self/fd/2\nopcache.validate_timestamps=0\ndate.timezone=Europe/Paris\n' > /usr/local/etc/php/conf.d/lunestia.ini
USER www-data
EXPOSE 9000
ENTRYPOINT ["sh", "/var/www/deploy/lunestia/entrypoint.sh"]
CMD ["php-fpm", "-F"]
