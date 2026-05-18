# RevenueCat — Guide de configuration (Lunestia)

> Le code est pret. Ce guide couvre uniquement ce qu'il faut faire dans les dashboards.
> Tu testes sur **Android** en priorite — commence par les sections Android.

---

## Etat actuel

| Element | Statut |
|---------|--------|
| Package `react-native-purchases` installe | OK |
| Plugin Expo dans `app.json` | OK (corrige) |
| Cle API Android dans `.env` | OK |
| Cle API iOS dans `.env` | A faire (`todo` pour l'instant) |
| Service Account Google Play dans RC | A faire (warning present) |
| Produits Play Store dans RC | Crees mais en erreur |
| Offering `default` avec packages | A verifier / creer |

---

## Etape 1 — Corriger le Service Account Google Play

C'est le blocker principal. Sans ca, RC ne peut pas valider les produits → les offerings retournent vides.

### 1.1 Dans Google Play Console

1. Ouvre [play.google.com/console](https://play.google.com/console)
2. Menu → **Setup → API access**
3. Clique **"Link to a Google Cloud project"** (si pas deja fait)
4. Une fois lie, dans la section **Service accounts**, clique **"Create new service account"**
   - Le lien t'amene sur Google Cloud Console
   - Clique **"+ Create service account"**
   - Nom : `revenuecat` (ou ce que tu veux)
   - Clique **"Continue"**
   - Role : cherche et selectionne **"Financial data viewer"**
   - Clique **"Done"**
5. Sur l'ecran suivant, ouvre le service account cree → onglet **"Keys"**
6. **"Add key" → "Create new key" → JSON** → telecharge le fichier `.json`
7. Retourne dans Play Console → **Setup → API access**
8. Trouve ton service account → clique **"Grant access"**
9. Coche les permissions : **"View financial data"** + **"Manage orders and subscriptions"**
10. Sauvegarde

### 1.2 Dans RevenueCat Dashboard

1. Va sur [app.revenuecat.com](https://app.revenuecat.com) → ton projet → ton app **Android**
2. Section **"Google Play Service Account credentials"**
3. Upload le fichier JSON telecharge a l'etape 1.1
4. Sauvegarde

Le warning "connection issue" disparait en quelques minutes apres upload.

---

## Etape 2 — Creer les produits dans Google Play Console

Les produits doivent exister dans Play Console avant d'etre lies dans RC.

1. Play Console → ton app → **Monetize → Products → Subscriptions**
2. Clique **"Create subscription"** deux fois :

**Abonnement mensuel :**
- Product ID : `monthly_premium`
- Nom : Lunestia Premium Mensuel
- Prix de base : 7,99 EUR
- Periode de facturation : 1 mois

**Abonnement annuel :**
- Product ID : `annual_premium`
- Nom : Lunestia Premium Annuel
- Prix de base : 49,99 EUR
- Periode de facturation : 1 an

3. Active les deux (statut **"Active"**)

> Les Product IDs ne peuvent pas etre modifies apres activation. Bien verifier avant de confirmer.

---

## Etape 3 — Mettre a jour les produits dans RevenueCat

Si tu as deja des produits dans RC avec des IDs differents, il faut les supprimer et reconfigurer.

1. RC Dashboard → ton projet → **Products**
2. Supprime les anciens produits si les IDs ne correspondent pas
3. Cree deux nouveaux produits :

**Produit mensuel :**
- Store : **Google Play**
- Product identifier : `monthly_premium` (exactement comme dans Play Console)

**Produit annuel :**
- Store : **Google Play**
- Product identifier : `annual_premium`

---

## Etape 4 — Creer l'Entitlement

L'entitlement represente l'acces premium. Le code attend exactement l'identifiant `premium`.

1. RC Dashboard → **Entitlements** → **"+ New"**
2. Identifier : `premium` (en minuscules, sans espace)
3. Description : Acces Premium Lunestia
4. Sauvegarde
5. Ouvre l'entitlement → clique **"Attach"** → attache les deux produits (`monthly_premium` + `annual_premium`)

---

## Etape 5 — Creer l'Offering

L'offering est ce qui s'affiche dans l'ecran premium. Le code appelle l'offering `current` = l'offering marquee `default`.

1. RC Dashboard → **Offerings** → **"+ New offering"**
2. Identifier : `default`
3. Description : Offre principale
4. Sauvegarde
5. Dans l'offering, clique **"+ Add package"** :

**Package mensuel :**
- Identifier : `$rc_monthly`
- Attache le produit `monthly_premium` (Google Play)

**Package annuel :**
- Identifier : `$rc_annual`
- Attache le produit `annual_premium` (Google Play)

6. Assure-toi que l'offering `default` est bien marquee **"Current offering"** (bouton en haut a droite)

---

## Etape 6 — Rebuilder l'app Android

Le plugin `react-native-purchases` a ete ajoute a `app.json` — un nouveau build est necessaire.

```bash
cd app
eas build --platform android --profile preview
```

Installe le nouveau `.apk` sur ton tel et reteste l'ecran premium.

---

## Etape 7 — Quand tu passes a iOS

1. RC Dashboard → ton projet → **+ Add App → App Store**
   - Bundle ID : `com.clementsilvestre.lunestia`
2. Dans les reglages de l'app iOS dans RC :
   - Upload ta **cle `.p8`** In-App Purchase (App Store Connect → Users & Access → Integrations → In-App Purchase)
   - Renseigne l'**Issuer ID** et le **Key ID**
3. Cree les memes produits dans **App Store Connect** :
   - App Store Connect → ton app → Monetization → Subscriptions
   - Cree un Subscription Group → ajoute les deux produits avec les memes IDs
4. Ajoute les produits iOS dans RC et attache-les a l'entitlement `premium`
5. Mets a jour `app/.env` :
   ```
   EXPO_PUBLIC_RC_API_KEY_IOS=appl_xxxxxxxxxxxxxxxxxx
   ```

---

## Reference rapide — Identifiants importants

| Element | Valeur |
|---------|--------|
| Bundle ID iOS | `com.clementsilvestre.lunestia` |
| Package Android | `com.clementsilvestre.lunestia` |
| Entitlement RC | `premium` |
| Offering RC | `default` |
| Package mensuel RC | `$rc_monthly` |
| Package annuel RC | `$rc_annual` |
| Product ID mensuel | `monthly_premium` |
| Product ID annuel | `annual_premium` |
| Cle env Android | `EXPO_PUBLIC_RC_API_KEY_ANDROID` |
| Cle env iOS | `EXPO_PUBLIC_RC_API_KEY_IOS` |

---

## Comment le code detecte les packages

Dans `app/services/purchases.ts`, le matching se fait ainsi :

```
packageType === 'MONTHLY'  ou  identifier.includes('monthly')  →  package mensuel
packageType === 'ANNUAL'   ou  identifier.includes('annual')   →  package annuel
```

`$rc_monthly` et `$rc_annual` ont les types `MONTHLY` / `ANNUAL` par defaut dans RC — ca matchera automatiquement.
