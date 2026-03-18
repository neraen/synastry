# AstroMatch - Guide de Déploiement Complet

Ce guide t'explique **étape par étape** comment mettre en production ton application AstroMatch (backend + mobile).

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Préparer le VPS](#2-préparer-le-vps)
3. [Configurer le domaine](#3-configurer-le-domaine)
4. [Déployer le Backend](#4-déployer-le-backend)
5. [Configurer les comptes développeur](#5-configurer-les-comptes-développeur)
6. [Publier sur l'App Store (iOS)](#6-publier-sur-lapp-store-ios)
7. [Publier sur le Play Store (Android)](#7-publier-sur-le-play-store-android)
8. [Maintenance et mises à jour](#8-maintenance-et-mises-à-jour)

---

## 1. Prérequis

### Ce dont tu as besoin

| Élément | Coût approximatif | Où l'obtenir |
|---------|-------------------|--------------|
| VPS (serveur) | ~5-10€/mois | OVH, Scaleway, DigitalOcean, Hetzner |
| Nom de domaine | ~10€/an | OVH, Namecheap, Gandi |
| Compte Apple Developer | 99$/an | https://developer.apple.com |
| Compte Google Play Developer | 25$ (une fois) | https://play.google.com/console |
| Clé API OpenAI | Variable | https://platform.openai.com |
| Clé API AstroAPI | Variable | https://apiastro.com |

### Sur ton Mac (machine de développement)

```bash
# 1. Installer Homebrew (si pas déjà fait)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Installer les outils nécessaires
brew install node
brew install ruby
brew install --cask expo-go

# 3. Installer EAS CLI
npm install -g eas-cli

# 4. Installer les gems Ruby (pour Fastlane)
cd /Users/clement/Documents/dev/synastry/app
gem install bundler
bundle install
```

---

## 2. Préparer le VPS

### 2.1 Commander un VPS

Je te recommande **Hetzner** (bon rapport qualité/prix) ou **Scaleway** (français).

**Configuration minimale recommandée :**
- 2 vCPU
- 4 Go RAM
- 40 Go SSD
- Ubuntu 22.04 LTS

### 2.2 Se connecter au VPS

```bash
# Depuis ton Mac, connecte-toi en SSH
ssh root@IP_DE_TON_VPS
```

### 2.3 Sécuriser le VPS (première connexion)

```bash
# 1. Mettre à jour le système
apt update && apt upgrade -y

# 2. Créer un utilisateur (remplace "clement" par ton prénom)
adduser clement
usermod -aG sudo clement

# 3. Configurer SSH pour cet utilisateur
mkdir -p /home/clement/.ssh
cp ~/.ssh/authorized_keys /home/clement/.ssh/
chown -R clement:clement /home/clement/.ssh
chmod 700 /home/clement/.ssh
chmod 600 /home/clement/.ssh/authorized_keys

# 4. Désactiver la connexion root (optionnel mais recommandé)
nano /etc/ssh/sshd_config
# Changer: PermitRootLogin no
systemctl restart sshd

# 5. Installer le firewall
apt install ufw -y
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2.4 Installer Docker

```bash
# Toujours sur le VPS, connecté en tant que ton utilisateur
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Ajouter le repo Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Ajouter ton utilisateur au groupe docker
sudo usermod -aG docker $USER

# Déconnecte-toi et reconnecte-toi pour que ça prenne effet
exit
ssh clement@IP_DE_TON_VPS

# Vérifier que Docker fonctionne
docker --version
docker compose version
```

### 2.5 Installer Git

```bash
sudo apt install git -y

# Configurer Git
git config --global user.name "Ton Nom"
git config --global user.email "ton@email.com"
```

---

## 3. Configurer le domaine

### 3.1 Acheter un domaine

Achète un domaine (ex: `astromatch.app`) sur OVH, Namecheap, ou Gandi.

### 3.2 Configurer les DNS

Dans le panneau de gestion de ton domaine, ajoute ces enregistrements DNS :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | api | IP_DE_TON_VPS | 3600 |
| A | @ | IP_DE_TON_VPS | 3600 |

**Exemple concret :**
- Si ton domaine est `astromatch.app` et ton IP VPS est `123.45.67.89`
- L'enregistrement `A api 123.45.67.89` créera `api.astromatch.app`

⏳ **Attends 5-30 minutes** que les DNS se propagent avant de continuer.

### 3.3 Vérifier la propagation DNS

```bash
# Depuis ton Mac ou le VPS
ping api.astromatch.app
# Tu dois voir l'IP de ton VPS
```

---

## 4. Déployer le Backend

### 4.1 Cloner le projet sur le VPS

```bash
# Sur le VPS
cd ~
git clone https://github.com/TON_USERNAME/synastry.git
# OU si c'est un repo privé, configure d'abord une clé SSH
cd synastry/backend
```

### 4.2 Créer le fichier de configuration

```bash
# Copier le template
cp .env.prod.example .env.prod

# Éditer le fichier
nano .env.prod
```

**Remplis toutes les valeurs :**

```env
# =============================================================================
# CONFIGURATION PRODUCTION - REMPLIS TOUT !
# =============================================================================

# Symfony
APP_ENV=prod
APP_DEBUG=0
APP_SECRET=GENERE_UNE_CLE_ALEATOIRE_ICI    # Utilise: openssl rand -hex 32

# Base de données
DATABASE_URL="mysql://astromatch:MOT_DE_PASSE_DB@db:3306/astromatch?serverVersion=8.0&charset=utf8mb4"
MYSQL_ROOT_PASSWORD=MOT_DE_PASSE_ROOT_DIFFERENT
MYSQL_DATABASE=astromatch
MYSQL_USER=astromatch
MYSQL_PASSWORD=MOT_DE_PASSE_DB              # Le même que dans DATABASE_URL

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=MOT_DE_PASSE_REDIS

# JWT (tu vas générer les clés après)
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=MOT_DE_PASSE_JWT

# APIs externes
ASTROAPI_API_URL=https://json.apiastro.com
ASTROAPI_API_KEY=TA_CLE_ASTROAPI

OPENAI_API_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-TA_CLE_OPENAI

# OAuth Google (optionnel pour l'instant)
OAUTH_GOOGLE_CLIENT_ID=ton-client-id
OAUTH_GOOGLE_CLIENT_SECRET=ton-client-secret

# URLs
APP_URL=https://api.astromatch.app           # TON DOMAINE
CORS_ALLOW_ORIGIN='^https://(app\.astromatch\.app|astromatch\.app)$'

# Let's Encrypt
LETSENCRYPT_EMAIL=ton@email.com              # Ton vrai email
DOMAIN=api.astromatch.app                    # Ton domaine API
```

**Pour générer des mots de passe sécurisés :**
```bash
# Génère une clé aléatoire
openssl rand -hex 32
```

### 4.3 Générer les clés JWT

```bash
# Toujours dans ~/synastry/backend
mkdir -p config/jwt

# Génère la clé privée (utilise le même mot de passe que JWT_PASSPHRASE)
openssl genpkey -out config/jwt/private.pem -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096
# Il te demande un mot de passe : entre celui de JWT_PASSPHRASE

# Génère la clé publique
openssl pkey -in config/jwt/private.pem -out config/jwt/public.pem -pubout
# Entre le même mot de passe

# Sécurise les fichiers
chmod 600 config/jwt/private.pem
chmod 644 config/jwt/public.pem
```

### 4.4 Premier déploiement (sans SSL)

```bash
# Modifier temporairement la config nginx pour utiliser la version sans SSL
nano docker-compose.prod.yml
```

Trouve cette ligne :
```yaml
- ./docker/nginx/nginx-prod.conf:/etc/nginx/nginx.conf:ro
```

Remplace par :
```yaml
- ./docker/nginx/nginx-init.conf:/etc/nginx/nginx.conf:ro
```

```bash
# Lancer les containers
docker compose -f docker-compose.prod.yml up -d

# Vérifier que tout tourne
docker compose -f docker-compose.prod.yml ps

# Attendre que MySQL soit prêt (30 secondes environ)
sleep 30

# Lancer les migrations
docker compose -f docker-compose.prod.yml exec app php bin/console doctrine:migrations:migrate --no-interaction
```

### 4.5 Obtenir le certificat SSL

```bash
# Créer les dossiers pour Certbot
mkdir -p certbot/conf certbot/www

# Obtenir le certificat (remplace par ton domaine et email)
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email ton@email.com \
  --agree-tos \
  --no-eff-email \
  -d api.astromatch.app

# Tu devrais voir "Congratulations!" si ça a marché
```

### 4.6 Activer SSL

```bash
# Remet la config nginx avec SSL
nano docker-compose.prod.yml
```

Remets :
```yaml
- ./docker/nginx/nginx-prod.conf:/etc/nginx/nginx.conf:ro
```

**Modifie aussi le fichier nginx pour ton domaine :**
```bash
nano docker/nginx/nginx-prod.conf
```

Cherche et remplace `api.astromatch.app` par **ton vrai domaine** (3 occurrences).

```bash
# Redémarre nginx
docker compose -f docker-compose.prod.yml restart web

# Teste que ça marche
curl https://api.astromatch.app/health
# Doit afficher: healthy
```

### 4.7 Vider le cache et finaliser

```bash
docker compose -f docker-compose.prod.yml exec app php bin/console cache:clear --env=prod
docker compose -f docker-compose.prod.yml exec app php bin/console cache:warmup --env=prod
```

🎉 **Ton backend est en ligne !**

---

## 5. Configurer les comptes développeur

### 5.1 Compte Apple Developer

1. Va sur https://developer.apple.com/programs/
2. Clique sur "Enroll"
3. Connecte-toi avec ton Apple ID (ou crée-en un)
4. Paie les 99$/an
5. **Attends 24-48h** pour l'activation

Une fois activé :
1. Va sur https://developer.apple.com/account
2. Note ton **Team ID** (en haut à droite ou dans Membership)

### 5.2 Compte Google Play Developer

1. Va sur https://play.google.com/console
2. Connecte-toi avec ton compte Google
3. Accepte les conditions
4. Paie les 25$ (paiement unique)
5. Remplis les informations du développeur
6. **Attends 48h** pour la vérification

### 5.3 Créer une clé API App Store Connect

1. Va sur https://appstoreconnect.apple.com/access/api
2. Clique sur "+" pour créer une clé
3. Nom : "Fastlane"
4. Accès : "App Manager"
5. Télécharge le fichier `.p8` (tu ne pourras le télécharger qu'une fois !)
6. Note le **Key ID** et **Issuer ID**

```bash
# Sur ton Mac, copie la clé dans le projet
cp ~/Downloads/AuthKey_XXXXXX.p8 /Users/clement/Documents/dev/synastry/app/
```

### 5.4 Créer un compte de service Google Cloud

1. Va sur https://console.cloud.google.com
2. Crée un nouveau projet "AstroMatch"
3. Active l'API "Google Play Android Developer API"
4. Va dans "IAM & Admin" > "Service Accounts"
5. Crée un compte de service
6. Télécharge la clé JSON

```bash
# Copie la clé dans le projet
cp ~/Downloads/service-account-xxxxx.json /Users/clement/Documents/dev/synastry/app/google-service-account.json
```

7. Va sur https://play.google.com/console
8. Paramètres > Accès API
9. Lie le compte de service avec les permissions "Admin"

---

## 6. Publier sur l'App Store (iOS)

### 6.1 Configurer EAS

```bash
cd /Users/clement/Documents/dev/synastry/app

# Connecte-toi à Expo
npx eas-cli login
# Entre tes identifiants Expo (crée un compte sur expo.dev si besoin)

# Configure le projet
npx eas-cli build:configure
```

### 6.2 Mettre à jour les identifiants

Édite `eas.json` :
```bash
nano eas.json
```

Remplace dans la section `submit.production.ios` :
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "ton@email.apple.com",
        "ascAppId": "XXXXXX",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

Pour trouver `ascAppId` :
1. Va sur https://appstoreconnect.apple.com
2. Crée une nouvelle app (+ > Nouvelle app)
3. L'ID de l'app est dans l'URL

### 6.3 Mettre à jour la configuration de l'app

Édite `app.config.js` :
```bash
nano app.config.js
```

Mets à jour :
- `extra.eas.projectId` : Ton Project ID EAS (visible sur expo.dev)
- `updates.url` : L'URL des mises à jour OTA

### 6.4 Configurer les variables d'environnement

Édite `fastlane/.env` :
```bash
cp fastlane/.env.example fastlane/.env
nano fastlane/.env
```

Remplis toutes les valeurs.

### 6.5 Créer l'app sur App Store Connect

1. Va sur https://appstoreconnect.apple.com
2. Mes apps > + > Nouvelle app
3. Remplis :
   - Plateformes : iOS
   - Nom : AstroMatch
   - Langue principale : Français
   - Bundle ID : Sélectionne ou crée `com.astromatch.app`
   - SKU : astromatch
4. Crée l'app

### 6.6 Préparer les assets

Tu as besoin de :
- **Screenshots** : iPhone 6.7" (1290x2796), iPhone 6.5" (1284x2778), iPad 12.9" (2048x2732)
- **Icône** : 1024x1024 sans transparence
- **Description** : Texte de présentation
- **Mots-clés** : Séparés par des virgules
- **Catégorie** : Lifestyle ou Social

### 6.7 Builder et soumettre

```bash
cd /Users/clement/Documents/dev/synastry/app

# Option 1 : Avec EAS (plus simple)
npx eas-cli build --platform ios --profile production
# Attends que le build soit terminé (10-30 min)

npx eas-cli submit --platform ios --profile production
# Ça soumet automatiquement à l'App Store

# Option 2 : Avec Fastlane
bundle exec fastlane ios release
```

### 6.8 Soumettre pour review

1. Retourne sur App Store Connect
2. Va dans ton app > App Store > Préparation de la soumission
3. Remplis toutes les informations requises
4. Ajoute les screenshots
5. Clique sur "Soumettre pour examen"

⏳ **Délai de review : 24h à 7 jours** (généralement 24-48h)

---

## 7. Publier sur le Play Store (Android)

### 7.1 Créer l'app sur Play Console

1. Va sur https://play.google.com/console
2. Créer une application
3. Remplis :
   - Nom : AstroMatch
   - Langue par défaut : Français
   - Application ou Jeu : Application
   - Gratuite ou Payante : Gratuite
4. Crée l'app

### 7.2 Remplir les informations requises

Google demande BEAUCOUP d'informations. Remplis tout dans :
- **Tableau de bord** > Configurer votre application
  - Politique de confidentialité (URL requise)
  - Accès à l'application
  - Publicités
  - Classification du contenu
  - Public cible
  - Application d'actualités
  - COVID-19
  - Sécurité des données

### 7.3 Préparer les assets

Tu as besoin de :
- **Screenshots** : Téléphone (min 2), Tablette 7" (optionnel), Tablette 10" (optionnel)
- **Icône** : 512x512
- **Graphique de fonctionnalité** : 1024x500
- **Description courte** : Max 80 caractères
- **Description complète** : Max 4000 caractères

### 7.4 Builder et soumettre

```bash
cd /Users/clement/Documents/dev/synastry/app

# Option 1 : Avec EAS (plus simple)
npx eas-cli build --platform android --profile production
# Attends que le build soit terminé (10-20 min)

npx eas-cli submit --platform android --profile production
# Ça soumet automatiquement au Play Store

# Option 2 : Avec Fastlane
bundle exec fastlane android release
```

### 7.5 Publier

1. Va dans Play Console > Production
2. Crée une release
3. L'AAB devrait déjà être uploadé
4. Ajoute les notes de version
5. Clique sur "Examiner la release"
6. Clique sur "Démarrer le déploiement"

⏳ **Délai de review : quelques heures à 7 jours** (généralement 1-3 jours)

---

## 8. Maintenance et mises à jour

### 8.1 Mettre à jour le backend

```bash
# Sur le VPS
cd ~/synastry/backend

# Récupérer les dernières modifications
git pull origin main

# Reconstruire et redémarrer
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d

# Lancer les migrations si nécessaire
docker compose -f docker-compose.prod.yml exec app php bin/console doctrine:migrations:migrate --no-interaction

# Vider le cache
docker compose -f docker-compose.prod.yml exec app php bin/console cache:clear --env=prod
```

### 8.2 Publier une mise à jour mobile

```bash
# Sur ton Mac
cd /Users/clement/Documents/dev/synastry/app

# 1. Incrémenter la version
bundle exec fastlane bump_version type:patch
# patch = 1.0.0 -> 1.0.1
# minor = 1.0.0 -> 1.1.0
# major = 1.0.0 -> 2.0.0

# 2. Commit et push
git add .
git commit -m "Release 1.0.1"
git push origin main

# 3. Builder et soumettre
npx eas-cli build --platform all --profile production
npx eas-cli submit --platform all --profile production
```

### 8.3 Sauvegarder la base de données

```bash
# Sur le VPS
cd ~/synastry/backend

# Lancer le backup
./scripts/backup.sh

# Les backups sont dans ./backups/
ls -la backups/
```

### 8.4 Renouveler le certificat SSL

Le certificat Let's Encrypt est renouvelé automatiquement par Certbot.
Pour forcer le renouvellement :

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart web
```

### 8.5 Voir les logs

```bash
# Logs de l'application PHP
docker compose -f docker-compose.prod.yml logs -f app

# Logs de Nginx
docker compose -f docker-compose.prod.yml logs -f web

# Logs de MySQL
docker compose -f docker-compose.prod.yml logs -f db

# Tous les logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Checklist finale

### Backend
- [ ] VPS commandé et configuré
- [ ] Docker installé
- [ ] Domaine acheté et DNS configurés
- [ ] `.env.prod` rempli avec toutes les valeurs
- [ ] Clés JWT générées
- [ ] Certificat SSL obtenu
- [ ] Backend accessible sur `https://api.tondomaine.com/health`

### iOS
- [ ] Compte Apple Developer activé (99$/an)
- [ ] Clé API App Store Connect créée
- [ ] App créée sur App Store Connect
- [ ] Screenshots et description prêts
- [ ] Build soumis et approuvé

### Android
- [ ] Compte Google Play Developer activé (25$)
- [ ] Compte de service Google Cloud créé
- [ ] App créée sur Play Console
- [ ] Toutes les informations de conformité remplies
- [ ] Screenshots et description prêts
- [ ] Build soumis et approuvé

---

## En cas de problème

### Le backend ne démarre pas

```bash
# Voir les logs
docker compose -f docker-compose.prod.yml logs

# Vérifier les containers
docker compose -f docker-compose.prod.yml ps

# Redémarrer tout
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Erreur de connexion à la base de données

```bash
# Vérifier que MySQL est lancé
docker compose -f docker-compose.prod.yml exec db mysql -u root -p

# Vérifier les variables d'environnement
docker compose -f docker-compose.prod.yml exec app env | grep DATABASE
```

### Le certificat SSL ne marche pas

```bash
# Vérifier les logs Certbot
docker compose -f docker-compose.prod.yml logs certbot

# Vérifier que le domaine pointe bien vers le serveur
dig api.tondomaine.com
```

### Build mobile échoue

```bash
# Nettoyer le cache
cd /Users/clement/Documents/dev/synastry/app
rm -rf node_modules
npm install
npx expo start --clear

# Réessayer le build
npx eas-cli build --platform ios --profile production --clear-cache
```

---

## Contact et ressources

- **Documentation Expo** : https://docs.expo.dev
- **Documentation EAS** : https://docs.expo.dev/eas
- **Documentation Fastlane** : https://docs.fastlane.tools
- **Documentation Docker** : https://docs.docker.com
- **Let's Encrypt** : https://letsencrypt.org/docs

---

Bonne chance pour ton déploiement ! 🚀
