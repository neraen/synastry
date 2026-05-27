# DecadeYearPicker — Lunestia (handoff)

Sélecteur d'âge **2 niveaux** (décennie + année), conçu pour remplacer
le slider du Miroir Temporel. À porter en React Native dans
`react-native/src/components/DecadeYearPicker.tsx`.

## Pourquoi ce composant ?

L'écran actuel utilise un slider continu et place l'année entière du
contenu dans un bloc unique :

- ❌ slider imprécis sur mobile → l'utilisateur dépasse l'âge voulu
- ❌ pas de feedback sur les jalons astraux (retour de Saturne, etc.)
- ❌ pas de hit-target par année → impossible de taper "30 ans" direct

Le `DecadeYearPicker` règle ça avec une UX en 2 niveaux : on choisit
une décennie, puis l'année dans la grille de 10 cellules. Chaque
cellule est un bouton de ~36px, conforme aux guidelines Apple/Google.

## API (déjà câblée en web — voir `decade-year-picker.jsx`)

```ts
type Milestone = {
  age: number;
  label: string;
  glyph: string; // "♄", "☉", emoji…
};

type DecadeYearPickerProps = {
  value: number;                  // contrôlé
  onChange: (age: number) => void;

  min?: number;                   // défaut 0
  max?: number;                   // défaut 89
  birthYear?: number;             // affiche année calendaire en badge
  milestones?: Milestone[];       // défaut: DYP_DEFAULT_MILESTONES
  labels?: Partial<{
    yearsSuffix: string;          // "ans"
    milestoneTag: string;         // "JALON ASTRAL"
  }>;
};
```

## Anatomie

```
┌─────────────────────────────────────────────┐
│  31 ans                              2024   │ ← hero + calendar badge
│                                             │
│  [0–9] [10–19] [20–29] [30–39]* [40–49]…    │ ← decades (scroll horizontal)
│                                             │
│  30  31* 32  33  34  35  36  37  38  39    │ ← year grid (10 cells)
│        ·          ·                          │  · = milestone dot
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ♄  JALON ASTRAL                     │   │ ← bandeau si âge = jalon
│  │    Retour de Saturne                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Port React Native — notes d'implémentation

1. **Décennies (rangée scrollable)** → `ScrollView horizontal`
   avec `showsHorizontalScrollIndicator={false}`. Pas de snap nécessaire.

2. **Grille d'années** → `View` flex-row, 10 enfants `flex: 1`,
   `gap: 4`. Chaque cellule `Pressable` ~36px de haut. Pas de
   `FlatList` — 10 items, c'est inutile.

3. **Point "milestone"** sous une cellule active → petit `View`
   absolument positionné, 3×3, `bg: tokens.color.goldDim`.

4. **Cellule active** → `bg: tokens.color.gold`, texte `#1A1233`,
   font `tokens.font.sansBold`. Pas de border ; le contraste suffit.

5. **Hors-plage** (si `min > 0` ou `max < 89` coupe une décennie)
   → `disabled` + `opacity: 0.35`. La cellule reste visible pour
   garder la grille à 10 colonnes, mais ne réagit pas au tap.

6. **Bandeau milestone** → conditionnel, même style que celui
   du `AgePicker.tsx` existant (`milestoneBlock`) — on peut
   factoriser dans un sous-composant partagé si tu veux.

7. **Tokens** : tout est déjà dans `src/theme/tokens.ts`
   (`color.gold`, `goldDim`, `goldSoft`, `border`, `borderStrong`,
   `text/text2/text3`, `font.serif/sansSemi/sansBold`,
   `radius.pill/md/lg/xl`).

8. **Accessibilité** :
   - décennies : `accessibilityRole="tab"`, `accessibilityState={{ selected: isActive }}`
   - cellules année : `accessibilityRole="radio"`, `accessibilityState={{ checked: isActive }}`,
     `accessibilityLabel="31 ans — Retour de Saturne"` si milestone

9. **Haptique** (optionnel mais conseillé) : appeler
   `Haptics.selectionAsync()` (expo-haptics, déjà utilisé dans le
   `AgePicker.tsx` actuel ? sinon trivial à ajouter) à chaque
   `onChange`.

## Coexistence avec `AgePicker.tsx` existant

L'`AgePicker.tsx` actuel est la variante **ribbon scrubbable**.
Le `DecadeYearPicker` est une alternative à proposer en A/B test, ou
à substituer entièrement si on garde une seule UX. Les deux ont la
même signature `value` / `onChange` / `birthYear` / `milestones`,
donc remplacer l'un par l'autre dans l'écran Miroir est un swap
d'import sans autre changement.

## Fichiers de cette livraison

| Fichier | Rôle |
|---|---|
| `decade-year-picker.jsx` | Composant web (référence visuelle / comportement) |
| `chapter-card.jsx` | Composant carte-chapitre (à porter aussi : `ChapterCard.tsx`) |
| `miroir-temporel-screen.jsx` | Écran complet, montre comment câbler les composants |
| `Miroir Temporel A.html` | Page de preview standalone (phone shell) |
| `DecadeYearPicker.README.md` | Ce fichier |
