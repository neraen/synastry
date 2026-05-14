/**
 * Lunestia — design tokens
 * Mirrors the CSS variables from the web version exactly.
 */
export const tokens = {
  color: {
    bg:       '#120A24',
    bg2:      '#1A1233',
    card:     '#1F1740',
    card2:    '#261B4D',
    border:        'rgba(255,255,255,0.07)',
    borderStrong:  'rgba(255,255,255,0.12)',

    gold:     '#E5C266',
    goldDim:  '#B89549',
    goldSoft: 'rgba(229,194,102,0.16)',

    text:  '#ECE5F7',
    text2: '#BDB2D4',
    text3: '#8A82A6',

    violet: '#9B5CFF',
    pink:   '#E55A8C',
    green:  '#4ADE80',

    // Aspects
    aspConj:    '#E5C266',
    aspTrine:   '#4ADE80',
    aspSextile: '#5DA9F5',
    aspSquare:  '#E89B4C',
    aspOppos:   '#E55A8C',
  },

  font: {
    serif: 'DMSerifDisplay_400Regular',
    sans:  'PlusJakartaSans_400Regular',
    sansMedium:   'PlusJakartaSans_500Medium',
    sansSemi:     'PlusJakartaSans_600SemiBold',
    sansBold:     'PlusJakartaSans_700Bold',
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },

  /**
   * Chart geometry — all in SVG viewBox units (1000 × 1000, center 500,500).
   * Identical to the web version so the chart looks the same.
   */
  chart: {
    cx: 500, cy: 500,
    rOuter:       480,
    rSignInner:   408,
    rTickOut:     408,
    rTickIn:      396,
    rHouseOuter:  396,
    rHouseInner:  290,
    rHouseNum:    312,
    rPlanet:      358,
    rPlanetTick:  392,
    rPlanetAnch:  300,
    rAspect:      290,
  },
} as const;

export type Tokens = typeof tokens;
