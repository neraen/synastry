/**
 * Carte du ciel — contenu statique FR + définitions astrologiques.
 * Signes, planètes (+ Lilith, Nœud Nord), maisons, aspects.
 * Les clés planètes sont alignées sur l'API natal-chart (Sun…Pluto, Lilith, NorthNode).
 */

// ─── Tokens visuels de la carte (palette des maquettes, cf. horoscope.tsx) ────

export const WHEEL_T = {
    bg:      '#120A24',
    card:    '#1F1740',
    border:  'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.12)',
    gold:    '#E5C266',
    goldSoft: 'rgba(229,194,102,0.16)',
    text:    '#ECE5F7',
    text2:   '#BDB2D4',
    text3:   '#8A82A6',
    violet:  '#9B5CFF',

    aspConj:    '#E5C266',
    aspSextile: '#5DA9F5',
    aspSquare:  '#E89B4C',
    aspTrine:   '#4ADE80',
    aspOppos:   '#E55A8C',
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SignDef = {
    id: string;
    name: string;
    glyph: string;
    element: 'Feu' | 'Terre' | 'Air' | 'Eau';
    modality: 'Cardinal' | 'Fixe' | 'Mutable';
    ruler: string;
    range: [number, number];
    desc: string;
};

export type PlanetDef = {
    key: string;      // clé API (Sun, Moon, …, Lilith, NorthNode)
    name: string;
    glyph: string;
    /** Point calculé (Lilith, Nœud Nord) : cliquable mais exclu des aspects */
    isPoint?: boolean;
    desc: string;
};

export type AspectDef = {
    id: string;
    name: string;
    short: string;
    angle: number;
    orb: number;
    color: string;
    glyph: string;
    desc: string;
};

// ─── Signes ────────────────────────────────────────────────────────────────────

export const SIGNS: SignDef[] = [
    { id: 'aries',       name: 'Bélier',      glyph: '♈', element: 'Feu',   modality: 'Cardinal', ruler: 'Mars',     range: [0, 30],
        desc: "Pionnier impulsif, le Bélier ouvre le zodiaque avec courage. Énergie d'initiative, besoin d'agir, parfois sans détour." },
    { id: 'taurus',      name: 'Taureau',     glyph: '♉', element: 'Terre', modality: 'Fixe',     ruler: 'Vénus',    range: [30, 60],
        desc: "Sensuel, posé, attaché à la beauté et à la stabilité. Le Taureau construit lentement mais sûrement." },
    { id: 'gemini',      name: 'Gémeaux',     glyph: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercure',  range: [60, 90],
        desc: "Vif, curieux, communicant. Les Gémeaux relient les idées et les gens, en surface comme en profondeur." },
    { id: 'cancer',      name: 'Cancer',      glyph: '♋', element: 'Eau',   modality: 'Cardinal', ruler: 'Lune',     range: [90, 120],
        desc: "Émotionnel, protecteur, attaché à ses racines. Le Cancer ressent avant de penser." },
    { id: 'leo',         name: 'Lion',        glyph: '♌', element: 'Feu',   modality: 'Fixe',     ruler: 'Soleil',   range: [120, 150],
        desc: "Rayonnant, généreux, créatif. Le Lion cherche à exprimer pleinement sa singularité." },
    { id: 'virgo',       name: 'Vierge',      glyph: '♍', element: 'Terre', modality: 'Mutable',  ruler: 'Mercure',  range: [150, 180],
        desc: "Analytique, méthodique, au service. La Vierge affine, trie, perfectionne le réel." },
    { id: 'libra',       name: 'Balance',     glyph: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Vénus',    range: [180, 210],
        desc: "Diplomate, esthète, en quête d'harmonie. La Balance pèse, équilibre, relie à l'autre." },
    { id: 'scorpio',     name: 'Scorpion',    glyph: '♏', element: 'Eau',   modality: 'Fixe',     ruler: 'Pluton',   range: [210, 240],
        desc: "Intense, transformateur, magnétique. Le Scorpion descend dans les profondeurs pour renaître." },
    { id: 'sagittarius', name: 'Sagittaire',  glyph: '♐', element: 'Feu',   modality: 'Mutable',  ruler: 'Jupiter',  range: [240, 270],
        desc: "Aventurier, philosophe, optimiste. Le Sagittaire vise large, cherche du sens dans l'horizon." },
    { id: 'capricorn',   name: 'Capricorne',  glyph: '♑', element: 'Terre', modality: 'Cardinal', ruler: 'Saturne',  range: [270, 300],
        desc: "Structurant, ambitieux, patient. Le Capricorne construit dans la durée, avec discipline." },
    { id: 'aquarius',    name: 'Verseau',     glyph: '♒', element: 'Air',   modality: 'Fixe',     ruler: 'Uranus',   range: [300, 330],
        desc: "Visionnaire, indépendant, collectif. Le Verseau pense différemment et invente l'avenir." },
    { id: 'pisces',      name: 'Poissons',    glyph: '♓', element: 'Eau',   modality: 'Mutable',  ruler: 'Neptune',  range: [330, 360],
        desc: "Sensible, mystique, fluide. Les Poissons dissolvent les frontières et accueillent l'invisible." },
];

export const ELEMENT_COLOR: Record<SignDef['element'], string> = {
    'Feu':   '#E89B4C',
    'Terre': '#A3B86C',
    'Air':   '#7DB5E8',
    'Eau':   '#9B7BE8',
};

// ─── Planètes & points ─────────────────────────────────────────────────────────

export const PLANETS: PlanetDef[] = [
    { key: 'Sun',     name: 'Soleil',   glyph: '☉', desc: "Ton noyau, ta vitalité, ce qui t'anime profondément. Là où tu rayonnes." },
    { key: 'Moon',    name: 'Lune',     glyph: '☽', desc: "Ton monde intérieur, tes besoins émotionnels, ce qui t'apaise et te ressource." },
    { key: 'Mercury', name: 'Mercure',  glyph: '☿', desc: "Ta manière de penser, d'apprendre, de communiquer. Le rythme de ton mental." },
    { key: 'Venus',   name: 'Vénus',    glyph: '♀', desc: "Ce que tu aimes, ce que tu attires, ton goût, ta relation à l'autre et au plaisir." },
    { key: 'Mars',    name: 'Mars',     glyph: '♂', desc: "Ton énergie d'action, ton désir, ta capacité à passer à l'acte et à affronter." },
    { key: 'Jupiter', name: 'Jupiter',  glyph: '♃', desc: "Ton expansion, ta chance, là où tu vois grand et où tu trouves du sens." },
    { key: 'Saturn',  name: 'Saturne',  glyph: '♄', desc: "Tes structures, tes leçons, ta discipline. Ce que tu construis dans la durée." },
    { key: 'Uranus',  name: 'Uranus',   glyph: '♅', desc: "Tes ruptures, ton originalité, ta liberté. Là où tu inventes et te libères." },
    { key: 'Neptune', name: 'Neptune',  glyph: '♆', desc: "Tes rêves, ton imaginaire, ta sensibilité au subtil et au spirituel." },
    { key: 'Pluto',   name: 'Pluton',   glyph: '♇', desc: "Tes transformations profondes, ton pouvoir, ce qui meurt pour mieux renaître." },
    { key: 'Lilith',  name: 'Lilith',   glyph: '⚸', isPoint: true,
        desc: "Ta Lune noire : la part d'ombre, l'instinct brut, ce que tu refuses de domestiquer. Là où tu n'appartiens qu'à toi." },
    { key: 'NorthNode', name: 'Nœud Nord', glyph: '☊', isPoint: true,
        desc: "Ta direction d'évolution : ce vers quoi ta vie te tire, même quand c'est inconfortable. Le chemin à apprivoiser." },
];

/** Clés participant au calcul des aspects (planètes classiques uniquement). */
export const ASPECT_PLANET_KEYS = PLANETS.filter((p) => !p.isPoint).map((p) => p.key);

// ─── Maisons ───────────────────────────────────────────────────────────────────

export const HOUSE_MEANINGS = [
    "Soi, identité, apparence. Comment tu te présentes au monde.",
    "Valeurs, ressources, matériel. Ce que tu possèdes et ce qui te nourrit.",
    "Mental, frères et sœurs, échanges proches. Ton environnement immédiat.",
    "Foyer, racines, famille. Ta base intime et émotionnelle.",
    "Créativité, plaisir, enfants. Ce que tu mets au monde par joie.",
    "Travail, santé, routine. Ton rapport au quotidien et au service.",
    "Couple, partenariats, autrui. Ce que tu vis à travers la relation.",
    "Transformation, intimité partagée, ressources de l'autre.",
    "Sens, voyages, études supérieures. Ta quête d'horizon.",
    "Vocation, carrière, statut social. Ce que tu vises haut.",
    "Amis, groupes, projets collectifs. Ton réseau et tes idéaux.",
    "Inconscient, retraite, spiritualité. Ce qui se prépare en coulisses.",
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// ─── Aspects ───────────────────────────────────────────────────────────────────

export const ASPECTS_DEF: AspectDef[] = [
    { id: 'conjunction', name: 'Conjonction', short: 'Conj.',   angle: 0,   orb: 8, color: WHEEL_T.aspConj,    glyph: '☌',
        desc: "Fusion d'énergies. Les planètes parlent d'une seule voix, pour le meilleur ou pour le pire." },
    { id: 'sextile',     name: 'Sextile',     short: 'Sextile', angle: 60,  orb: 4, color: WHEEL_T.aspSextile, glyph: '⚹',
        desc: "Opportunité fluide. Une porte qui s'ouvre si tu fais le geste." },
    { id: 'square',      name: 'Carré',       short: 'Carré',   angle: 90,  orb: 6, color: WHEEL_T.aspSquare,  glyph: '□',
        desc: "Tension structurante. Un défi qui pousse à la croissance par friction." },
    { id: 'trine',       name: 'Trigone',     short: 'Trigone', angle: 120, orb: 6, color: WHEEL_T.aspTrine,   glyph: '△',
        desc: "Flot harmonieux. Un talent naturel, qui circule sans effort." },
    { id: 'opposition',  name: 'Opposition',  short: 'Oppos.',  angle: 180, orb: 8, color: WHEEL_T.aspOppos,   glyph: '☍',
        desc: "Polarité face à face. Cherche l'équilibre entre deux pôles qui s'attirent et se repoussent." },
];
