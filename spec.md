# AstroMatch — Spécification Technique & Fonctionnelle

> Application mobile React Native (Expo) d'astrologie personnalisée avec analyses de compatibilité, horoscopes quotidiens et transits planétaires générés par IA.

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Architecture & Routing](#2-architecture--routing)
3. [Authentification](#3-authentification)
4. [Écrans — Tabs (navigation principale)](#4-écrans--tabs)
5. [Écrans — Standalone & Modales](#5-écrans--standalone--modales)
6. [Écrans — Demo (design showcase)](#6-écrans--demo)
7. [Services & API](#7-services--api)
8. [Composants UI](#8-composants-ui)
9. [Système de design (thème)](#9-système-de-design)
10. [Modèles de données](#10-modèles-de-données)
11. [Flows utilisateur](#11-flows-utilisateur)
12. [Monétisation Premium](#12-monétisation-premium)
13. [Backend — Endpoints](#13-backend--endpoints)

---

## 1. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework mobile | React Native + Expo (SDK 52) |
| Routing | Expo Router (file-based, Stack + Tabs) |
| Langage | TypeScript |
| Stockage sécurisé | `expo-secure-store` (tokens JWT) |
| Polices | Noto Serif (display) + Manrope (body) via `@expo-google-fonts` |
| Animations | React Native Animated API + `react-native-reanimated` |
| Gradients | `expo-linear-gradient` |
| UI Icons | `@expo/vector-icons` (Feather) |
| Internationalisation | i18n (module `@/i18n`) — Français principal |
| Backend | Symfony (PHP) — API REST avec JWT |
| IA | OpenAI GPT-4.1-mini |
| Calculs astro | PlanetaryCalculator (PHP maison) |

---

## 2. Architecture & Routing

### Structure des fichiers

```
app/
├── _layout.tsx              ← Root layout (fonts, auth provider, theme)
├── (tabs)/
│   ├── _layout.tsx          ← Tab navigator (auth guard)
│   ├── index.tsx            ← Accueil / Dashboard
│   ├── daily-horoscope.tsx  ← Horoscope du jour
│   ├── horoscope.tsx        ← Thème natal (onglet)
│   ├── compatibility.tsx    ← Analyse de compatibilité
│   ├── history.tsx          ← Historique des analyses
│   ├── profile.tsx          ← Profil utilisateur
│   └── explore.tsx          ← (Bientôt disponible)
├── login.tsx                ← Connexion (modale)
├── signup.tsx               ← Inscription (modale)
├── birth-profile.tsx        ← Profil de naissance (modale)
├── natal-chart.tsx          ← Thème natal plein écran
├── synastry.tsx             ← Analyse synastrie (standalone)
├── synastry-detail.tsx      ← Détail d'une analyse sauvegardée
├── transits.tsx             ← Prochains transits planétaires
├── premium.tsx              ← Paywall abonnement (modale)
├── privacy-policy.tsx       ← Politique de confidentialité (modale)
├── terms-of-service.tsx     ← Conditions d'utilisation (modale)
├── legal-notice.tsx         ← Mentions légales (modale)
└── demo/
    ├── _layout.tsx
    ├── home.tsx
    ├── matches.tsx
    ├── profile-view.tsx
    ├── login.tsx
    └── share.tsx
```

### Arbre de navigation

```
Root Stack
├── (tabs)                          → headerShown: false
│   ├── index                       → Tab "Home" (caché du menu)
│   ├── daily-horoscope             → Tab "Horoscope du jour"
│   ├── horoscope                   → Tab "Thème natal"
│   ├── compatibility               → Tab "Compatibilité"
│   ├── history                     → Tab "Historique"
│   └── profile                     → Tab "Profil"
├── demo                            → headerShown: false
├── login                           → modal, headerShown: false
├── signup                          → modal, headerShown: false
├── birth-profile                   → modal, headerShown: false
├── natal-chart                     → headerShown: false
├── synastry                        → headerShown: false
├── synastry-detail                 → headerShown: false
├── transits                        → headerShown: false
├── premium                         → modal, headerShown: false
├── privacy-policy                  → modal, headerShown: false
├── terms-of-service                → modal, headerShown: false
└── legal-notice                    → modal, headerShown: false
```

### Garde d'authentification (tabs `_layout.tsx`)

- Vérifie `isAuthenticated` via `useAuth()`
- Si non authentifié → `router.replace('/login')`
- Affiche un loader pendant `isLoading`
- Tab bar custom : glassmorphique, 5 icônes visibles, style actif avec tint or

---

## 3. Authentification

### Flux

```
App launch
  └── checkAuth() → token en SecureStore ?
        ├── Oui → getStoredUser() → hydrate AuthContext
        └── Non → (tabs) redirige vers /login

/login ou /signup
  └── Succès API → store tokens + user → replace('/(tabs)')

Session expirée (401 API)
  └── onSessionExpired() → setUser(null) → redirect login
```

### AuthContext

| Propriété / Méthode | Type | Description |
|---------------------|------|-------------|
| `user` | `User \| null` | Utilisateur courant |
| `isLoading` | `boolean` | État de chargement initial |
| `isAuthenticated` | `boolean` | Dérivé de `!!user` |
| `login(credentials)` | `Promise<void>` | Connexion email/password |
| `register(data)` | `Promise<void>` | Inscription + auto-login |
| `logout()` | `Promise<void>` | Supprime tokens, reset state |
| `deleteAccount()` | `Promise<void>` | Suppression définitive |
| `refreshUser()` | `Promise<void>` | Recharge depuis `/api/me` |
| `loginWithGoogle(idToken)` | `Promise<void>` | OAuth Google |
| `loginWithApple(idToken, userInfo?)` | `Promise<void>` | OAuth Apple |

### Stockage sécurisé

| Clé | Contenu |
|-----|---------|
| `astromatch_token` | JWT access token |
| `astromatch_refresh_token` | Refresh token |
| `astromatch_user` | User sérialisé (JSON) |

---

## 4. Écrans — Tabs

### 4.1 Accueil / Dashboard — `(tabs)/index.tsx`

**Route** : `/(tabs)` (index, caché de la nav)
**Auth requise** : Oui

**Contenu :**
- **Header** : Logo "✦ AstroMatch" (cliquable → `/transits`) + avatar utilisateur (cliquable → `/profile`)
- **Hero** : Titre éditorial "Venus in Retrograde" + sous-titre
- **Compatibility Card** : Badge "DAILY ALIGNMENT", score 88%, progress ring cosmique, bouton "ANALYZE A NEW MATCH" → `/compatibility`
- **Insight Cards** (2 cartes) :
  - "Your birth chart" avec symboles ☀ ☽ ↑ → `/natal-chart`
  - "Daily insights" avec citation → `/daily-horoscope`
- **Transit Timeline** : 2 premiers transits dynamiques chargés via API, bouton "VIEW ALL" → `/transits`

**API appelées :**
- `getUpcomingTransits()` — pour la timeline (avec skeleton loading)

**Navigation sortante :**
- `/transits` (logo + "VIEW ALL")
- `/profile` (avatar)
- `/compatibility` (CTA card)
- `/natal-chart` (insight card)
- `/daily-horoscope` (insight card)

---

### 4.2 Horoscope du jour — `(tabs)/daily-horoscope.tsx`

**Route** : `/(tabs)/daily-horoscope`
**Auth requise** : Oui + Profil de naissance requis

**Contenu :**
- **Badge** : "HOROSCOPE DU JOUR" avec point animé
- **Titre** : Titre IA du jour (ex : "Mercure en maison 5")
- **Date** : Formatée en français
- **4 sections de contenu** :
  - `APERÇU` — Vue générale (couleur or)
  - `AMOUR` — Thématique amoureuse (couleur rose #ec4899)
  - `ÉNERGIE` — Niveau et type d'énergie (couleur secondaire)
  - `CONSEIL` — Conseil actionnable du jour
- **Bouton rafraîchir** : Icône ↻, régénère si cooldown 24h écoulé
- **Disclaimer IA** en pied de page
- **États vides** :
  - Non authentifié → message + bouton connexion
  - Pas de profil de naissance → message + bouton compléter profil
  - Loading → ActivityIndicator

**API appelées :**
- `getDailyHoroscope(refresh?)` → `GET /api/horoscope/daily`

---

### 4.3 Thème Natal — `(tabs)/horoscope.tsx`

**Route** : `/(tabs)/horoscope`
**Auth requise** : Oui + Profil de naissance requis

**Contenu :**
- **Header** avec badge "THÈME NATAL" et bouton refresh
- **Grille de planètes** (2 colonnes) : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Ascendant, MC
  - Chaque carte : symbole planétaire, nom français, signe + degrés, badge ℞ si rétrograde
- **Section interprétation IA** :
  - Bouton "Générer l'interprétation" (si non générée)
  - Texte complet si déjà généré
  - Bouton copier dans le presse-papier
  - Indicateur de chargement pendant génération
- **Disclaimer IA**
- **États** : loading, erreur, pas de profil

**API appelées :**
- `getNatalChart(refresh?)` → `GET /api/astrology/natal-chart`
- `getNatalChartInterpretation()` → `GET /api/astrology/natal-chart/interpretation`

---

### 4.4 Compatibilité — `(tabs)/compatibility.tsx`

**Route** : `/(tabs)/compatibility`
**Auth requise** : Oui + Profil de naissance requis

**Vue 1 — Formulaire :**
- Champ nom du partenaire
- Sélecteur de date de naissance
- Sélecteur d'heure (optionnel)
- Recherche de ville (modale autocomplete)
  - Affiche ville + pays + coordonnées
- Question personnalisée (optionnel)
- Bouton "ANALYSER"
- Affichage des erreurs

**Vue 2 — Résultats :**
- Paire de signes zodiacaux (cercles animés)
- Noms + ❤
- Score global (grand chiffre %)
- 4 jauges de dimensions :
  - Amour, Communication, Attirance, Long terme
- Section "Celestial Insights" (analyse IA)
- Section "Conseil"
- Bouton partage (`CompatibilityShareButton`)
- Bouton "Nouvelle analyse"
- Disclaimer IA

**API appelées :**
- `calculateSynastry(partnerData)` → `POST /api/astrology/synastry`
- `searchCities(query)` → `GET /api/cities/search?q=`
- `calculateTimezoneForBirthDate()` — calcul local DST

---

### 4.5 Historique — `(tabs)/history.tsx`

**Route** : `/(tabs)/history`
**Auth requise** : Oui

**Contenu :**
- **Header** avec salutation prénom
- **Liste** des analyses passées (FlatList avec pull-to-refresh)
  - Chaque carte : noms partenaires, date, score, label textuel (Âmes sœurs / Très compatible / Compatible / …)
  - Bouton "VIEW DETAILS" → `/synastry-detail?id={id}`
  - Bouton supprimer (alerte de confirmation)
- **État vide** : illustration + CTA "Créer une analyse"
- **État erreur** : message + bouton réessayer
- **Loading** : skeleton ou spinner

**API appelées :**
- `getSynastryHistory()` → `GET /api/astrology/synastry/history`
- `deleteSynastryHistoryEntry(id)` → `DELETE /api/astrology/synastry/history/{id}`

---

### 4.6 Profil — `(tabs)/profile.tsx`

**Route** : `/(tabs)/profile`
**Auth requise** : Oui

**Contenu :**
- **Header** : Logo AstroMatch
- **Hero avatar** :
  - Anneau gradient or + initiale de l'utilisateur
  - Point vert "en ligne"
  - Prénom + email
  - Chip statut profil (COMPLET / INCOMPLET)
- **Card Abonnement** :
  - Si premium actif → card gradient or "Premium actif" + date de renouvellement + badge "ACTIF"
  - Si non premium → card glass "Passer Premium" + sous-titre + bouton "VOIR" → `/premium`
- **Raccourci thème natal** (si profil complet) : nom, sous-titre, bouton "VOIR" → `/natal-chart`
- **Section MON PROFIL** : bouton "Modifier/Compléter le profil de naissance" → `/birth-profile`
- **Section PRÉFÉRENCES** :
  - Politique de confidentialité → `/privacy-policy`
  - Conditions d'utilisation → `/terms-of-service`
  - Mentions légales → `/legal-notice`
  - Se déconnecter (rouge)
- **Suppression de compte** : lien texte → modale de confirmation
- **Section DESIGN DEMO** : liens rapides vers les écrans de démo

**Actions :**
- `logout()`
- `deleteAccount()` (avec confirmation modale + loading)

---

### 4.7 Explorer — `(tabs)/explore.tsx`

**Route** : `/(tabs)/explore`
**Statut** : Placeholder

**Contenu :** Message "Bientôt disponible" avec icône et sous-titre.

---

## 5. Écrans — Standalone & Modales

### 5.1 Connexion — `login.tsx`

**Route** : `/login`
**Présentation** : Modale
**Auth requise** : Non

**Contenu :**
- Animations d'entrée (fade + translateY)
- Logo + badge
- Headline "Découvrez votre vraie compatibilité"
- Preuve sociale : avatars empilés + "12K+ utilisateurs"
- **Formulaire** (GlassCard) :
  - Input email
  - Input password (masqué)
  - Affichage erreur stylisé
- Bouton primaire "Se connecter" (GoldButton)
- Divider "OU"
- Bouton secondaire "Créer un compte" → `/signup`
- Éléments décoratifs étoiles

**API appelées :** `login(email, password)` → `POST /api/login`

---

### 5.2 Inscription — `signup.tsx`

**Route** : `/signup`
**Présentation** : Modale
**Auth requise** : Non

**Contenu :**
- Logo + retour vers login
- **Formulaire** :
  - Input email
  - Input password (min 8 caractères)
  - Input confirmation password
  - Checkbox consentement CGU avec liens vers `/terms-of-service` et `/privacy-policy`
  - Validation : correspondance mots de passe + longueur minimale
  - Affichage erreurs
- Bouton "Créer mon compte" (GoldButton)
- Lien "Se connecter" → `/login`

**API appelées :** `register(email, password)` → `POST /api/register` puis auto-login

---

### 5.3 Profil de naissance — `birth-profile.tsx`

**Route** : `/birth-profile`
**Présentation** : Modale
**Auth requise** : Oui

**Contenu :**
- Header "Mon profil astrologique" + bouton annuler
- **Formulaire** :
  - Prénom (optionnel)
  - Date de naissance (DatePicker, max = aujourd'hui)
  - Heure de naissance (TimePicker, optionnel)
  - Ville de naissance :
    - Champ de recherche avec autocomplete
    - Modale de résultats (FlatList)
    - Affiche : ville, pays, coordonnées lat/lon
- Bouton "Enregistrer"
- Erreur affichée sous le formulaire

**API appelées :**
- `getBirthProfile()` → `GET /api/birth-profile` (pré-remplissage)
- `saveBirthProfile(data)` → `POST /api/birth-profile`
- `searchCities(query)` → `GET /api/cities/search?q=`

**Post-save :** `refreshUser()` puis `router.back()`

---

### 5.4 Thème natal plein écran — `natal-chart.tsx`

**Route** : `/natal-chart`
**Auth requise** : Oui + Profil de naissance requis

**Contenu :**
- Bouton retour
- Hero "Votre ADN cosmique"
- Grille 2 colonnes de planètes principales (même logique que l'onglet horoscope)
- Section interprétation IA (avec loading + copier)
- Bouton CTA vers `/synastry`
- Disclaimer IA

**API appelées :** identiques à `(tabs)/horoscope.tsx`

---

### 5.5 Synastrie — `synastry.tsx`

**Route** : `/synastry`
**Auth requise** : Oui + Profil de naissance requis

**Contenu :**
- Header "Analyse de compatibilité" + retour
- **Formulaire** identique à `(tabs)/compatibility.tsx` avec champ question optionnel
- **Résultats** :
  - Paire zodiacale animée
  - Score + dimensions
  - Texte d'analyse
  - Bouton "Voir les détails" → `/synastry-detail?id={historyId}`
  - Bouton partage

**API appelées :** identiques à `(tabs)/compatibility.tsx`

---

### 5.6 Détail d'analyse — `synastry-detail.tsx`

**Route** : `/synastry-detail?id={historyId}`
**Auth requise** : Oui

**Contenu :**
- Header "Compatibilité" + retour vers historique
- Paire zodiacale en glass
- Noms + ❤
- **Score card** :
  - Score en grand
  - Barre de progression (gradient or)
  - 4 dimensions avec icônes émoji (💕 🗣️ ⚡ 💍) et scores
  - Citation headline si disponible
- Bouton partage
- **Analyse complète** (GlassCard + copier)
- **Forces & Défis** (grille 2 colonnes)
- **Conseil** (card dédiée)
- Date de l'analyse
- Disclaimer IA
- Animation d'entrée (fade + scale)

**API appelées :**
- `getSynastryHistoryDetail(id)` → `GET /api/astrology/synastry/history/{id}`

---

### 5.7 Prochains Transits — `transits.tsx`

**Route** : `/transits`
**Auth requise** : Oui + Profil de naissance requis
**Accès** : Logo header home + bouton "VIEW ALL" dans la timeline

**Contenu :**
- Header "✦ Prochains Transits" + bouton retour
- **Hero** : "Alignements à venir" + sous-titre
- **Badge** : "ANALYSE PERSONNALISÉE PAR IA"
- **Timeline verticale de 3 transits** :
  - Point coloré selon intensité + ligne de connexion
  - Badge intensité : MAJEUR (or) / MODÉRÉ (lavande) / LÉGER (gris)
  - Date du transit
  - Titre (ex : "Jupiter Trigone Soleil")
  - Description personnalisée (1-2 phrases)
- **Pull-to-refresh** : recharge depuis l'API
- **Skeleton loading** (3 cartes fantômes)
- **État erreur** : message + bouton réessayer

**API appelées :**
- `getUpcomingTransits()` → `GET /api/horoscope/transits`

---

### 5.8 Premium — `premium.tsx`

**Route** : `/premium`
**Présentation** : Modale
**Auth requise** : Non (accessible depuis profil)

**Contenu :**
- Bouton fermer (✕)
- **Badge** : "★ FOR PREMIUM MEMBERS"
- **Headline** : "Unlock your full compatibility"
- **Sous-titre** : "Guided by the stars, refined for your soul"
- **3 fonctionnalités** :
  - ✦ Full analysis
  - ∞ Unlimited matches
  - ◈ Advanced insights
- **2 plans sélectionnables** :
  - `ANNUAL` $19.99/yr — GlassCard + badge "Best value"
  - `MONTHLY` $9.99/mo — Card gradient or (sélectionné par défaut)
- Bouton CTA "START PREMIUM" (GoldButton)
- Texte légal : "Cancel anytime · Renews automatically · Restore purchase"

**TODO** : Intégration RevenueCat ou Stripe

---

### 5.9 Écrans légaux

| Écran | Route | Contenu |
|-------|-------|---------|
| Politique de confidentialité | `/privacy-policy` | Texte complet RGPD |
| Conditions d'utilisation | `/terms-of-service` | CGU |
| Mentions légales | `/legal-notice` | Mentions légales FR |

Tous utilisant le composant `LegalScreen` (ScrollView + header + retour).

---

## 6. Écrans — Demo

Accessibles depuis le bouton "DESIGN DEMO" dans le profil. Pas d'authentification requise.

| Route | Contenu |
|-------|---------|
| `/demo/home` | Showcase du design system complet (header, cards, timeline, insights) |
| `/demo/matches` | UI de résultats de compatibilité |
| `/demo/profile-view` | Affichage de profil utilisateur |
| `/demo/login` | UI de connexion |
| `/demo/share` | UI de partage de résultats |

---

## 7. Services & API

### `services/api.ts` — Client HTTP de base

- Injecte le token JWT dans le header `Authorization: Bearer`
- Refresh automatique sur erreur 401
- Déclenche l'événement `sessionExpired` si refresh échoue
- Méthodes : `get<T>()`, `post<T>()`, `put<T>()`, `delete<T>()`

### `services/auth.ts`

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `login(credentials)` | POST | `/api/login` | Retourne tokens + user |
| `register(data)` | POST | `/api/register` | Crée le compte |
| `fetchProfile()` | GET | `/api/me` | Profil frais depuis l'API |
| `logout()` | — | — | Vide le SecureStore |
| `deleteAccount()` | DELETE | `/api/me` | Suppression définitive |

### `services/astrology.ts`

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `getNatalChart(refresh?)` | GET | `/api/astrology/natal-chart` | Positions planétaires du thème natal |
| `getNatalChartInterpretation()` | GET | `/api/astrology/natal-chart/interpretation` | Interprétation IA |
| `getDailyHoroscope(refresh?)` | GET | `/api/horoscope/daily` | Horoscope IA du jour |
| `getUpcomingTransits()` | GET | `/api/horoscope/transits` | 3 prochains transits IA |
| `calculateSynastry(data)` | POST | `/api/astrology/synastry` | Analyse de compatibilité |
| `getSynastryHistory()` | GET | `/api/astrology/synastry/history` | Liste historique |
| `getSynastryHistoryDetail(id)` | GET | `/api/astrology/synastry/history/{id}` | Détail d'une analyse |
| `deleteSynastryHistoryEntry(id)` | DELETE | `/api/astrology/synastry/history/{id}` | Suppression |
| `createCompatibilityShare(id)` | POST | `/api/compatibility/share` | Génère un lien de partage |
| `getPublicShare(shareId)` | GET | `/api/share/{shareId}` | Données publiques partagées |

**Fonctions utilitaires (locales) :**
- `getZodiacSignFr(sign)` — traduction anglais → français
- `getPlanetNameFr(planet)` — idem pour les planètes
- `formatDegree(position, sign)` — formatage "24°27' Taureau"
- `getMainPlanets(positions)` — filtre les planètes principales
- `getZodiacSign(code)` — retourne symbole + nom

### `services/birthProfile.ts`

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `getBirthProfile()` | GET | `/api/birth-profile` | Récupère le profil de naissance |
| `saveBirthProfile(data)` | POST | `/api/birth-profile` | Crée ou met à jour |
| `searchCities(query)` | GET | `/api/cities/search?q=` | Autocomplete villes |
| `calculateTimezoneForBirthDate(tz, date)` | — | — | Calcul local DST |

### `services/sessionManager.ts`

- `onSessionExpired(callback)` — abonnement aux événements de session expirée
- Déclenché par `api.ts` sur 401 non récupérable

---

## 8. Composants UI

### Composants du nouveau système (glassmorphisme)

| Composant | Fichier | Props clés | Usage |
|-----------|---------|------------|-------|
| `GlassCard` | `GlassCard.tsx` | `opacity` (low/medium/high), `radius`, `padding`, `ambient` | Conteneur principal de toutes les cards |
| `GoldButton` | `GoldButton.tsx` | `label`, `onPress`, `size`, `rightIcon`, `loading` | CTA primaires |
| `GhostButton` | `GhostButton.tsx` | `label`, `onPress`, `size`, `disabled` | Actions secondaires |
| `CelestialText` | `CelestialText.tsx` | `variant`, `color`, `align` | Texte stylisé |
| `CelestialChip` | `CelestialChip.tsx` | `label`, `icon`, `color` | Badges/chips |
| `CosmicProgressRing` | `CosmicProgressRing.tsx` | `percentage`, `size` | Anneau de progression animé |
| `SectionHeader` | `SectionHeader.tsx` | `label`, `action` | Titres de sections |
| `NavBar` | `NavBar.tsx` | — | Barre de navigation tabs custom |
| `AppHeader` | `AppHeader.tsx` | `userName`, `onBack?` | Header d'écran |
| `TransitCard` | `TransitCard.tsx` | `date`, `title`, `intensity` | Carte de transit |
| `GhostButton` | `GhostButton.tsx` | `label`, `onPress` | Bouton glass secondaire |

### Composants legacy (compatibilité)

| Composant | Usage |
|-----------|-------|
| `Screen` | Wrapper d'écran (scroll/form/static) |
| `AppText`, `AppHeading` | Typographies |
| `AppInput`, `AppDatePicker`, `AppTimePicker` | Formulaires |
| `AppButton`, `GradientButton` | Anciens boutons |
| `ZodiacCircle`, `ZodiacPair` | Affichage signes |
| `ProgressBar`, `ScoreRow` | Affichage scores |
| `LoadingState`, `EmptyState` | États |
| `CopyableText` | Texte copiable |
| `CompatibilityShareButton`, `CompatibilityShareCard` | Partage |
| `LegalScreen` | Wrapper écrans légaux |

---

## 9. Système de design

### Couleurs (toutes définies dans `theme/index.ts`)

| Token | Valeur | Usage |
|-------|--------|-------|
| `primary` | `#e9c349` | Or — CTAs, accents, badges |
| `primaryContainer` | `#866a00` | Or foncé — gradient secondaire |
| `secondary` | `#c8bfff` | Lavande — accents secondaires |
| `secondaryContainer` | `#440fdb` | Violet — pools de lumière |
| `surfaceLowest` | `#130827` | Fond le plus foncé |
| `surfaceLow` | `#1e1338` | Fond secondaire |
| `surfaceContainer` | `#231942` | Cartes de niveau 1 |
| `surfaceContainerHigh` | `#2f2444` | Cartes de niveau 2 |
| `surfaceContainerHighest` | `#3a2f50` | Éléments interactifs |
| `onSurface` | `#ebdcff` | Texte principal |
| `onSurfaceMuted` | `#a89ec0` | Texte secondaire/muted |
| `outline` | `#474556` | Contours très subtils |
| `error` | `#cf6679` | Erreurs |

### Règles de design (CLAUDE.md)

1. **Toutes les couleurs** viennent de `theme/index.ts` — jamais de hex hardcodés
2. **Pas de bordures 1px solid** — les séparations se font par décalage de couleur de fond
3. **Cards = GlassCard** avec opacity 0.4–0.6 + backdropFilter blur
4. **CTAs = GoldButton** (gradient) ou **GhostButton** (glass)
5. **Polices** : Noto Serif (titres), Manrope (corps)
6. **Shadows** : ambiant uniquement (40px blur, offset 0, opacity 6%, couleur #ebdcff)
7. **Border radius** : `full` pour boutons, `xl` (3rem) conteneurs, `md` (1.5rem) éléments internes
8. **Espacement entre sections** : 32px ou 48px — jamais de séparateurs

### Typographie

| Style | Police | Taille | Usage |
|-------|--------|--------|-------|
| `displayLg` | Noto Serif Bold | 56px | Héros, scores |
| `displayMd` | Noto Serif Bold | 45px | Titres hero |
| `headlineLg` | Noto Serif Bold | 32px | Titres principaux |
| `headlineMd` | Noto Serif Medium | 28px | Titres secondaires |
| `titleLg` | Manrope Medium | 22px | Titres de sections |
| `titleMd` | Manrope SemiBold | 16px | Titres de cartes |
| `bodyLg` | Manrope Regular | 16px | Corps principal |
| `bodyMd` | Manrope Regular | 14px | Corps secondaire |
| `labelMd` | Manrope SemiBold | 12px | Labels, uppercase |
| `labelSm` | Manrope Medium | 11px | Petits labels |

### Espacement

```
xs: 4    sm: 8    md: 12    lg: 16    xl: 24    xxl: 32    xxxl: 48    section: 64
```

---

## 10. Modèles de données

### User
```typescript
interface User {
  id: number;
  email: string;
  roles: string[];
  hasBirthProfile: boolean;
  birthProfile?: BirthProfileData | null;
  isPremium?: boolean;
  premiumUntil?: string | null; // ISO date
}
```

### BirthProfileData
```typescript
interface BirthProfileData {
  id: number;
  firstName?: string;
  birthDate: string;       // YYYY-MM-DD
  birthTime?: string;      // HH:MM
  birthCity: string;
  birthCountry?: string;
  latitude: number;
  longitude: number;
  timezone?: number;       // offset UTC en heures
}
```

### PlanetPosition
```typescript
interface PlanetPosition {
  Position: number;    // position en degrés (0–360)
  Sign: string;        // "Aries", "Taurus", etc.
  Retrograde: string;  // "Yes" | "No"
}
```

### DailyHoroscope
```typescript
interface DailyHoroscope {
  title: string;
  overview: string;
  love: string;
  energy: string;
  advice: string;
  date: string;    // YYYY-MM-DD
  cached: boolean;
}
```

### UpcomingTransit
```typescript
interface UpcomingTransit {
  date: string;                          // ex : "Apr 2 – Apr 5"
  title: string;                         // ex : "Jupiter Trine Sun"
  description: string;                   // 1-2 phrases, impact personnel
  intensity: 'high' | 'medium' | 'low';
}
```

### SynastryResponse
```typescript
interface SynastryResponse {
  success: boolean;
  historyId?: number;
  compatibilityScore?: number;   // 0–100
  analysis?: string;             // texte markdown
  details?: {
    headline?: string;
    resume?: string;
    forces?: string[];
    tensions?: string[];
    conseil?: string;
    dimensions?: Array<{ nom: string; score: number; description: string }>;
    aspect_cle?: { planetes: string; impact: string };
  };
  user?: { name: string; chart: { planetaryPositions: Record<string, PlanetPosition> } };
  partner?: { name: string; positions: Record<string, PlanetPosition> };
  error?: string;
}
```

### SynastryHistorySummary
```typescript
interface SynastryHistorySummary {
  id: number;
  partnerName: string;
  compatibilityScore: number | null;
  createdAt: string;
}
```

---

## 11. Flows utilisateur

### Onboarding (premier lancement)
```
Lancement → (tabs) → redirect /login
/login → "Créer un compte" → /signup
/signup → succès → /(tabs)
/(tabs) → "Profil incomplet" → /birth-profile
/birth-profile → save → /(tabs) [profil complet]
```

### Analyse de compatibilité
```
/(tabs)/compatibility
  → Formulaire partenaire (nom, date, heure, ville)
  → API calculateSynastry()
  → Résultats (score + dimensions + analyse)
  → Partage (CompatibilityShareButton)
  → "Voir les détails" → /synastry-detail?id=X
  → Historique consultable depuis /(tabs)/history
```

### Consultation des transits
```
/(tabs)/index → clic logo "✦ AstroMatch"
  → /transits
  → API getUpcomingTransits()
  → Timeline 3 transits (loading skeleton pendant fetch)
  → Pull-to-refresh pour actualiser
```

### Upgrade Premium
```
/(tabs)/profile → card "Passer Premium" → /premium (modale)
/premium → sélection plan → "START PREMIUM"
  → [TODO: RevenueCat/Stripe]
  → retour profil avec isPremium = true
```

### Session expirée
```
Appel API → 401 → tentative refresh token
  ├── Refresh OK → retry requête originale
  └── Refresh KO → onSessionExpired() → setUser(null)
        → (tabs) redirect → /login
```

---

## 12. Monétisation Premium

### Plans

| Plan | Prix | Avantages affichés |
|------|------|--------------------|
| Annuel | $19.99/yr | Best celestion alignment, Unlimited synastry |
| Mensuel | $9.99/mo | Everything included, 10 synastries, Priority chart reads |

### Fonctionnalités premium (à implémenter)
- Analyses de compatibilité illimitées
- Insights avancés complets
- Priorité génération IA

### Intégration
- **TODO** : RevenueCat (recommandé) ou Stripe
- Champ `isPremium` + `premiumUntil` déjà présents dans `User`
- Card premium dans le profil gère les deux états (actif / inactif)

---

## 13. Backend — Endpoints

> Toutes les routes authentifiées nécessitent `Authorization: Bearer {token}`.
> Le header `Accept-Language` contrôle la langue des réponses IA (fr/en).

### Auth
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/login` | Non | Connexion email/password → JWT |
| POST | `/api/register` | Non | Inscription |
| GET | `/api/me` | Oui | Profil utilisateur courant |
| DELETE | `/api/me` | Oui | Suppression du compte |
| POST | `/api/auth/google` | Non | OAuth Google |
| POST | `/api/auth/apple` | Non | OAuth Apple |

### Profil de naissance
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/birth-profile` | Oui | Récupère le profil de naissance |
| POST | `/api/birth-profile` | Oui | Crée ou met à jour |
| GET | `/api/cities/search?q=` | Oui | Autocomplete villes |

### Astrologie
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/astrology/natal-chart` | Oui | Positions planétaires calculées |
| GET | `/api/astrology/natal-chart/interpretation` | Oui | Interprétation IA du thème natal |
| POST | `/api/astrology/synastry` | Oui | Calcul de compatibilité avec partenaire externe |
| GET | `/api/astrology/synastry/history` | Oui | Liste des analyses passées |
| GET | `/api/astrology/synastry/history/{id}` | Oui | Détail d'une analyse |
| DELETE | `/api/astrology/synastry/history/{id}` | Oui | Suppression d'une analyse |

### Horoscope & Transits
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/horoscope/daily` | Oui | Horoscope du jour (cache 24h) |
| GET | `/api/horoscope/daily?refresh=true` | Oui | Force régénération |
| GET | `/api/horoscope/transits` | Oui | 3 prochains transits significatifs (IA) |

### Partage
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/compatibility/share` | Oui | Génère lien de partage public |
| GET | `/api/share/{shareId}` | Non | Données publiques partagées |

---

*Généré le 22 mars 2026 — AstroMatch v1.0*