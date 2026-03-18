/**
 * AstroMatch Design System
 *
 * Central export for all design tokens
 */

export { default as colors, colors as c } from './colors';
export type { Colors } from './colors';

export { default as spacing, spacing as s, getSpacing, verticalGap } from './spacing';
export type { Spacing } from './spacing';

export { default as typography, typography as t, fontSizeScale, fontWeightScale, lineHeightScale } from './typography';
export type { Typography, TypographyVariant } from './typography';

export { default as radius, borderRadius } from './radius';
export type { Radius, BorderRadius } from './radius';

export { default as shadows, getShadow, getGlow } from './shadows';
export type { Shadows } from './shadows';

export { default as layout, isSmallDevice, isTablet } from './layout';
export type { Layout } from './layout';

// Unified theme object
import colors from './colors';
import spacing from './spacing';
import typography from './typography';
import radius, { borderRadius } from './radius';
import shadows from './shadows';
import layout from './layout';

export const theme = {
    colors,
    spacing,
    typography,
    radius,
    borderRadius,
    shadows,
    layout,
} as const;

export type Theme = typeof theme;
export default theme;