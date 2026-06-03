# HOROSCOPE-ENGINE.md — Moteur d'horoscope quotidien Lunestia

Spec d'implémentation pour Claude Code. Objectif : rendre l'horoscope quotidien **différencié par personne et par jour**, en sortant l'interprétation astrologique du LLM.

---

## ⚠️ AVANT DE CODER — lire l'existant, ne rien dupliquer

Le code PHP de cette spec est **indicatif** (squelette), pas du code à coller tel quel.

1. **Lis `PlanetaryCalculator.php` en entier d'abord**, ainsi que le service horoscope existant et la façon dont `lunestia_transits_natal.json` est (ou sera) chargé. N'écris aucune ligne avant cet inventaire.
2. **Réutilise ce qui existe déjà** : calcul des longitudes écliptiques, séparation angulaire (même si elle porte un autre nom), tables de signes/maisons, chargement/cache du JSON. Si une fonction existe sous un nom différent, utilise-la, n'en crée pas une jumelle.
3. **N'ajoute que ce qui manque.** Ne crée aucun doublon de logique déjà présente.
4. **Code partagé avec `LYRA-ENGINE.md`** : `separation()` et les constantes `ASPECTS` sont communes aux deux moteurs. Elles ne doivent exister **qu'une seule fois** dans `PlanetaryCalculator` et être réutilisées par les deux. Ne les redéfinis pas dans chaque moteur.
5. Si la signature d'une méthode existante diffère de la spec, **adapte la spec au code réel**, pas l'inverse.

> Avant d'implémenter, produis un court inventaire : « voici ce qui existe déjà qui recoupe la spec, voici ce que je vais réutiliser, voici ce que j'ajoute ». Attendre validation avant d'écrire.

---

## 0. Principe directeur (NE PAS CONTOURNER)

Le LLM ne fait **pas** d'astrologie. Il ne sélectionne rien, n'interprète rien.

- **PHP** calcule les aspects transit→natal, les score, sélectionne les contacts marquants, et les traduit en briefs concrets via `lunestia_transits_natal.json`.
- **Le LLM** reçoit des briefs déjà interprétés et a une seule tâche : les habiller en prose Lunestia.

> ⚠️ Toute « amélioration » qui consisterait à passer le thème natal brut + les transits au LLM en lui demandant d'interpréter est un **retour en arrière**. C'est précisément la cause du contenu générique actuel : sans matière, le LLM régresse vers la moyenne du genre (« intensité, transformation, feu intérieur »). On garde l'interprétation déterministe en PHP.

---

## 1. Pipeline

```
natal (constant) + transits du jour
        │
        ▼
[1] Détection des aspects transit→natal (orbe)
        │
        ▼
[2] Scoring de chaque aspect
        │
        ▼
[3] Sélection de 3 angles distincts + baseline
        │
        ▼
[4] Composition des briefs depuis lunestia_transits_natal.json
        │
        ▼
[5] Appel LLM (prompt rédacteur) → JSON horoscope
```

---

## 2. Données d'entrée

`PlanetaryCalculator` produit déjà les longitudes écliptiques. Contrats attendus :

```php
// Thème natal (constant pour l'utilisateur)
$natal = [
  'Soleil'  => ['longitude' => 23.4, 'signe' => 'Belier',     'maison' => 10],
  'Lune'    => ['longitude' => 287.1,'signe' => 'Capricorne', 'maison' => 7],
  'Mercure' => ['longitude' => 65.2, 'signe' => 'Gemeaux',    'maison' => 12],
  'Venus'   => ['longitude' => 102.8,'signe' => 'Cancer',     'maison' => 1],
  'Mars'    => ['longitude' => 178.0,'signe' => 'Vierge',     'maison' => 3],
  'Saturne' => ['longitude' => 310.5,'signe' => 'Verseau',    'maison' => 8],
  'ASC'     => ['longitude' => 95.0, 'signe' => 'Cancer',     'maison' => 1],
  'MC'      => ['longitude' => 5.0,  'signe' => 'Belier',     'maison' => 10],
];

// Transits du jour, calculés à un instant de référence fixe (ex: midi heure locale)
// pour que la Lune soit stable sur la journée.
$transits = [
  'Soleil'  => ['longitude' => ...],
  'Lune'    => ['longitude' => ...],
  'Mercure' => ['longitude' => ...],
  'Venus'   => ['longitude' => ...],
  'Mars'    => ['longitude' => ...],
];
```

Planètes **en transit** considérées : Soleil, Lune, Mercure, Vénus, Mars (planètes personnelles).
Cibles **natales** considérées : Soleil, Lune, Mercure, Vénus, Mars, Saturne, ASC, MC (= les clés du JSON).

---

## 3. Étape 1+2 — Détection et scoring des aspects

### Constantes

```php
private const ASPECTS = [
    ['nom' => 'conjonction', 'angle' => 0,   'orbe' => 3.0, 'poids' => 1.00],
    ['nom' => 'opposition',  'angle' => 180, 'orbe' => 3.0, 'poids' => 0.90],
    ['nom' => 'carre',       'angle' => 90,  'orbe' => 3.0, 'poids' => 0.85],
    ['nom' => 'trigone',     'angle' => 120, 'orbe' => 3.0, 'poids' => 0.70],
    ['nom' => 'sextile',     'angle' => 60,  'orbe' => 2.0, 'poids' => 0.55],
];

private const LUMINAIRES_ET_ANGLES = ['Soleil', 'Lune', 'ASC', 'MC'];
private const FACTEUR_CIBLE_FORTE = 1.30; // aspect à un luminaire/angle natal = plus "ressenti"
```

### Séparation angulaire (gère le wraparound 360°)

```php
private function separation(float $a, float $b): float
{
    $d = fmod(abs($a - $b), 360.0);
    return $d > 180.0 ? 360.0 - $d : $d;
}
```

### Construction de la liste des contacts scorés

```php
/**
 * Retourne tous les contacts transit->natal dans l'orbe, scorés.
 * @return array<array{transit:string, cible:string, aspect:string, orbe:float, score:float, maison:int}>
 */
private function contactsScores(array $natal, array $transits): array
{
    $ciblesValides = array_keys($natal); // intersecté avec les clés du JSON côté compo
    $contacts = [];

    foreach (['Soleil','Lune','Mercure','Venus','Mars'] as $tPlanete) {
        if (!isset($transits[$tPlanete])) continue;
        $tLon = $transits[$tPlanete]['longitude'];

        foreach ($ciblesValides as $cible) {
            if (!isset($natal[$cible])) continue;
            $nLon = $natal[$cible]['longitude'];
            $sep  = $this->separation($tLon, $nLon);

            foreach (self::ASPECTS as $asp) {
                $orbeReel = abs($sep - $asp['angle']);
                if ($orbeReel > $asp['orbe']) continue;

                $orbFactor   = 1.0 - ($orbeReel / $asp['orbe']);            // exact = 1, bord = 0
                $cibleFactor = in_array($cible, self::LUMINAIRES_ET_ANGLES, true)
                    ? self::FACTEUR_CIBLE_FORTE : 1.0;
                $score = $asp['poids'] * $orbFactor * $cibleFactor;

                $contacts[] = [
                    'transit' => $tPlanete,
                    'cible'   => $cible,
                    'aspect'  => $asp['nom'],
                    'orbe'    => $orbeReel,
                    'score'   => $score,
                    'maison'  => $natal[$cible]['maison'], // maison natale de la cible -> domaine de vie
                ];
                break; // un seul aspect possible par paire planète/cible
            }
        }
    }

    usort($contacts, fn($a, $b) => $b['score'] <=> $a['score']);
    return $contacts;
}
```

---

## 4. Étape 3 — Sélection des 3 angles + baseline

```php
private function selectionnerAngles(array $contacts, array $natal): array
{
    // angle_principal : meilleure planète personnelle LENTE (hors Lune) -> thème qui dure 2-4 jours
    $principal = null;
    foreach ($contacts as $c) {
        if ($c['transit'] !== 'Lune') { $principal = $c; break; }
    }

    // angle_relationnel : meilleur contact "affectif", distinct du principal
    $relationnel = null;
    foreach ($contacts as $c) {
        $estAffectif = in_array($c['transit'], ['Venus','Mars'], true)
            || in_array($c['cible'], ['Venus','Mars'], true)
            || in_array($c['maison'], [5,7,8], true);
        if ($estAffectif && $c !== $principal) { $relationnel = $c; break; }
    }

    // couleur_du_jour : le contact de la Lune en transit -> change chaque jour
    $couleur = null;
    foreach ($contacts as $c) {
        if ($c['transit'] === 'Lune') { $couleur = $c; break; }
    }

    return [
        'principal'   => $principal,   // peut être null -> voir fallback §6
        'relationnel' => $relationnel, // peut être null
        'couleur'     => $couleur,     // peut être null
        'baseline'    => [
            'lune_signe' => $natal['Lune']['signe'] ?? null,
            'asc_signe'  => $natal['ASC']['signe']  ?? null,
        ],
    ];
}
```

---

## 5. Étape 4 — Composition des briefs depuis le JSON

Charger `lunestia_transits_natal.json` une fois (le mettre en cache / service).

```php
private function composerBrief(?array $contact, array $table): ?array
{
    if ($contact === null) return null;

    $cell = $table['contacts'][$contact['transit']][$contact['cible']] ?? null;
    if ($cell === null) return null;

    $flavorKey = $table['regle_aspect'][$contact['aspect']] ?? 'flow';
    // conjonction = 'flow amplifie...' dans le JSON : on retombe sur 'flow',
    // SAUF cible Saturne/Mars où on force 'tension'
    if ($contact['aspect'] === 'conjonction') {
        $flavorKey = in_array($contact['cible'], ['Saturne','Mars'], true) ? 'tension' : 'flow';
    } else {
        $flavorKey = str_contains($flavorKey, 'tension') ? 'tension' : 'flow';
    }

    return [
        'theme'     => $cell['theme'],
        'situation' => $cell[$flavorKey],
        'domaine'   => $table['maisons'][(string) $contact['maison']] ?? null,
    ];
}
```

Brief final assemblé pour le LLM :

```php
$brief = [
    'angle_principal'   => $this->composerBrief($angles['principal'],   $table),
    'angle_relationnel' => $this->composerBrief($angles['relationnel'], $table),
    'couleur_du_jour'   => $this->composerBrief($angles['couleur'],     $table),
    'baseline'          => $angles['baseline'],
    'date'              => $dateFr, // ex: "Mardi 2 Juin"
];
```

---

## 6. Fallbacks (ne jamais renvoyer un brief vide)

- **`angle_principal` null** (aucun contact lent dans l'orbe) → utiliser `couleur_du_jour` comme principal. Si lui aussi est null → construire un brief minimal depuis la baseline seule (`theme` = "coloration de fond", `situation` dérivée de la Lune natale + ASC, `domaine` = null). Le jour sera plus calme, c'est honnête.
- **`angle_relationnel` null** → la section `love` s'appuie sur la baseline (tonalité affective de la Lune natale), reste courte plutôt qu'inventée.
- **`couleur_du_jour` null** (rare, Lune sans aspect serré) → `energy` s'appuie sur la baseline + Mars natal.
- **Égalités de score** → déjà tranchées par le tri (score puis ordre stable) ; au besoin départager par orbe le plus serré.

---

## 7. Étape 5 — Le prompt réécrit (mode rédacteur)

Remplace **intégralement** l'ancien prompt. Différence clé : il ne reçoit plus `natal` + `transits` bruts, il reçoit `$brief` (déjà interprété).

### System

```
Tu es Lyra, la voix de Lunestia. Tu écris l'horoscope du jour d'une personne.

Tu reçois un brief DÉJÀ INTERPRÉTÉ : on t'a calculé ce qui rend cette journée
spécifique à cette personne. Ton seul travail est de l'habiller en prose juste,
chaleureuse et concrète. Tu n'ajoutes aucune interprétation astrologique, tu ne
nommes jamais de planète, d'aspect, de maison ni de mécanisme. Tu écris comme on
parle à quelqu'un qu'on connaît.

But : qu'en lisant, elle se dise "c'est exactement ma journée".

### CE QUE TU REÇOIS (JSON)
- angle_principal   : { theme, situation, domaine } — le thème central du jour
- angle_relationnel : { theme, situation, domaine } | null — l'angle affectif
- couleur_du_jour   : { theme, situation, domaine } | null — l'humeur du jour
- baseline          : { lune_signe, asc_signe } — sa coloration émotionnelle de fond
- date              : la date à afficher

### COMMENT MAPPER vers les sections
- overview : construit sur angle_principal. C'est l'ambiance centrale, ancrée dans "situation".
- love     : construit sur angle_relationnel. Si null, reste bref et colore avec la baseline (la façon dont une Lune en {lune_signe} vit l'affectif). N'invente pas de drame amoureux.
- energy   : construit sur couleur_du_jour (humeur/corps du jour). Si null, appuie-toi sur la baseline.
- advice   : un geste concret découlant de angle_principal. Pas un conseil générique.
- title    : évocateur, max 8 mots, tiré de l'ambiance dominante.

### RÈGLES D'ÉCRITURE
- Chaque section = un angle DISTINCT. Aucune section ne répète le thème d'une autre.
- 2 à 4 phrases par section (love/energy/advice peuvent être plus courts si le brief est léger). advice : 1-2 phrases.
- La première phrase de chaque section est la plus forte : elle accroche, les suivantes développent.
- Phrases courtes, lisibles sur un écran de téléphone.
- Sers-toi de la baseline pour AJUSTER le ton, pas comme contenu : une Lune Capricorne ne vit pas la même journée qu'une Lune Poissons. Le même brief doit sonner différemment selon la baseline.
- Le champ "domaine" te dit DANS QUEL DOMAINE DE VIE situer la scène (travail, couple, foyer...). Ancre-toi dedans concrètement.

### INTERDICTIONS STRICTES
- Aucun terme astrologique : planète, signe, aspect, maison, transit, ascendant, orbe.
- Aucun vocabulaire New Age : univers, énergie(s), potentiel, invitation à, vibration, alignement, flux.
- Aucun modal d'évitement : "peut", "pourrait", "il est possible".
- Aucune injonction creuse : "reste ouvert", "fais confiance", "accueille ce qui vient", "prends soin de toi", "écoute ton intuition".
- Aucune description de signe générique ("en tant que Cancer, tu...").
- Ne REPRODUIS JAMAIS telle quelle une formulation donnée dans le brief ou dans des exemples : reformule toujours avec tes mots. Les briefs sont une matière à transformer, pas un texte à recopier.

### FORMAT DE SORTIE
JSON valide strict, rien avant ni après :
{
  "title":    "max 8 mots",
  "overview": "2-4 phrases",
  "love":     "1-3 phrases",
  "energy":   "1-3 phrases",
  "advice":   "1-2 phrases"
}
```

### User (exemple d'appel)

```json
{
  "date": "Mardi 2 Juin",
  "angle_principal":   { "theme": "désir et friction relationnelle", "situation": "passion, initiative amoureuse, ça crépite dans le bon sens", "domaine": "l'amour-passion, la créativité, le jeu, le plaisir" },
  "angle_relationnel": { "theme": "amour à l'épreuve, engagement", "situation": "froideur, distance, peur de ne pas être assez aimée", "domaine": "le couple, les associations, les relations en face-à-face" },
  "couleur_du_jour":   { "theme": "réactivité émotionnelle", "situation": "irritabilité, agacement qui se déclenche pour un rien", "domaine": "le foyer, la famille, les racines" },
  "baseline":          { "lune_signe": "Capricorne", "asc_signe": "Cancer" }
}
```

---

## 8. Note sur les exemples few-shot (important)

⚠️ Le bug du contenu actuel : l'ancien prompt contenait des phrases-exemples vivantes ("Tu vas avoir envie de dire des choses que tu gardes d'habitude pour toi…") que le modèle **recopiait mot pour mot** dans chaque horoscope. C'est ce qui produisait le "toujours pareil".

Donc :
- Si on ajoute des exemples few-shot pour caler le ton, ils doivent être marqués `<exemple_de_style_NE_PAS_REUTILISER>` et le system doit interdire d'en réutiliser les formulations (déjà fait en §7).
- Mieux : valider d'abord sans few-shot, vu que maintenant la divergence vient du brief (input réellement différent), plus de l'écriture.

---

## 9. Paramètres LLM

- Modèle : gpt-4.1-mini (production).
- `temperature` : 0.8 (chaleur du contenu).
- `response_format` : json_object si dispo.
- Le déterminisme vient de la sélection PHP (mêmes transits → même brief), pas du modèle.

---

## 10. Tests de recette (à faire avant de merger)

1. **Différenciation inter-personnes** : générer le MÊME jour pour 3 thèmes natals très différents (ex: Lune Bélier/ASC Lion, Lune Capricorne/ASC Cancer, Lune Poissons/ASC Vierge). Les 3 horoscopes doivent être nettement distincts. → c'est le test qui échouait avant.
2. **Différenciation inter-jours** : même personne sur 5 jours consécutifs. `couleur_du_jour` (Lune) doit changer chaque jour ; `angle_principal` doit tourner tous les 2-4 jours.
3. **Sections distinctes** : vérifier qu'overview / love / energy ne répètent pas le même thème.
4. **Zéro fuite de jargon** : aucun nom de planète/aspect/maison dans la sortie.
5. **Fallback** : forcer un jour sans aspect serré → vérifier que ça ne plante pas et que le texte reste correct.
6. **Anti-copie** : vérifier qu'aucune phrase du brief n'apparaît telle quelle dans la sortie.

---

## Fichiers concernés

- `lunestia_transits_natal.json` — table de correspondance (fournie).
- `PlanetaryCalculator.php` — ajouter : `contactsScores()`, `selectionnerAngles()`, `composerBrief()`, et la méthode publique d'orchestration `genererBriefHoroscope($natal, $transits, $date): array`.
- Service horoscope existant — remplacer le prompt par celui de la §7, alimenter avec le brief.
