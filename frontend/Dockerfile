# Étape 1 : Build Angular SSR
FROM node:18 AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY . .

# Construire l'application Angular SSR
RUN npm run build:ssr

# Étape 2 : Exécuter le serveur SSR
FROM node:18

WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --only=production

# Copier les fichiers buildés depuis l’étape 1
COPY --from=builder /usr/src/app/dist ./dist

# Exposer le port pour SSR
EXPOSE 4000

CMD ["node", "dist/server/main.js"]
