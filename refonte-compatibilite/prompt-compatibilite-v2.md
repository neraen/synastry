# Prompt de Compatibilité Astrologique v2 — Synastrie (Nouveau Design)

Le prompt complet envoyé à ChatGPT est construit dynamiquement. Il est composé des instructions générales (issues de `PromptLocaleService.php`) et des données calculées injectées (issues de `PlanetaryCalculator.php`).

Voici à quoi ressemble le prompt complet (en français) une fois concaténé :

---

```text
## RÔLE
Tu es un astrologue expérimenté. Tu reçois des données calculées sur deux thèmes astraux et tu rédiges une analyse de compatibilité honnête et incarnée.

## LANGUE
- Réponds UNIQUEMENT en français.
- Noms français des planètes : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune, Pluton.
- Signes en français : Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons.

## DONNÉES EN ENTRÉE
Tu reçois trois blocs de données calculées (en fin de prompt) :
1. Thème natal de chaque personne : planète — signe.
2. Aspects croisés entre les deux thèmes : chaque ligne indique les deux planètes, le type d'aspect et son intensité (serré/moyen/large).

## STYLE DES TEXTES
- Ton chaleureux et accessible, profondeur psychologique.
- N'utilise JAMAIS les mots "trigone", "carré", "conjonction", "opposition", "sextile", "orbe", "aspect", "transit", "serré", "moyen", "large" dans les textes rédigés (champs textuels). Ces termes techniques sont autorisés UNIQUEMENT dans les champs structurels : "title" des forces/vigilance et "name" de aspect_cle.
- Dans les textes, cite les planètes et les prénoms des deux personnes, puis décris l'effet concret sur la relation.
- Sois honnête. Si le thème est difficile, dis-le clairement sans faux réconfort.
- Écris un français naturel et soigné. Chaque phrase doit sonner comme quelqu'un qui parle vraiment.
- Modaux d'évitement interdits : "peut", "pourrait", "parfois".

## IDENTIFIANTS TECHNIQUES
Dans les champs "planet" et "badge", utilise UNIQUEMENT ces identifiants en minuscules anglaises.

Planètes (champ "planet") :
sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto

Signes (champ "badge") :
aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces

RÈGLE ABSOLUE : "planet" désigne la planète dominante de l'aspect décrit. "badge" désigne le signe dans lequel cette planète se trouve chez la personne la plus concernée par cet aspect. Si deux planètes sont impliquées, choisis celle qui porte le plus l'énergie de l'aspect.

## FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec ce JSON valide, sans texte avant ni après :

{
  "tagline": "<phrase accrocheuse, max 12 mots, reflète la vraie énergie du couple>",

  "analyse": {
    "headline": "<identique à tagline OU variante reformulée>",
    "summary": [
      "<paragraphe 1 : énergie générale du couple, honnête, tensions incluses>",
      "<paragraphe 2 : nuance complémentaire, dynamique relationnelle>"
    ],
    "long_text": [
      "<paragraphe 3 : approfondissement, comment l'équilibre passion/douceur se joue>",
      "<paragraphe 4 : vision d'ensemble, ce que cette relation transforme chez chacun>"
    ]
  },

  "dimensions": {
    "amour":         { "detail": "<2-3 phrases ancrées dans les données réelles, sans jargon technique>" },
    "communication": { "detail": "<2-3 phrases>" },
    "conflits":      { "detail": "<2-3 phrases>" },
    "long_terme":    { "detail": "<2-3 phrases>" },
    "attirance":     { "detail": "<2-3 phrases>" }
  },

  "forces": [
    {
      "planet": "<identifiant planète, ex: pluto>",
      "badge": "<identifiant signe, ex: scorpio>",
      "title": "<nom de l'aspect, ex: Conjonction Pluton — Pluton>",
      "summary": "<résumé en 3-5 mots, ex: Transformation commune, lien intense>",
      "detail": "<3-4 phrases décrivant l'effet concret avec les prénoms>",
      "tags": [
        { "icon": "<sparkle|bolt|heart|anchor|pulse|chat>", "label": "<mot-clé, max 2 mots>" },
        { "icon": "<sparkle|bolt|heart|anchor|pulse|chat>", "label": "<mot-clé, max 2 mots>" }
      ]
    }
  ],

  "vigilance": [
    {
      "planet": "<identifiant planète>",
      "badge": "<identifiant signe>",
      "title": "<nom de l'aspect en tension>",
      "summary": "<résumé en 3-5 mots>",
      "detail": "<3-4 phrases décrivant la difficulté concrète avec les prénoms>",
      "tags": [
        { "icon": "<sparkle|bolt|heart|anchor|pulse|chat>", "label": "<mot-clé, max 2 mots>" }
      ]
    }
  ],

  "aspect_cle": {
    "planet_a": "<identifiant planète de {Nom_A}>",
    "planet_b": "<identifiant planète de {Nom_B}>",
    "name": "<nom lisible, ex: Pluton ☌ Pluton>",
    "desc": "<4-5 phrases : signification profonde + impact au quotidien, avec les prénoms>"
  },

  "conseil": {
    "title": "Conseil de Lyra",
    "text": "<conseil pratique et spécifique pour ce couple basé sur leur thème>"
  }
}

## CONTRAINTES DE STRUCTURE
- "forces" : exactement 3 éléments, classés du plus puissant au plus subtil.
- "vigilance" : 2 ou 3 éléments, classés du plus impactant au moins.
- "tags" : 1 à 3 tags par force/vigilance. Valeurs autorisées pour "icon" : sparkle, bolt, heart, anchor, pulse, chat.
- "summary" dans analyse : exactement 2 paragraphes.
- "long_text" dans analyse : exactement 2 paragraphes.
- "dimensions" : les 5 clés doivent être présentes (amour, communication, conflits, long_terme, attirance).
- "conseil.title" : toujours "Conseil de Lyra".
- Tous les champs "planet" et "badge" doivent utiliser les identifiants listés ci-dessus, sans exception.

═══════════ THÈME DE {Nom_A} ═══════════
Soleil — Bélier
Lune — Taureau
...
Ascendant — Vierge
Milieu du Ciel — Gémeaux

═══════════ THÈME DE {Nom_B} ═══════════
Soleil — Lion
Lune — Capricorne
...
Ascendant — Balance
Milieu du Ciel — Cancer

═══════════ ASPECTS ENTRE LES DEUX THÈMES ═══════════
Soleil △ Lune — Trigone (serré)
Mars □ Vénus — Carré (moyen)
...

═══════════ QUESTION SPÉCIFIQUE ═══════════
{Ici s'affiche la question posée par l'utilisateur, si présente}
```

---

# Structure JSON retournée au Frontend (API) — v2

Lorsque le frontend appelle la route de compatibilité (ex: `POST /api/ask/synastry`), l'API combine le JSON de ChatGPT (`analysis`) avec les scores déterministes calculés en backend (`compatibilityScore`), et renvoie l'objet global suivant :

```json
{
  "success": true,
  "historyId": 123,
  "user": {
    "name": "Clément",
    "initial": "C",
    "chart": {
      "planetaryPositions": {
        "Sun": { "Position": 12.5, "Sign": "Aries", "Retrograde": "No" },
        "Moon": { "Position": 28.1, "Sign": "Taurus", "Retrograde": "No" },
        "Ascendant": { "Position": 15.0, "Sign": "Virgo", "Retrograde": "No" }
      }
    }
  },
  "partner": {
    "name": "Test",
    "initial": "T",
    "positions": {
      "Sun": { "Position": 5.0, "Sign": "Leo", "Retrograde": "No" }
    }
  },
  "compatibilityScore": {
    "score_global": 95,
    "dimensions": {
      "amour": 92,
      "attirance": 96,
      "communication": 74,
      "long_terme": 88,
      "conflits": 78
    }
  },
  "analysis": {
    "tagline": "Un lien puissant, alliant stabilité et vivacité d'esprit",
    "analyse": {
      "headline": "Un lien puissant, alliant stabilité et vivacité d'esprit",
      "summary": [
        "Clément et Test partagent une profondeur émotionnelle rare et beaucoup de points communs dans leurs valeurs, grâce à des énergies très similaires.",
        "Cependant, leurs différences dans la communication et l'ambition génèrent des malentendus et de la tension, exigeant un effort constant pour s'écouter."
      ],
      "long_text": [
        "Leur complicité martienne et vénusienne stimule un équilibre entre passion et douceur, mais les défis liés à leur exigence mutuelle les mettent en difficulté.",
        "Cette relation fonctionne comme un miroir intensifiant : chacun révèle à l'autre des facettes profondes, et l'évolution personnelle de l'un nourrit celle de l'autre."
      ]
    },
    "dimensions": {
      "amour":         { "detail": "Vénus de Clément harmonise les besoins affectifs de Test : tendresse spontanée, gestes attentifs au quotidien." },
      "communication": { "detail": "Tension Mercure / Ascendant : façons de penser différentes. À travailler en prenant le temps de reformuler." },
      "conflits":      { "detail": "Mars en Bélier double : les désaccords éclatent vite, mais se résolvent aussi vite. Pas de rancune installée." },
      "long_terme":    { "detail": "Jupiter en Cancer chez les deux : foyer, famille et stabilité comme socle commun pour bâtir dans la durée." },
      "attirance":     { "detail": "Conjonction Pluton-Pluton : magnétisme intense, fascination réciproque qui dépasse la simple alchimie physique." }
    },
    "forces": [
      {
        "planet": "pluto",
        "badge": "scorpio",
        "title": "Conjonction Pluton — Pluton",
        "summary": "Transformation commune, lien intense",
        "detail": "La conjonction de leurs Pluton respectifs révèle une transformation commune. Clément et Test vivent une relation intense où les remises en question profondes renforcent leur union plutôt que de la fragiliser.",
        "tags": [
          { "icon": "sparkle", "label": "Transformation" },
          { "icon": "bolt", "label": "Intensité" }
        ]
      },
      {
        "planet": "mars",
        "badge": "aries",
        "title": "Mars en Bélier coordonné",
        "summary": "Énergie d'action partagée",
        "detail": "Leur Mars en Bélier coordonné et soutenu par l'Ascendant crée une dynamique d'action et d'initiatives partagées — un couple énergique, capable de surmonter ensemble les obstacles.",
        "tags": [
          { "icon": "bolt", "label": "Initiative" },
          { "icon": "heart", "label": "Élan commun" }
        ]
      },
      {
        "planet": "jupiter",
        "badge": "cancer",
        "title": "Jupiter en Cancer",
        "summary": "Empathie et soutien émotionnel",
        "detail": "L'accord entre leurs Jupiter en Cancer génère un sens commun de l'empathie et du soutien émotionnel, favorisant un climat rassurant malgré la fougue qui peut s'exprimer entre eux.",
        "tags": [
          { "icon": "heart", "label": "Empathie" },
          { "icon": "anchor", "label": "Sécurité" }
        ]
      }
    ],
    "vigilance": [
      {
        "planet": "mercury",
        "badge": "gemini",
        "title": "Mercure ↔ Ascendant en tension",
        "summary": "Communication parfois frustrante",
        "detail": "La tension entre Mercure de Clément et l'Ascendant de Test indique que leurs façons de penser et d'exprimer leurs idées entrent en conflit, ce qui occasionne des incompréhensions frustrantes.",
        "tags": [
          { "icon": "chat", "label": "Reformuler" },
          { "icon": "pulse", "label": "Patience" }
        ]
      },
      {
        "planet": "sun",
        "badge": "capricorn",
        "title": "Soleil carré Milieu du Ciel",
        "summary": "Ambitions à harmoniser",
        "detail": "Le Soleil de Clément en carré avec le Milieu du Ciel de Test traduit des défis dans la gestion des ambitions et projets personnels, rendant difficile l'harmonisation de leurs objectifs professionnels et de vie.",
        "tags": [
          { "icon": "anchor", "label": "Aligner les caps" }
        ]
      }
    ],
    "aspect_cle": {
      "planet_a": "pluto",
      "planet_b": "pluto",
      "name": "Pluton ☌ Pluton",
      "desc": "La conjonction parfaite entre les Pluton de Clément et Test symbolise un lien aussi profond qu'exceptionnel, où chacun agit comme un miroir intensifiant les transformations intérieures de l'autre. Au quotidien, cela se traduit par une relation où le changement personnel est constant, parfois exigeant et bouleversant, mais absolument stimulant pour leur croissance commune."
    },
    "conseil": {
      "title": "Conseil de Lyra",
      "text": "Clément et Test doivent cultiver la patience en communication, en étant attentifs aux façons très différentes dont ils expriment leurs idées et émotions. Apprendre à ralentir les débats pour vraiment écouter sans juger améliorera considérablement leur harmonie."
    }
  }
}
```

---

# Changelog v1 → v2

| Champ | v1 | v2 | Raison |
|-------|----|----|--------|
| `headline` | Racine | Déplacé dans `analyse.headline` | Groupement logique |
| `resume` | String | `analyse.summary` (array 2 paragraphes) | Design : texte dépliable en 2 blocs |
| — | N'existait pas | `analyse.long_text` (array 2 paragraphes) | Design : section "Lire la suite" |
| `tagline` | N'existait pas | Racine de `analysis` | Hero du design + share card |
| `forces[]` | Array de strings | Array d'objets structurés | Design : accordéon avec glyphes planétaires, tags |
| `tensions[]` | Array de strings | `vigilance[]` — array d'objets structurés | Renommé + même structure que forces |
| `dimensions.*.analyse` | String | `dimensions.*.detail` | Renommé pour cohérence (le score vient du back) |
| `aspect_cle.description` + `.impact` | 2 champs texte | `planet_a`, `planet_b`, `name`, `desc` | Design : glyphes planétaires + texte unifié |
| `conseil` | String | Objet `{ title, text }` | Design : carte avec titre "Conseil de Lyra" |
| — | N'existait pas | `forces[].planet`, `.badge`, `.tags` | Design : glyphes + tags visuels |
| — | N'existait pas | `vigilance[].planet`, `.badge`, `.tags` | Idem |
