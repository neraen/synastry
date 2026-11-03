FROM nginx:stable-alpine
COPY public/ /var/www/public/
COPY deploy/lunestia/nginx.conf /etc/nginx/conf.d/default.conf
