# Lunestia — Thème astral (React Native)

Portage React Native exact de l'écran web. Stack : **Expo + TypeScript + react-native-svg**.

## Installation

```bash
npm install
# ou
yarn
```

## Lancement

```bash
npm start
# puis press 'i' (iOS) / 'a' (Android) / 'w' (web)
```

## Structure

```
react-native/
├─ App.tsx                       Entry point (charge les fonts, monte l'écran)
├─ src/
│  ├─ theme/tokens.ts            Couleurs, espacements, rayons SVG
│  ├─ data/astrology.ts          Signes, planètes, maisons, aspects, helpers
│  ├─ components/
│  │   ├─ NatalChart.tsx         La roue SVG complète (signes, maisons, planètes, aspects)
│  │   ├─ InfoPanel.tsx          Carte d'info contextuelle
│  │   ├─ Legend.tsx             Légende des aspects
│  │   ├─ TabBar.tsx             Navigation du bas
│  │   └─ Icons.tsx              Icônes SVG (soleil, étoile, cœur, etc.)
│  └─ screens/
│      └─ ThemeAstralScreen.tsx  Composition complète de l'écran
└─ package.json
```

## Notes

- **Glyphes astrologiques** (♈ ♉ ☉ ☽ …) : rendus en Unicode via la police système.
  Sur iOS ça marche out-of-the-box. Sur Android selon la version, certains glyphes peuvent
  manquer — si c'est le cas, ajoute une font dédiée (ex. *Noto Sans Symbols 2*, *AstroDotBasic*)
  et passe-la en `fontFamily` aux `<SvgText>` correspondants.
- **Interactions** : chaque sector de signe, numéro de maison, glyphe de planète, et ligne
  d'aspect est `<Pressable>` — tap pour ouvrir le panneau d'info. Re-tap pour désélectionner.
- **Anti-overlap** des planètes : si des planètes sont à <7° l'une de l'autre,
  les glyphes sont décalés angulairement et une fine ligne pointillée les relie à leur
  position exacte sur l'anneau du zodiaque.
- **Données** : actuellement codées en dur dans `src/data/astrology.ts` — branche tes calculs
  d'éphémérides (Swiss Ephemeris, Astrologer API, etc.) en remplaçant `PLANETS` et `ASC_LON`.
