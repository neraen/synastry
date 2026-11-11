/**
 * Ton Ciel — catalogue d'étoiles.
 *
 * Données : assets/sky/stars.json, généré par scripts/build-star-catalog.py à
 * partir du catalogue d3-celestial (licence BSD-3, (c) 2015 Olaf Frohn) :
 * toutes les étoiles jusqu'à la magnitude 5,3, positions J2000.
 */

import catalog from '@/assets/sky/stars.json';

/** Teinte : 0 bleu, 1 blanc, 2 chaud (jaune/orangé), 3 rouge */
export type StarTint = 0 | 1 | 2 | 3;

/** Étoile : nom (vide si anonyme), ascension droite (°), déclinaison (°), magnitude, teinte */
export type CatalogStar = {
    name: string;
    ra: number;
    dec: number;
    mag: number;
    tint: StarTint;
};

type NamedRow = [string, number, number, number, number];
type StarRow = [number, number, number, number];

/** Étoiles brillantes nommées : candidates au rôle d'étoile gardienne. */
export const NAMED_STARS: CatalogStar[] = (catalog.named as NamedRow[]).map(
    ([name, ra, dec, mag, tint]) => ({ name, ra, dec, mag, tint: tint as StarTint }),
);

/** Toutes les autres étoiles visibles à l'œil nu. */
export const FIELD_STARS: CatalogStar[] = (catalog.stars as StarRow[]).map(
    ([ra, dec, mag, tint]) => ({ name: '', ra, dec, mag, tint: tint as StarTint }),
);
