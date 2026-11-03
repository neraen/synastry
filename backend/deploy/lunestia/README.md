# Lunestia — préparation Coolify

Branche de migration basée sur `6809e887` (`feat/rectification`), correspondant aux 253 fichiers applicatifs comparés à la sauvegarde OVH du 3 novembre 2026. Ne pas remplacer cette source par main avant réconciliation des branches.

## Configuration de la ressource

- Stratégie Compose, base `/`, fichier `/compose.lunestia.yaml`.
- Le domaine HTTPS doit être attaché au service `web`, port interne 80.
- Conserver `LUNESTIA_WORKER_ENABLED=false` pendant toute la validation. Le conteneur worker est volontairement inactif.
- `LUNESTIA_DATA_NETWORK` doit correspondre au réseau partagé par les ressources MySQL et Redis (valeur par défaut `coolify`).
- Ne pas activer les déploiements automatiques pendant la migration.

## Prérequis privés sur le VPS

Installer `/data/lunestia/runtime.env` (mode 640, propriétaire root, groupe 82) avant le déploiement. Ce fichier est monté en lecture seule dans `/var/www/.env.local` et lu par Symfony et ne doit jamais être committé. Il contient les variables applicatives de production préservées et les nouvelles connexions MySQL/Redis. Utiliser l'utilisateur applicatif MySQL `lunestia`, base `astromatch`, serveur MySQL 8.0.45. Préserver APP_SECRET, JWT_PASSPHRASE et les identifiants des services externes. Garder APP_ENV=prod et APP_DEBUG=0.

Installer les clés JWT existantes dans `/data/lunestia/jwt` (UID/GID 82, répertoire 700, fichiers 600). JWT_SECRET_KEY et JWT_PUBLIC_KEY doivent pointer vers `/var/www/config/jwt/private.pem` et `/var/www/config/jwt/public.pem` dans les conteneurs. Vérifier séparément les éventuelles clés Apple.

Les ressources MySQL/Redis sont indépendantes de cette composition ; elle ne crée ni ne remplace leur volume. Le worker dispose d'un cache persistant distinct.

## Validation et bascule

La vérification de démarrage est en lecture seule : présence des migrations, colonnes mappées par Doctrine et paire JWT valide. Elle ne migre pas automatiquement la base. Le healthcheck vérifie également PHP-FPM. La construction et les contrôles en conditions réelles restent à effectuer avant toute bascule DNS.

Tester les lectures authentifiées sur la base restaurée et garder les notifications arrêtées. Lors de la bascule : suspendre les écritures OVH, arrêter le worker source, sauvegarder puis restaurer l'état final, vérifier les données, basculer les domaines et activer un seul worker avec LUNESTIA_WORKER_ENABLED=true. Conserver l'ancien nom `astro-api.clement-silvestre.com` pour les clients mobiles déjà installés, en plus de `api.lunestia.app`.

Le cache stateful du scheduler source doit être examiné avant activation : il n'était pas dans les archives (var/cache exclu). Redis DB 0 était vide au contrôle, mais cela ne prouve pas que toutes les autres bases le sont. Aucun cache source n'est purgé par cette configuration.

## Déploiements futurs

Une pipeline séparée reste à préparer après validation de la migration. Les changements de schéma nécessitent une sauvegarde et une stratégie de compatibilité avant remplacement du code. Cette branche n'installe aucun webhook ni déclenchement automatique sur OVH.
