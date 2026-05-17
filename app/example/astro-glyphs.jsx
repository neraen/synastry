/* ============================================================
   astro-glyphs.jsx — shared SVG glyphs for zodiac & planets.
   Loaded before any component that needs them.
   Exposes: SG, PG, SignGlyph, PlanetGlyph on window.
   ============================================================ */

/* Zodiac signs — stroke style, 24×24 viewBox */
const SG = {
  aries: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V8M12 8c-1.5-3-5-3.5-7-2.5C3 6 3.5 9 5 10c1.5 1 4.5-1 7-2zM12 8c1.5-3 5-3.5 7-2.5C21 6 20.5 9 19 10c-1.5 1-4.5-1-7-2z"/></svg>),
  taurus: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="15" r="5"/><path d="M5 5c1 2.5 3.5 5 7 5s6-2.5 7-5"/></svg>),
  gemini: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4c2-1 4-1 6 0M13 4c2-1 4-1 6 0M5 20c2 1 4 1 6 0M13 20c2 1 4 1 6 0M8 4v16M16 4v16"/></svg>),
  cancer: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="10" r="2.5"/><circle cx="16" cy="14" r="2.5"/><path d="M3.5 9.5C5 5 9 4 12 4s7 1 8.5 5.5M20.5 14.5C19 19 15 20 12 20s-7-1-8.5-5.5"/></svg>),
  leo: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="4.5"/><path d="M13 9c0 3-1 6-1 8.5 0 2 1.5 3 3 2.5s2-2 2-3.5"/></svg>),
  virgo: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V8c0-2 3-2 3 0v11M7 8c0-2 3-2 3 0v11M10 8c0-2 3-2 3 0v8c0 3 3 3 4 1.5s.5-3.5-1-4.5"/><circle cx="17" cy="13" r="2.5"/></svg>),
  libra: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M4 13h6c0-3 1-5 2-5s2 2 2 5h6"/></svg>),
  scorpio: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V8c0-2 3-2 3 0v11M7 8c0-2 3-2 3 0v11M10 8c0-2 3-2 3 0v9l5 3"/><polyline points="15 19 18 20 19 17"/></svg>),
  sagittarius: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><polyline points="13 4 20 4 20 11"/><line x1="9" y1="11" x2="13" y2="15"/></svg>),
  capricorn: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5l5 13 3-10 4 12"/><circle cx="18" cy="16" r="3"/></svg>),
  aquarius: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l3-2 3 2 3-2 3 2 3-2 3 2M3 16l3-2 3 2 3-2 3 2 3-2 3 2"/></svg>),
  pisces: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4c-1 3-1 13 0 16M18 4c1 3 1 13 0 16M4 12h16"/></svg>),
};

/* Planets — stroke style, 24×24 viewBox */
const PG = {
  sun: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>),
  moon: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4c-3 1.5-5 4.5-5 8s2 6.5 5 8c-5.5 0-9-3.5-9-8s3.5-8 9-8z"/></svg>),
  mercury: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3c0 2.5 1.8 4.5 4 4.5s4-2 4-4.5"/><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="16.5" x2="12" y2="22"/><line x1="9" y1="20" x2="15" y2="20"/></svg>),
  venus: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/></svg>),
  mars: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="14 4 20 4 20 10"/></svg>),
  jupiter: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6c0-1 1-2 3-2s4 1 4 5v9"/><line x1="3" y1="14" x2="17" y2="14"/></svg>),
  saturn: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="4" x2="10" y2="17"/><line x1="6" y1="6" x2="14" y2="6"/><path d="M10 17c0 2 2 3 4 2s3-3 1-5"/></svg>),
  uranus: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="15"/><line x1="6" y1="9" x2="18" y2="9"/><circle cx="12" cy="18" r="3"/></svg>),
  neptune: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6c0 6 4 12 8 12s8-6 8-12"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="8" y1="18" x2="16" y2="18"/></svg>),
  pluto: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="3.5"/><path d="M8.5 9c-1.5 0-2.5 1-2.5 3v4M15.5 9c1.5 0 2.5 1 2.5 3v4"/><line x1="6" y1="20" x2="18" y2="20"/></svg>),
};

const SignGlyph = ({ id, className = "sign-glyph" }) => {
  const Comp = SG[id] || (() => null);
  return <span className={className}><Comp /></span>;
};
const PlanetGlyph = ({ id, className = "sign-glyph" }) => {
  const Comp = PG[id] || (() => null);
  return <span className={className}><Comp /></span>;
};

Object.assign(window, { SG, PG, SignGlyph, PlanetGlyph });
