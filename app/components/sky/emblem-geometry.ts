/**
 * Ton Ciel — géométrie de l'emblème de constellation.
 *
 * La constellation est vue depuis le pôle de l'écliptique : les planètes suivent
 * un arc de cercle, leurs étoiles gardiennes s'en écartent vers l'intérieur ou
 * l'extérieur. La figure est recadrée pour remplir le carré demandé.
 */

import type { ConstellationNode } from './sky-model';

export type EmblemPoint = { x: number; y: number; node: ConstellationNode };

export function emblemPoints(nodes: ConstellationNode[], size: number, pad = 22): EmblemPoint[] {
    const raw = nodes.map((n) => {
        const lat = Math.max(-30, Math.min(30, n.eclLat));
        const r = n.kind === 'planet' ? 1 : 1 + (lat / 30) * 0.75;
        const a = (-n.eclLon * Math.PI) / 180;
        return { x: r * Math.cos(a), y: r * Math.sin(a), node: n };
    });
    const xs = raw.map((p) => p.x);
    const ys = raw.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const k = (size - pad * 2) / Math.max(maxX - minX, maxY - minY, 0.001);
    const offX = (size - (maxX - minX) * k) / 2;
    const offY = (size - (maxY - minY) * k) / 2;
    return raw.map((p) => ({ x: offX + (p.x - minX) * k, y: offY + (p.y - minY) * k, node: p.node }));
}
