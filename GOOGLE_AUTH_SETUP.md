r3pa# Configuration Google Sign-In

Guide complet pour configurer Google OAuth sur Google Cloud Console pour AstroMatch (Expo + Symfony).

---

## 1. Créer/sélectionner un projet

1. Va sur **console.cloud.google.com**
2. En haut à gauche, clique sur le sélecteur de projet → **"Nouveau projet"**
3. Nom : `AstroMatch` → **Créer**

---

## 2. Activer les APIs nécessaires

1. Menu gauche → **"API et services"** → **"Bibliothèque"**
2. Cherche **"Google People API"** → **Activer**
3. Cherche **"Identity Toolkit API"** → **Activer**

---

## 3. Configurer l'écran de consentement OAuth

1. Menu gauche → **"API et services"** → **"Écran de consentement OAuth"**
2. Type d'utilisateur : **Externe** → **Créer**
3. Remplis :
   - Nom de l'application : `AstroMatch`
   - E-mail d'assistance : ton adresse email
   - Domaine autorisé : ton domaine backend (ex: `astromatch.app`)
4. **Enregistrer et continuer** (Portées et Utilisateurs tests peuvent rester vides en dev)

> En production : retourner ici → **"Publier l'application"** pour lever la restriction aux utilisateurs tests.

---

## 4. Créer les 3 Client IDs OAuth

### 4a. Client ID Web — pour le backend Symfony

1. **"Identifiants"** → **"+ Créer des identifiants"** → **"ID client OAuth 2.0"**
2. Type : **Application Web**
3. Nom : `AstroMatch Web`
4. **Origines JavaScript autorisées** : `https://ton-domaine-backend.com`
5. **URI de redirection autorisés** : `https://ton-domaine-backend.com/api/auth/google/callback`
6. → **Créer** — note le **Client ID** et le **Client Secret**

### 4b. Client ID iOS — pour Expo sur iPhone

1. **"+ Créer des identifiants"** → **"ID client OAuth 2.0"**
2. Type : **iOS**
3. Bundle ID : ton bundle ID Expo tel que défini dans `app.json` (ex: `com.tonnom.astromatch`)
4. → **Créer** — note le **Client ID iOS**

### 4c. Client ID Android — pour Expo sur Android

1. **"+ Créer des identifiants"** → **"ID client OAuth 2.0"**
2. Type : **Android**
3. Nom du package : même valeur que le bundle ID (`com.tonnom.astromatch`)
4. **Empreinte SHA-1** — génère-la avec :
   ```bash
   # Keystore de debug (dev)
   keytool -list -v \
     -keystore ~/.android/debug.keystore \
     -alias androiddebugkey \
     -storepass android \
     -keypass android
   ```
   Ou via Expo :
   ```bash
   npx expo credentials:manager
   ```
   Copie le SHA-1 affiché et colle-le dans le formulaire.
5. → **Créer** — note le **Client ID Android**

---

## 5. Variables d'environnement

### Backend — `backend/.env.local`

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

### Frontend — `app/app.json`

```json
{
  "expo": {
    "plugins": [
      ["@react-native-google-signin/google-signin", {
        "iosUrlScheme": "com.googleusercontent.apps.TON_CLIENT_ID_IOS_SANS_APPS_SUFFIX"
      }]
    ]
  }
}
```

> Le `iosUrlScheme` est le Client ID iOS **à l'envers**, sans le `.apps.googleusercontent.com`.
> Ex: si le Client ID iOS est `123456-abc.apps.googleusercontent.com`, le scheme est `com.googleusercontent.apps.123456-abc`.

### Frontend — code d'initialisation

```ts
GoogleSignin.configure({
  webClientId: 'TON_CLIENT_ID_WEB.apps.googleusercontent.com',   // obligatoire
  iosClientId: 'TON_CLIENT_ID_IOS.apps.googleusercontent.com',   // iOS uniquement
  // Android utilise le client ID Android automatiquement via google-services.json
});
```

---

## 6. Fichier google-services.json (Android)

1. Dans Google Cloud Console → **"Identifiants"**
2. Clique sur le client ID Android → **"Télécharger le JSON"**
3. Renomme-le `google-services.json`
4. Place-le dans `app/android/app/google-services.json`

---

## 7. Récapitulatif des Client IDs à noter

| Usage | Type | Où l'utiliser |
|-------|------|---------------|
| Backend Symfony | Web | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` dans `.env.local` |
| App iOS | iOS | `iosClientId` dans `GoogleSignin.configure()` + `iosUrlScheme` dans `app.json` |
| App Android | Android | `google-services.json` dans `android/app/` |
| Frontend général | Web | `webClientId` dans `GoogleSignin.configure()` |

---

## 8. Checklist avant de tester

- [ ] Les 3 Client IDs créés sur Google Cloud Console
- [ ] `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `backend/.env.local`
- [ ] `iosUrlScheme` ajouté dans `app/app.json`
- [ ] `google-services.json` placé dans `app/android/app/`
- [ ] `GoogleSignin.configure()` appelé au démarrage de l'app avec les bons IDs
- [ ] Rebuild natif Expo : `npx expo prebuild` puis `npx expo run:ios` / `run:android`