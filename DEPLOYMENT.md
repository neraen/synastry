# AstroMatch - Guide de Déploiement

## Backend (VPS avec Docker)

### Prérequis VPS
- Ubuntu 22.04+ ou Debian 11+
- Docker et Docker Compose installés
- Domaine configuré (ex: api.astromatch.app)
- Ports 80 et 443 ouverts

### Installation sur le VPS

```bash
# 1. Cloner le repository
git clone git@github.com:your-org/synastry.git
cd synastry/backend

# 2. Configurer l'environnement
cp .env.prod.example .env.prod
nano .env.prod  # Remplir les valeurs

# 3. Générer les clés JWT
mkdir -p config/jwt
openssl genpkey -out config/jwt/private.pem -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096
openssl pkey -in config/jwt/private.pem -out config/jwt/public.pem -pubout

# 4. Déploiement initial (avec SSL)
./scripts/deploy.sh --initial

# 5. Déploiements suivants
./scripts/deploy.sh
```

### Configuration Nginx (sans SSL d'abord)

Pour le premier déploiement, utiliser la config sans SSL :

```bash
# Dans docker-compose.prod.yml, changer temporairement :
# ./docker/nginx/nginx-prod.conf -> ./docker/nginx/nginx-init.conf
```

Puis obtenir le certificat SSL :

```bash
./scripts/deploy.sh --ssl-only
```

### Commandes utiles

```bash
# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Redémarrer les services
docker-compose -f docker-compose.prod.yml restart

# Exécuter les migrations
docker-compose -f docker-compose.prod.yml exec app php bin/console doctrine:migrations:migrate

# Vider le cache
docker-compose -f docker-compose.prod.yml exec app php bin/console cache:clear --env=prod

# Backup base de données
./scripts/backup.sh
```

### Structure des fichiers de production

```
backend/
├── docker-compose.prod.yml    # Orchestration production
├── Dockerfile.prod            # Image PHP optimisée
├── .env.prod                  # Variables (non commité)
├── docker/
│   ├── nginx/
│   │   ├── nginx-prod.conf   # Config avec SSL
│   │   └── nginx-init.conf   # Config initiale sans SSL
│   ├── php/
│   │   ├── php-prod.ini      # Config PHP production
│   │   ├── opcache.ini       # OPcache optimisé
│   │   └── www.conf          # PHP-FPM pool
│   └── mysql/
│       └── my.cnf            # Config MySQL
├── scripts/
│   ├── deploy.sh             # Script de déploiement
│   └── backup.sh             # Script de backup
└── certbot/                   # Certificats Let's Encrypt
```

---

## Mobile (EAS Build + Fastlane)

### Prérequis

```bash
# Node.js et npm
node --version  # 18+

# EAS CLI
npm install -g eas-cli

# Fastlane (optionnel, pour automatisation avancée)
gem install bundler
cd app && bundle install
```

### Configuration EAS

```bash
# 1. Se connecter à Expo
eas login

# 2. Configurer le projet
eas build:configure

# 3. Mettre à jour eas.json avec votre project ID
```

### Build avec EAS (Recommandé)

```bash
# Development (simulateur)
eas build --platform ios --profile development
eas build --platform android --profile development

# Preview (test interne)
eas build --platform all --profile preview

# Production
eas build --platform all --profile production

# Soumettre aux stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### Build avec Fastlane

```bash
cd app

# iOS Beta (TestFlight)
bundle exec fastlane ios beta

# iOS Release (App Store)
bundle exec fastlane ios release

# Android Beta
bundle exec fastlane android beta

# Android Release (Play Store)
bundle exec fastlane android release

# Les deux plateformes
bundle exec fastlane release_all
```

### Configuration des credentials

#### iOS (App Store Connect)

1. Créer une clé API App Store Connect :
   - Aller sur https://appstoreconnect.apple.com/access/api
   - Créer une clé avec le rôle "App Manager"
   - Télécharger le fichier .p8

2. Configurer les variables :
```bash
export APP_STORE_CONNECT_API_KEY_ID=XXX
export APP_STORE_CONNECT_API_ISSUER_ID=XXX
export APP_STORE_CONNECT_API_KEY_PATH=./AuthKey_XXX.p8
```

#### Android (Google Play)

1. Créer un compte de service Google Cloud :
   - Aller sur la Google Cloud Console
   - Créer un compte de service
   - Télécharger la clé JSON
   - Activer l'API Google Play Developer

2. Lier le compte de service à la Play Console :
   - Play Console > Paramètres > Accès API
   - Inviter le compte de service

3. Sauvegarder le fichier JSON comme `google-service-account.json`

### Gestion des versions

```bash
# Incrémenter la version
bundle exec fastlane bump_version type:patch  # 1.0.0 -> 1.0.1
bundle exec fastlane bump_version type:minor  # 1.0.0 -> 1.1.0
bundle exec fastlane bump_version type:major  # 1.0.0 -> 2.0.0
```

### Structure des fichiers

```
app/
├── app.config.js              # Config dynamique Expo
├── eas.json                   # Config EAS Build
├── Gemfile                    # Dépendances Ruby
├── fastlane/
│   ├── Fastfile              # Lanes Fastlane
│   ├── Appfile               # Identifiants
│   ├── Matchfile             # Config certificats iOS
│   ├── Pluginfile            # Plugins
│   └── .env.example          # Template variables
└── builds/                    # Builds locaux (gitignored)
```

---

## Workflow de Release

### 1. Préparer la release

```bash
# Backend
cd backend
git checkout main
git pull origin main

# Mobile
cd app
bundle exec fastlane bump_version type:minor
git push origin main --tags
```

### 2. Déployer le backend

```bash
# Sur le VPS
cd /path/to/synastry/backend
./scripts/deploy.sh
```

### 3. Publier les apps

```bash
# Avec EAS (plus simple)
cd app
eas build --platform all --profile production
eas submit --platform all --profile production

# OU avec Fastlane
bundle exec fastlane release_all
```

---

## Variables d'environnement

### Backend (.env.prod)

| Variable | Description |
|----------|-------------|
| APP_SECRET | Clé secrète Symfony |
| DATABASE_URL | URL de connexion MySQL |
| JWT_PASSPHRASE | Passphrase des clés JWT |
| OPENAI_API_KEY | Clé API OpenAI |
| ASTROAPI_API_KEY | Clé API AstroAPI |
| CORS_ALLOW_ORIGIN | Regex des origines CORS autorisées |

### Mobile

| Variable | Description |
|----------|-------------|
| EXPO_PUBLIC_API_URL | URL de l'API backend |
| EAS_PROJECT_ID | ID du projet EAS |

---

## Troubleshooting

### Backend

```bash
# Voir les logs PHP
docker-compose -f docker-compose.prod.yml logs app

# Voir les logs Nginx
docker-compose -f docker-compose.prod.yml logs web

# Se connecter au container
docker-compose -f docker-compose.prod.yml exec app sh

# Tester la connexion DB
docker-compose -f docker-compose.prod.yml exec app php bin/console doctrine:query:sql "SELECT 1"
```

### Mobile

```bash
# Nettoyer le cache Expo
npx expo start --clear

# Régénérer les projets natifs
npx expo prebuild --clean

# Vérifier la config EAS
eas config
```
