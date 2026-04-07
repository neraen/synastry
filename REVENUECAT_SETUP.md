# RevenueCat — Guide de mise en place

> Tout ce que tu dois faire **manuellement** avant que les achats fonctionnent.
> Le code est déjà prêt — il ne manque que les clés et la configuration des stores.

---

## 1. Créer le compte RevenueCat

1. Va sur [app.revenuecat.com](https://app.revenuecat.com) → créer un compte
2. Créer un **nouveau Project** → nom : `Lunestia`

---

## 2. Ajouter les apps dans RevenueCat

### iOS
1. Dans le projet RC → **+ Add App** → choisir **App Store**
2. Remplir :
   - **App name** : Lunestia
   - **Bundle ID** : `com.astromatch.app`
3. Valider, puis dans les paramètres de l'app iOS :
   - Section **In-App Purchase Key** → upload ta clé `.p8`
     _(App Store Connect → Users & Access → Integrations → In-App Purchase)_
   - **Issuer ID** + **Key ID** (visibles sur la même page App Store Connect)
4. Optionnel mais recommandé : ajouter le **Shared Secret**
   _(App Store Connect → ton app → General → App Information → App-Specific Shared Secret → Manage)_

### Android
1. Dans le projet RC → **+ Add App** → choisir **Google Play**
2. Remplir :
   - **Package name** : `com.astromatch.app`
3. Dans les paramètres de l'app Android :
   - Upload le **Service Account JSON** de Google Play :
     - Google Play Console → Setup → API Access → Link to Google Cloud project
     - Google Cloud Console → IAM → Service Accounts → Create → télécharger le JSON
     - Donner les rôles `Financial data viewer` + `Developer` dans Play Console
   - Upload le JSON dans RevenueCat

---

## 3. Créer les produits dans RevenueCat

Dans RC → **Products** → **+ New Product** (répéter pour les deux) :

| Identifier | Type | Description |
|------------|------|-------------|
| `monthly_subscription:premium` | Auto-renewable subscription | Mensuel |
| `annual_subscription:premium` | Auto-renewable subscription | Annuel |

---

## 4. Créer l'Entitlement

RC → **Entitlements** → **+ New** :
- **Identifier** : `premium`
- Attacher les **deux produits** (`monthly_subscription:premium` + `annual_subscription:premium`)

---

## 5. Créer l'Offering

RC → **Offerings** → **+ New** :
- **Identifier** : `default`
- Ajouter un **Package** nommé `monthly` → pointer sur `monthly_subscription:premium`
- Ajouter un **Package** nommé `annual` → pointer sur `annual_subscription:premium`

---

## 6. Récupérer les clés API

RC → **Project Settings** → **API Keys** :

| Clé | Valeur | Où la mettre |
|-----|--------|-------------|
| **iOS Public Key** | `appl_xxxxxxxxxx` | `app/.env` → `EXPO_PUBLIC_RC_API_KEY_IOS` |
| **Android Public Key** | `goog_xxxxxxxxxx` | `app/.env` → `EXPO_PUBLIC_RC_API_KEY_ANDROID` |
| **Secret Key (v1)** | `sk_xxxxxxxxxx` | `backend/.env.local` → `REVENUECAT_SECRET_KEY` |

---

## 7. Configurer le Webhook

RC → **Project Settings** → **Integrations** → **Webhooks** → **+ Add endpoint** :
- **URL** : `https://astro-api.clement-silvestre.com/api/webhooks/revenuecat`
- **Authorization header** : choisir un mot de passe fort → le mettre dans `backend/.env.local` → `REVENUECAT_WEBHOOK_SECRET`

Événements à activer (tout cocher ou laisser "All events").

---

## 8. Créer les produits dans App Store Connect (iOS)

1. App Store Connect → ton app → **Monetization → Subscriptions**
2. Créer un **Subscription Group** (ex: "Premium")
3. Créer **2 produits** avec exactement ces identifiants :
   - `monthly_subscription:premium` → durée : 1 mois → prix : 7,99 €
   - `annual_subscription:premium` → durée : 1 an → prix : 49,99 €
4. Remplir les **localisations** (nom + description) en FR et EN
5. Les soumettre à **review** (ils passent en review avec le premier build)

---

## 9. Créer les produits dans Google Play Console (Android)

1. Google Play Console → ton app → **Monetization → Subscriptions**
2. Créer **2 abonnements** :
   - ID : `monthly_subscription:premium` → 7,99 € / mois
   - ID : `annual_subscription:premium` → 49,99 € / an
3. Ajouter les traductions FR + EN
4. Activer les abonnements (status : Active)

---

## 10. Variables d'environnement à ajouter

### `app/.env` (frontend)
```
EXPO_PUBLIC_RC_API_KEY_IOS=appl_xxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_RC_API_KEY_ANDROID=goog_xxxxxxxxxxxxxxxxxx
```

### `backend/.env.local` (backend)
```
REVENUECAT_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxx
REVENUECAT_WEBHOOK_SECRET=un-mot-de-passe-fort
```

---

## 11. Tester en sandbox

### iOS (Sandbox Tester)
1. App Store Connect → **Users & Access** → **Sandbox** → **+ Tester**
2. Créer un compte avec un email fictif (ex: `test.astromatch@icloud.com`)
3. Sur l'iPhone de test : Settings → App Store → Sandbox Account → se connecter
4. Lancer un EAS build (dev ou preview) → tester l'achat → il ne sera pas débité

### Android (License Testing)
1. Google Play Console → **Setup** → **License Testing** → ajouter ton email Gmail
2. Installer via internal testing track
3. Les achats sont gratuits pour les comptes en licence testing

---

## 12. Vérifier que tout fonctionne

Dans RC dashboard → **Customer Center** → chercher l'user par ID → tu verras ses entitlements actifs.

Pour tester le webhook : RC → **Project Settings** → **Integrations** → **Webhooks** → bouton **"Send test event"**.

---

## Récapitulatif des identifiants importants

| Élément | Valeur |
|---------|--------|
| Bundle ID iOS | `com.astromatch.app` |
| Package Android | `com.astromatch.app` |
| Entitlement RC | `premium` |
| Offering RC | `default` |
| Produit mensuel | `monthly_subscription:premium` |
| Produit annuel | `annual_subscription:premium` |
| Webhook URL | `https://astro-api.clement-silvestre.com/api/webhooks/revenuecat` |