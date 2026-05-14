/**
 * Astrological data — signes, planètes, maisons, aspects.
 * French labels + glyphs (Unicode) + descriptions for the info panel.
 */

export type Sign = {
  id: string;
  name: string;
  glyph: string;
  element: 'Feu' | 'Terre' | 'Air' | 'Eau';
  modality: 'Cardinal' | 'Fixe' | 'Mutable';
  ruler: string;
  range: [number, number];
  desc: string;
};

export type Planet = {
  id: string;
  name: string;
  glyph: string;
  lon: number; // ecliptic longitude 0–360 (0 = 0° Aries)
  desc: string;
};

export type House = {
  id: string;
  num: number;
  roman: string;
  cusp: number;
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

export type Aspect = {
  a: string; b: string;
  aName: string; bName: string;
  aGlyph: string; bGlyph: string;
  type: string;
  typeName: string;
  color: string;
  orbActual: string;
};

import { tokens } from '../theme/tokens';

export const SIGNS: Sign[] = [
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

export const ELEMENT_COLOR: Record<Sign['element'], string> = {
  'Feu':   '#E89B4C',
  'Terre': '#A3B86C',
  'Air':   '#7DB5E8',
  'Eau':   '#9B7BE8',
};

export const PLANETS: Planet[] = [
  { id: 'sun',     name: 'Soleil',   glyph: '☉', lon: 304.45, desc: "Ton noyau, ta vitalité, ce qui t'anime profondément. Là où tu rayonnes." },
  { id: 'moon',    name: 'Lune',     glyph: '☽', lon: 88.57,  desc: "Ton monde intérieur, tes besoins émotionnels, ce qui t'apaise et te ressource." },
  { id: 'mercury', name: 'Mercure',  glyph: '☿', lon: 318.02, desc: "Ta manière de penser, d'apprendre, de communiquer. Le rythme de ton mental." },
  { id: 'venus',   name: 'Vénus',    glyph: '♀', lon: 306.27, desc: "Ce que tu aimes, ce que tu attires, ton goût, ta relation à l'autre et au plaisir." },
  { id: 'mars',    name: 'Mars',     glyph: '♂', lon: 297.27, desc: "Ton énergie d'action, ton désir, ta capacité à passer à l'acte et à affronter." },
  { id: 'jupiter', name: 'Jupiter',  glyph: '♃', lon: 222.67, desc: "Ton expansion, ta chance, là où tu vois grand et où tu trouves du sens." },
  { id: 'saturn',  name: 'Saturne',  glyph: '♄', lon: 168.0,  desc: "Tes structures, tes leçons, ta discipline. Ce que tu construis dans la durée." },
  { id: 'uranus',  name: 'Uranus',   glyph: '♅', lon: 35.0,   desc: "Tes ruptures, ton originalité, ta liberté. Là où tu inventes et te libères." },
  { id: 'neptune', name: 'Neptune',  glyph: '♆', lon: 355.0,  desc: "Tes rêves, ton imaginaire, ta sensibilité au subtil et au spirituel." },
  { id: 'pluto',   name: 'Pluton',   glyph: '♇', lon: 295.0,  desc: "Tes transformations profondes, ton pouvoir, ce qui meurt pour mieux renaître." },
];

export const ASC_LON = 105;  // Cancer 15°
export const MC_LON  = 15;   // Aries 15°

const HOUSE_MEANINGS = [
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

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

export const HOUSES: House[] = Array.from({ length: 12 }, (_, i) => ({
  id:    `h${i + 1}`,
  num:   i + 1,
  roman: ROMAN[i],
  cusp:  (ASC_LON + i * 30) % 360,
  desc:  HOUSE_MEANINGS[i],
}));

export const ASPECTS_DEF: AspectDef[] = [
  { id: 'conjunction', name: 'Conjonction', short: 'Conj.',   angle: 0,   orb: 8, color: tokens.color.aspConj,    glyph: '☌',
    desc: "Fusion d'énergies. Les planètes parlent d'une seule voix, pour le meilleur ou pour le pire." },
  { id: 'sextile',     name: 'Sextile',     short: 'Sextile', angle: 60,  orb: 4, color: tokens.color.aspSextile, glyph: '⚹',
    desc: "Opportunité fluide. Une porte qui s'ouvre si tu fais le geste." },
  { id: 'square',      name: 'Carré',       short: 'Carré',   angle: 90,  orb: 6, color: tokens.color.aspSquare,  glyph: '□',
    desc: "Tension structurante. Un défi qui pousse à la croissance par friction." },
  { id: 'trine',       name: 'Trigone',     short: 'Trigone', angle: 120, orb: 6, color: tokens.color.aspTrine,   glyph: '△',
    desc: "Flot harmonieux. Un talent naturel, qui circule sans effort." },
  { id: 'opposition',  name: 'Opposition',  short: 'Oppos.',  angle: 180, orb: 8, color: tokens.color.aspOppos,   glyph: '☍',
    desc: "Polarité face à face. Cherche l'équilibre entre deux pôles qui s'attirent et se repoussent." },
];

/** Compute aspects between every pair of planets (one aspect max per pair). */
export function computeAspects(planets: Planet[]): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i], b = planets[j];
      let diff = Math.abs(a.lon - b.lon) % 360;
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECTS_DEF) {
        const delta = Math.abs(diff - asp.angle);
        if (delta <= asp.orb) {
          out.push({
            a: a.id, b: b.id,
            aName: a.name, bName: b.name,
            aGlyph: a.glyph, bGlyph: b.glyph,
            type: asp.id,
            typeName: asp.name,
            color: asp.color,
            orbActual: delta.toFixed(1),
          });
          break;
        }
      }
    }
  }
  return out;
}

export function lonToSign(lon: number): { sign: Sign; degInSign: number } {
  const L = ((lon % 360) + 360) % 360;
  const i = Math.floor(L / 30);
  return { sign: SIGNS[i], degInSign: L - i * 30 };
}

export function formatPos(lon: number): string {
  const { sign, degInSign } = lonToSign(lon);
  const d = Math.floor(degInSign);
  const m = Math.round((degInSign - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}' ${sign.name}`;
}

export function planetHouse(lon: number): House {
  for (let i = 0; i < 12; i++) {
    const h = HOUSES[i];
    const next = HOUSES[(i + 1) % 12].cusp;
    const inSec = h.cusp < next
      ? (lon >= h.cusp && lon < next)
      : (lon >= h.cusp || lon < next);
    if (inSec) return h;
  }
  return HOUSES[0];
}

export const BIRTH = {
  date:  '12 février 1995',
  time:  '15:40',
  place: 'Rennes, France',
};
