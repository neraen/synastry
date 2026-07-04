/**
 * Glyphes SVG des signes (tracés Claude design, repris d'AstralHero /
 * astro-glyphs.jsx). Dessinés dans un espace 24×24, stroke hérité du parent.
 *
 * - `SIGN_GLYPH_SHAPES` : formes brutes à embarquer dans un <G> (roue).
 * - `SignGlyphIcon` : composant autonome pour les cards.
 */

import React from 'react';
import Svg, { Circle, G, Line, Path, Polyline } from 'react-native-svg';

/** Formes par id de signe (cf. SIGNS dans astro-content.ts), espace 24×24. */
export const SIGN_GLYPH_SHAPES: Record<string, React.ReactElement> = {
    aries: (
        <Path d="M12 19V8M12 8c-1.5-3-5-3.5-7-2.5C3 6 3.5 9 5 10c1.5 1 4.5-1 7-2zM12 8c1.5-3 5-3.5 7-2.5C21 6 20.5 9 19 10c-1.5 1-4.5-1-7-2z" />
    ),
    taurus: (
        <>
            <Circle cx={12} cy={15} r={5} />
            <Path d="M5 5c1 2.5 3.5 5 7 5s6-2.5 7-5" />
        </>
    ),
    gemini: (
        <Path d="M5 4c2-1 4-1 6 0M13 4c2-1 4-1 6 0M5 20c2 1 4 1 6 0M13 20c2 1 4 1 6 0M8 4v16M16 4v16" />
    ),
    cancer: (
        <>
            <Circle cx={8} cy={10} r={2.5} />
            <Circle cx={16} cy={14} r={2.5} />
            <Path d="M3.5 9.5C5 5 9 4 12 4s7 1 8.5 5.5M20.5 14.5C19 19 15 20 12 20s-7-1-8.5-5.5" />
        </>
    ),
    leo: (
        <>
            <Circle cx={9} cy={9} r={4.5} />
            <Path d="M13 9c0 3-1 6-1 8.5 0 2 1.5 3 3 2.5s2-2 2-3.5" />
        </>
    ),
    virgo: (
        <>
            <Path d="M4 19V8c0-2 3-2 3 0v11M7 8c0-2 3-2 3 0v11M10 8c0-2 3-2 3 0v8c0 3 3 3 4 1.5s.5-3.5-1-4.5" />
            <Circle cx={17} cy={13} r={2.5} />
        </>
    ),
    libra: (
        <Path d="M5 17h14M4 13h6c0-3 1-5 2-5s2 2 2 5h6" />
    ),
    scorpio: (
        <>
            <Path d="M4 19V8c0-2 3-2 3 0v11M7 8c0-2 3-2 3 0v11M10 8c0-2 3-2 3 0v9l5 3" />
            <Polyline points="15 19 18 20 19 17" />
        </>
    ),
    sagittarius: (
        <>
            <Line x1={4} y1={20} x2={20} y2={4} />
            <Polyline points="13 4 20 4 20 11" />
            <Line x1={9} y1={11} x2={13} y2={15} />
        </>
    ),
    capricorn: (
        <>
            <Path d="M4 5l5 13 3-10 4 12" />
            <Circle cx={18} cy={16} r={3} />
        </>
    ),
    aquarius: (
        <Path d="M3 10l3-2 3 2 3-2 3 2 3-2 3 2M3 16l3-2 3 2 3-2 3 2 3-2 3 2" />
    ),
    pisces: (
        <Path d="M6 4c-1 3-1 13 0 16M18 4c1 3 1 13 0 16M4 12h16" />
    ),
};

/**
 * Forme d'un signe à poser dans la roue : centrée sur (cx, cy),
 * `size` en unités du viewBox parent.
 */
export function WheelSignGlyph({
    id, cx, cy, size, color, opacity = 1,
}: {
    id: string;
    cx: number;
    cy: number;
    size: number;
    color: string;
    opacity?: number;
}) {
    const shape = SIGN_GLYPH_SHAPES[id];
    if (!shape) return null;
    const k = size / 24;
    return (
        <G
            transform={`translate(${cx - size / 2}, ${cy - size / 2}) scale(${k})`}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
        >
            {shape}
        </G>
    );
}

/** Glyphe autonome pour les cards / chips. */
export function SignGlyphIcon({
    id, size = 24, color,
}: {
    id: string;
    size?: number;
    color: string;
}) {
    const shape = SIGN_GLYPH_SHAPES[id];
    if (!shape) return null;
    return (
        <Svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {shape}
        </Svg>
    );
}
