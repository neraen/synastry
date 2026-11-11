# Lunestia — fiche App Store et note au relecteur

Textes à coller dans App Store Connect pour la soumission qui suit le refus 4.3(b).
Principe : la fiche présente un **planétarium personnel**, l'astrologie passe au second plan.
Les mots « horoscope », « astrologie » et « zodiaque » sont volontairement absents du nom, du sous-titre et des trois premières captures.

À compléter avant envoi : les passages entre `<…>`.

---

## Français

**Nom (30 max)**

```
Lunestia : ton ciel
```

**Sous-titre (30 max)**

```
Le ciel de ta naissance
```

**Texte promotionnel (170 max)**

```
Retrouve le vrai ciel de ta naissance, débusque tes dix astres parmi 2 300 étoiles et trace une constellation qui n'appartient qu'à toi.
```

**Mots-clés (100 max, séparés par des virgules)**

```
planétarium,étoiles,constellation,naissance,carte du ciel,planètes,astres,nuit,poster,couple,lune
```

**Description**

```
Quel ciel y avait-il au-dessus de toi le jour de ta naissance ?

Lunestia le reconstitue : les étoiles et les planètes telles qu'elles étaient à l'heure et à l'endroit exacts où tu es né. Puis il te laisse t'y promener.

TON CIEL DE NAISSANCE
• Une voûte étoilée que tu explores au doigt : tourne, lève les yeux, zoome.
• Plus de 2 300 étoiles réelles, à leur vraie place, avec leur vraie couleur.
• L'horizon, les points cardinaux, la Lune et les planètes de ce soir-là.

LA CHASSE AUX ASTRES
• Dix astres sont cachés dans ton ciel. À toi de les retrouver.
• Chaque astre trouvé te dit où il brillait et quelle étoile veillait sur lui.
• Un indice si tu sèches : le ciel tourne vers le prochain.

TA CONSTELLATION
• Une fois les dix astres trouvés, ils se relient à leurs étoiles gardiennes.
• La figure obtenue est unique : personne d'autre n'a la même.
• Donne-lui un nom. Elle reste gravée dans ton ciel.

UN POSTER À PARTAGER
• Ta constellation, ton nom, ta date et ton lieu de naissance sur une affiche.
• Prête à partager ou à enregistrer.

CIEL À DEUX
• Invite quelqu'un dans ton ciel : sa constellation se superpose à la tienne.
• Découvre les points où vos astres se rencontrent.

ET AUSSI
• Ta carte du ciel interactive.
• La compatibilité entre deux personnes, dimension par dimension.
• Lyra, pour poser tes questions.
• Les événements du ciel à venir, datés.

Le ciel est calculé à partir de ta date, ton heure et ton lieu de naissance. Sans heure de naissance, Lunestia affiche le ciel de 22 h ce soir-là.

Lunestia Premium est un abonnement optionnel qui débloque <à compléter : contenu premium>. Conditions d'utilisation : <lien>. Politique de confidentialité : <lien>.
```

---

## English

**Name (30 max)**

```
Lunestia: Your Birth Sky
```

**Subtitle (30 max)**

```
The sky you were born under
```

**Promotional text (170 max)**

```
See the real night sky from the moment you were born, find your ten hidden planets among 2,300 stars and trace a constellation that is yours alone.
```

**Keywords (100 max)**

```
planetarium,stars,constellation,birth,sky map,planets,night sky,star map,poster,couple,moon
```

**Description**

```
What did the sky look like the moment you were born?

Lunestia rebuilds it: the stars and planets exactly as they stood above the place and time of your birth. Then it lets you walk around in it.

YOUR BIRTH SKY
• A star dome you explore with your finger: turn, look up, zoom in.
• More than 2,300 real stars, in their true position and colour.
• The horizon, the compass points, the Moon and the planets of that night.

THE PLANET HUNT
• Ten planets are hidden in your sky. Find them.
• Each one tells you where it was shining and which star was watching over it.
• Stuck? A hint turns the sky toward the next one.

YOUR CONSTELLATION
• Once all ten are found, they link up with their guardian stars.
• The resulting figure is unique: nobody else has the same one.
• Give it a name. It stays drawn in your sky.

A POSTER TO SHARE
• Your constellation, its name, your birth date and place on one poster.
• Ready to share or save.

A SKY FOR TWO
• Invite someone into your sky: their constellation appears over yours.
• See where your planets meet.

ALSO INSIDE
• Your interactive sky chart.
• Compatibility between two people, dimension by dimension.
• Lyra, to ask your questions.
• Upcoming sky events, with dates.

The sky is computed from your birth date, time and place. Without a birth time, Lunestia shows the sky at 10 pm that evening.

Lunestia Premium is an optional subscription that unlocks <to complete: premium content>. Terms of use: <link>. Privacy policy: <link>.
```

---

## Captures d'écran (ordre)

Les trois premières sont celles qu'on voit sans faire défiler : elles doivent montrer le ciel, pas du texte.

| # | Écran | Titre sur la capture (FR) | Titre (EN) |
|---|-------|---------------------------|------------|
| 1 | Voûte pendant la chasse, une lueur dorée visible, compteur 3/10 | Le vrai ciel de ta naissance | The real sky you were born under |
| 2 | Constellation tracée et nommée | Une constellation rien qu'à toi | A constellation that is yours alone |
| 3 | Poster | Ton ciel, en affiche | Your sky, as a poster |
| 4 | Ciel à deux avec les rencontres | Deux ciels, un seul regard | Two skies, one view |
| 5 | Carte du ciel (roue natale) | Ta carte du ciel interactive | Your interactive sky chart |
| 6 | Compatibilité | Ce qui vous relie | What connects you |

Aperçu vidéo (facultatif mais utile contre un 4.3) : 15 à 20 secondes — on tourne dans le ciel, on touche un astre, la constellation se trace.

---

## Note au relecteur (champ « Notes » de la section Vérification de l'app)

À envoyer en anglais.

```
Hello,

This build responds to the previous rejection under Guideline 4.3(b). We did not resubmit the same app: we rebuilt it around a new core feature that is now the first tab and the first thing a user sees after sign-in.

WHAT IS NEW: "YOUR BIRTH SKY" (first tab)

1. An interactive planetarium of the user's birth sky. The app renders the celestial dome as seen from the user's birth place at their birth time: 2,309 real stars (down to magnitude 5.3, J2000 positions from an open star catalogue), the horizon, and the Sun, Moon and planets. Positions are computed by our own astronomical engine (Meeus algorithms), not by a third-party template or a generated text. The user pans and pinches to look around.

2. A game. Ten bodies are hidden in the sky as faint glows; the user explores the dome to find them. Progress is saved to the account.

3. A personal constellation. When all ten are found, each one is linked to the nearest bright named star and the app draws a figure that is unique to that birth date, time and place. The user names it.

4. A shareable poster of that constellation, rendered in-app.

5. "A sky for two": another person's planets and constellation are overlaid on the user's own sky, and the points where the two skies meet are highlighted.

None of these screens is a horoscope or a text reading. The feature is a graphics- and interaction-based experience built for this app (custom Skia rendering, custom projection, custom game logic).

HOW TO SEE IT

- Sign in with "Sign in with Apple" (the app has no email/password sign-in).
- Complete the short onboarding: enter any birth date, time and city.
- The app opens on the first tab (moon icon). Drag to look around the sky and tap the golden glows. Use the "A hint" button to be guided to the next one.
- After the tenth, tap "Reveal my constellation", then name it.
- "Create my poster" in the bottom panel opens the shareable poster.
- "A sky for two": first add a person in the compatibility tab (heart icon; any name, birth date and city), then come back to the first tab and invite them into the sky.

Subscriptions: <à compléter — où trouver l'écran premium, compte sandbox si nécessaire>.

Thank you for your time.
```

---

## Avant d'envoyer

- [x] Ton Ciel est traduit en anglais (clés `sky.*` dans `app/i18n/locales`). Les libellés cités dans la note au relecteur sont ceux de la version anglaise.
- [ ] **Accès du relecteur.** La connexion par e-mail n'existe qu'en mode développement (`__DEV__` dans `app/app/login.tsx`) : le relecteur passera par « Se connecter avec Apple » et l'onboarding. La note est écrite dans ce sens. Si tu préfères lui fournir un compte déjà prêt, il faut d'abord rendre une connexion par e-mail disponible en production.
- [ ] Appliquer la migration `Version20261111000001` en production avant la revue.
- [ ] Tester sur un vrai téléphone : gestes, fluidité, export du poster.
- [ ] Refaire les captures depuis ce build (celles de l'ancienne fiche montrent l'horoscope).
- [ ] Compléter les passages `<…>` (contenu premium, liens, abonnements).
