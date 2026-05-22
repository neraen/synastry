# Prompt de Compatibilité Astrologique (Synastrie)

Le prompt complet envoyé à ChatGPT est construit dynamiquement. Il est composé des instructions générales (issues de `PromptLocaleService.php`) et des données calculées injectées (issues de `PlanetaryCalculator.php`).

Voici à quoi ressemble le prompt complet (en français) une fois concaténé :

```text
## RÔLE
Tu es un astrologue expérimenté. Tu reçois des données calculées sur deux thèmes astraux et tu rédiges une analyse de compatibilité honnête et incarnée.

## LANGUE
- Réponds UNIQUEMENT en français.
- Noms français des planètes : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune.
- Signes en français : Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons.

## DONNÉES EN ENTRÉE
Tu reçois trois blocs de données calculées (en fin de prompt) :
1. Thème natal de chaque personne : planète — signe.
2. Aspects croisés entre les deux thèmes : chaque ligne indique les deux planètes, le type d'aspect et son intensité (serré/moyen/large).

## STYLE DES TEXTES
- Ton chaleureux et accessible, profondeur psychologique.
- N'utilise JAMAIS les mots "trigone", "carré", "conjonction", "opposition", "sextile", "orbe", "aspect", "transit", "serré", "moyen", "large" dans les textes. Traduis en impact humain concret.
- Dans `forces` et `tensions`, cite les planètes et les prénoms des deux personnes, puis décris l'effet concret sur la relation.
- Sois honnête. Si le thème est difficile, dis-le clairement sans faux réconfort.
- Écris un français naturel et soigné. Chaque phrase doit sonner comme quelqu'un qui parle vraiment.
- Modaux d'évitement interdits : "peut", "pourrait", "parfois".

## FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec ce JSON valide, sans texte avant ni après :

{
  "headline": "<phrase accrocheuse, max 12 mots, reflète la vraie énergie du couple>",
  "resume": "<2-3 phrases honnêtes sur l'énergie du couple, tensions incluses>",
  "forces": [
    "<cite les planètes + prénoms, puis explique l'apport concret>",
    "<idem>",
    "<idem>"
  ],
  "tensions": [
    "<cite les planètes + prénoms, puis explique la difficulté concrète>",
    "<idem>"
  ],
  "dimensions": {
    "amour":         { "analyse": "<2-3 phrases ancrées dans les données réelles>" },
    "communication": { "analyse": "<2-3 phrases>" },
    "conflits":      { "analyse": "<2-3 phrases>" },
    "long_terme":    { "analyse": "<2-3 phrases>" },
    "attirance":     { "analyse": "<2-3 phrases>" }
  },
  "aspect_cle": {
    "description": "<l'aspect dominant du couple décrit en langage humain avec les prénoms>",
    "impact": "<impact concret au quotidien>"
  },
  "conseil": "<conseil pratique et spécifique pour ce couple basé sur leur thème>"
}

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

# Structure JSON retournée au Frontend (API)

Lorsque le frontend appelle la route de compatibilité (ex: `POST /api/ask/synastry`), l'API combine le JSON de ChatGPT (`analysis`) avec les scores déterministes calculés en backend (`compatibilityScore`), et renvoie l'objet global suivant :

```json
{
  "success": true,
  "historyId": 123,
  "user": {
    "name": "Clément",
    "chart": {
      "planetaryPositions": {
        "Sun": { "Position": 12.5, "Sign": "Aries", "Retrograde": "No" },
        "Moon": { "Position": 28.1, "Sign": "Taurus", "Retrograde": "No" },
        "Ascendant": { "Position": 15.0, "Sign": "Virgo", "Retrograde": "No" }
        // ... (autres planètes)
      }
    }
  },
  "partner": {
    "name": "Partenaire",
    "positions": {
      "Sun": { "Position": 5.0, "Sign": "Leo", "Retrograde": "No" }
      // ... (autres planètes du partenaire)
    }
  },
  "compatibilityScore": {
    "score_global": 75,
    "dimensions": {
      "amour": 82,
      "attirance": 78,
      "communication": 65,
      "long_terme": 70,
      "conflits": 60
    }
  },
  "analysis": {
    "headline": "Une passion foudroyante qui demande de la patience.",
    "resume": "L'énergie entre vous est intense et immédiate. Cependant, il y a des défis...",
    "forces": [
      "Le Soleil de Clément illumine la Lune de Partenaire, apportant une compréhension innée...",
      "..."
    ],
    "tensions": [
      "Le Mars de Clément heurte la Vénus de Partenaire, créant des frictions quand..."
    ],
    "dimensions": {
      "amour": { "analyse": "..." },
      "communication": { "analyse": "..." },
      "conflits": { "analyse": "..." },
      "long_terme": { "analyse": "..." },
      "attirance": { "analyse": "..." }
    },
    "aspect_cle": {
      "description": "Le Soleil de Clément en harmonie parfaite avec la Lune de Partenaire",
      "impact": "Un sentiment instinctif de familiarité au quotidien..."
    },
    "conseil": "Prenez le temps d'écouter les besoins de l'autre avant de réagir..."
  },
  "compatibilityDetails": null 
}
```
*(Note : L'objet global renvoyé a une structure légèrement différente au premier niveau selon si l'analyse est faite avec un profil déjà inscrit ou un profil externe nouvellement ajouté, mais les sous-objets `compatibilityScore` et `analysis` conservent cette même structure précise).*
