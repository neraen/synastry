# AstroMatch — Fonctionnalités

## Navigation principale (Onglets)

### Accueil
- Headline cosmique hebdomadaire (ex: "Vénus en rétrograde")
- Carte de compatibilité avec score et visualisation en anneau
- Carte thème natal (Soleil, Lune, Ascendant)
- Carte des insights quotidiens basés sur les transits actifs
- Timeline des prochains transits significatifs avec niveau d'intensité

### Compatibilité
- Formulaire partenaire : nom, date de naissance, heure (optionnelle), ville
- Recherche de ville dans le monde entier
- Score de compatibilité global (0–100 %)
- Décomposition par dimension : Amour, Communication, Attraction, Long terme, Conflits
- Analyse textuelle générée par IA
- Accès à une analyse passée depuis l'historique

### Thème natal
- Calcul du thème natal à l'instant exact de naissance
- Tableau des positions planétaires (Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune, Pluton, Ascendant, Milieu du ciel)
- Indication des rétrogrades (℞)
- Position en degré et signe
- Interprétation IA du thème complet (à la demande)

### Horoscope quotidien
- Horoscope personnalisé basé sur les transits actifs du jour
- Quatre sections : Vue d'ensemble, Amour, Énergie, Guidance
- Régénération quotidienne avec mise en cache
- Actualisation manuelle possible

### Historique
- Liste de toutes les analyses de compatibilité passées
- Affichage : noms, date, score, label (Âmes sœurs, Très compatible, Compatible, Complexe, Difficile)
- Accès au détail d'une analyse
- Suppression d'une entrée (avec confirmation)
- Nouvelle analyse depuis l'historique

### Chat — Lyra (astrologue IA)
- Interface de chat en temps réel avec l'astrologue IA "Lyra"
- Contexte automatique : thème natal + profil de l'utilisateur
- Sélection d'un partenaire pour enrichir le contexte (thème + score de synastrie)
- Indicateur de saisie animé
- Historique de messages par session (stateless, 20 messages max)

### Transits
- **Onglet À venir** : 3 prochains transits significatifs avec date, titre, description et intensité (Major / Moderate / Minor)
- **Onglet Calendrier** : vue mensuelle des aspects par jour avec navigation mois par mois
  - Code couleur : Conjonction (or), Trigone (vert), Sextile (bleu), Carré (orange), Opposition (rouge)
- Interprétation IA de chaque transit

### Miroir Temporel
- Slider d'âge de 0 à 80 ans
- Affichage des transits planétaires actifs à chaque âge
- Niveau d'intensité global de l'année
- Interprétation IA de l'énergie dominante à un âge donné
- Épinglage d'un souvenir : associer une note à un âge précis (persistance locale)
- **Accès freemium** : âges 0–10 et âge actuel ±5 ans gratuits, reste en Premium

### Explorer
- Espace réservé pour de futures fonctionnalités

---

## Autres écrans

### Authentification
- **Connexion** : email / mot de passe, entrée animée
- **Inscription** : email, mot de passe (8 car. min.), confirmation, acceptation CGU
- **OAuth** : Google et Apple (infrastructure en place)

### Onboarding (post-inscription)
- Étape 1 : présentation des fonctionnalités clés
- Étape 2 : saisie du profil de naissance (nom, date, heure optionnelle, ville)
- Étape 3 : confirmation avec récapitulatif des accès
- Option "Passer" sur l'étape du profil

### Profil de naissance
- Saisie / modification : prénom, date de naissance, heure, ville
- Recherche de ville avec autocomplétion (coordonnées + fuseau horaire + DST)

### Premium
- Deux formules : Annuel (39,99 $/an) et Mensuel (5,99 $/mois)
- Essai gratuit 7 jours
- Comparatif des fonctionnalités incluses
- Restauration des achats

### Profil utilisateur
- Statut abonnement (Premium actif ou CTA upgrade)
- Raccourcis : thème natal, profil de naissance, historique
- Modification du profil de naissance
- Section légale : Politique de confidentialité, CGU, Mentions légales
- Suppression du compte (conforme RGPD)
- **Section développeur** (mode dev uniquement) :
  - Bascule serveur local / production
  - Bascule modèle IA : `gpt-4.1-mini` ↔ `gpt-4o`

---

## Fonctionnalités transverses

### Intelligence IA
- Prompts style Liz Greene / Howard Sasportas : direct, sans coaching ni positivité forcée
- Persona d'astrologue partagé entre tous les prompts
- Texte structuré en paragraphes courts (une idée par paragraphe)
- Prise en charge bilingue FR/EN dans les prompts

### Internationalisation
- Français et anglais
- Noms de planètes et signes traduits dans les prompts IA
- Formatage de dates localisé

### Système Premium (RevenueCat)
- Gestion des abonnements in-app (iOS / Android)
- Vérification côté backend des droits d'accès
- Plages d'âge débloquées retournées en cas de 403

### Performance & Cache
- Thème natal mis en cache (invalidé si le profil de naissance change)
- Horoscope quotidien mis en cache (1 génération par jour)
- Cache des transits natals (`natal_transit_cache`)

---

## API Backend (endpoints principaux)

| Endpoint | Description |
|---|---|
| `POST /api/register` | Créer un compte |
| `GET /api/me` | Profil utilisateur courant |
| `DELETE /api/user/account` | Supprimer le compte |
| `GET/POST/PUT /api/birth-profile` | Lire / créer / modifier le profil de naissance |
| `GET /api/astrology/natal-chart` | Calculer le thème natal |
| `GET /api/astrology/natal-chart/interpretation` | Interprétation IA du thème natal |
| `POST /api/astrology/synastry` | Calculer la compatibilité avec un partenaire |
| `GET /api/astrology/synastry/history` | Historique des analyses |
| `DELETE /api/astrology/synastry/history/{id}` | Supprimer une analyse |
| `GET /api/horoscope/daily` | Horoscope quotidien personnalisé |
| `GET /api/horoscope/headline` | Headline cosmique hebdomadaire |
| `GET /api/horoscope/transits` | 3 prochains transits significatifs |
| `POST /api/horoscope/transit-interpretation` | Interprétation IA d'un transit |
| `GET /api/horoscope/calendar` | Calendrier mensuel des aspects |
| `GET /api/chat/partners` | Liste des partenaires pour contexte chat |
| `POST /api/chat` | Envoyer un message à Lyra |
| `GET /api/mirror/transits?age=` | Transits à un âge donné (0–80) |
| `POST /api/mirror/interpret` | Interprétation IA de l'énergie à un âge |