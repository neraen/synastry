/* global React */
const { useEffect, useRef, useState } = React;

/* =====================================================================
   Lunestia · Planet Loaders
   A family of in-app loaders, all sharing the brand's astral language:
   deep indigo/violet field, gold light, soft star sparkle.
   Each loader is self-contained, accepts a `size` prop and an optional
   `label`, and is meant to be dropped into the centre of any screen
   while content is fetched.
   ===================================================================== */

/* ---------- shared starfield (decorative, no animation cost) ---------- */
function MicroStars({ count = 14, seed = 1, area = 220 }) {
  const stars = React.useMemo(() => {
    const rng = mulberry32(seed * 9301 + 49297);
    return Array.from({ length: count }, (_, i) => {
      const r = Math.sqrt(rng()) * (area / 2 - 6) + 4;
      const a = rng() * Math.PI * 2;
      return {
        x: Math.cos(a) * r + area / 2,
        y: Math.sin(a) * r + area / 2,
        s: rng() * 1.4 + 0.5,
        d: rng() * 3,
        o: 0.35 + rng() * 0.5,
      };
    });
  }, [count, seed, area]);
  return (
    <svg className="ll-stars" viewBox={`0 0 ${area} ${area}`} aria-hidden="true">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r={s.s}
          fill="#fff"
          opacity={s.o}
          style={{ animation: `llTwinkle 2.8s ease-in-out ${s.d}s infinite` }}
        />
      ))}
    </svg>
  );
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ===================================================================
   1) SATURN — Planet with tilted orbital ring + revolving moon
   The most iconic "loading the cosmos" feel. Slow, considered motion.
   =================================================================== */
function LoaderSaturn({ size = 180, label = "Lecture du ciel…" }) {
  return (
    <div className="ll-wrap" style={{ "--ll-size": size + "px" }}>
      <div className="ll-canvas">
        <MicroStars seed={3} area={size} />

        {/* breathing aura behind everything */}
        <div className="ll-aura ll-aura-saturn" />

        {/* the planet */}
        <div className="ll-saturn-planet">
          <div className="ll-saturn-shading" />
          <div className="ll-saturn-terminator" />
          <div className="ll-saturn-highlight" />
        </div>

        {/* tilted ring with a moon riding it */}
        <div className="ll-saturn-ring-tilt">
          <svg viewBox="0 0 200 200" className="ll-saturn-ring-svg" aria-hidden="true">
            <defs>
              <linearGradient id="llRing" x1="0" x2="1" y1="0.5" y2="0.5">
                <stop offset="0"   stopColor="#E5C266" stopOpacity="0.15" />
                <stop offset="0.5" stopColor="#F0D585" stopOpacity="0.95" />
                <stop offset="1"   stopColor="#E5C266" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="llRingInner" x1="0" x2="1" y1="0.5" y2="0.5">
                <stop offset="0"   stopColor="#E5C266" stopOpacity="0" />
                <stop offset="0.5" stopColor="#B89549" stopOpacity="0.6" />
                <stop offset="1"   stopColor="#E5C266" stopOpacity="0" />
              </linearGradient>
            </defs>
            <ellipse cx="100" cy="100" rx="86" ry="22"
              fill="none" stroke="url(#llRing)" strokeWidth="1.5" />
            <ellipse cx="100" cy="100" rx="76" ry="17"
              fill="none" stroke="url(#llRingInner)" strokeWidth="1" />
          </svg>
          <div className="ll-saturn-moon-orbit">
            <div className="ll-saturn-moon" />
          </div>
        </div>
      </div>

      {label && <div className="ll-label">{label}</div>}
    </div>
  );
}

/* ===================================================================
   2) LUNAR PHASES — Single moon cycling through its phases
   Literal nod to "Lunestia". Quietest, most meditative option.
   =================================================================== */
function LoaderLunarPhases({ size = 180, label = "Alignement des phases…" }) {
  return (
    <div className="ll-wrap" style={{ "--ll-size": size + "px" }}>
      <div className="ll-canvas">
        <MicroStars seed={7} area={size} />
        <div className="ll-aura ll-aura-moon" />

        <div className="ll-moon">
          <div className="ll-moon-disc" />
          <div className="ll-moon-shadow" />
          <div className="ll-moon-craters">
            <span style={{ top: "22%", left: "30%", width: "14%", height: "14%" }} />
            <span style={{ top: "55%", left: "55%", width: "9%",  height: "9%"  }} />
            <span style={{ top: "65%", left: "25%", width: "7%",  height: "7%"  }} />
            <span style={{ top: "35%", left: "62%", width: "6%",  height: "6%"  }} />
          </div>
        </div>

        {/* faint progress arc around the moon */}
        <svg viewBox="0 0 200 200" className="ll-moon-arc" aria-hidden="true">
          <defs>
            <linearGradient id="llMoonArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E5C266" stopOpacity="0" />
              <stop offset="0.6" stopColor="#E5C266" stopOpacity="0.85" />
              <stop offset="1" stopColor="#F0D585" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="86"
            fill="none" stroke="url(#llMoonArc)" strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="160 380" />
        </svg>
      </div>

      {label && <div className="ll-label">{label}</div>}
    </div>
  );
}

/* ===================================================================
   3) ORBIT TRIO — Glowing core + three planets on concentric paths
   Reads as "the system is aligning". Most dynamic option.
   =================================================================== */
function LoaderOrbitTrio({ size = 180, label = "Calcul des transits…" }) {
  return (
    <div className="ll-wrap" style={{ "--ll-size": size + "px" }}>
      <div className="ll-canvas">
        <MicroStars seed={11} area={size} />
        <div className="ll-aura ll-aura-trio" />

        {/* three orbital paths */}
        <svg viewBox="0 0 200 200" className="ll-trio-paths" aria-hidden="true">
          <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(229,194,102,0.10)" />
          <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(229,194,102,0.08)" />
          <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(229,194,102,0.06)" />
        </svg>

        {/* central sun */}
        <div className="ll-trio-core">
          <div className="ll-trio-core-flare" />
        </div>

        {/* orbiting bodies */}
        <div className="ll-trio-orbit ll-trio-orbit-1"><span /></div>
        <div className="ll-trio-orbit ll-trio-orbit-2"><span /></div>
        <div className="ll-trio-orbit ll-trio-orbit-3"><span /></div>
      </div>

      {label && <div className="ll-label">{label}</div>}
    </div>
  );
}

/* ===================================================================
   4) ZODIAC DIAL — Rotating gilded ring with zodiac glyph tick marks
   Echoes the AstralHero / chart aesthetic; feels "official".
   =================================================================== */
function LoaderZodiac({ size = 180, label = "Tracé de la carte…" }) {
  const ticks = Array.from({ length: 12 });
  return (
    <div className="ll-wrap" style={{ "--ll-size": size + "px" }}>
      <div className="ll-canvas">
        <MicroStars seed={5} area={size} count={10} />
        <div className="ll-aura ll-aura-zodiac" />

        {/* rotating outer ring with tick marks */}
        <div className="ll-zodiac-ring">
          <svg viewBox="-100 -100 200 200" aria-hidden="true">
            <defs>
              <linearGradient id="llZGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0"   stopColor="#E5C266" stopOpacity="0.1" />
                <stop offset="0.5" stopColor="#F0D585" stopOpacity="0.9" />
                <stop offset="1"   stopColor="#E5C266" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <circle r="78" cx="0" cy="0" fill="none"
              stroke="url(#llZGrad)" strokeWidth="1" />
            <circle r="68" cx="0" cy="0" fill="none"
              stroke="rgba(229,194,102,0.18)" strokeWidth="0.5"
              strokeDasharray="2 6" />
            {ticks.map((_, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
              const x1 = Math.cos(a) * 72, y1 = Math.sin(a) * 72;
              const x2 = Math.cos(a) * 80, y2 = Math.sin(a) * 80;
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#E5C266" strokeOpacity={i % 3 === 0 ? 0.95 : 0.4}
                  strokeWidth={i % 3 === 0 ? 1.6 : 0.9}
                  strokeLinecap="round" />
              );
            })}
            {/* the bright marker that travels with rotation */}
            <circle cx="0" cy="-78" r="2.2" fill="#F0D585" />
            <circle cx="0" cy="-78" r="5" fill="#E5C266" opacity="0.25" />
          </svg>
        </div>

        {/* counter-rotating inner ring, dashed */}
        <div className="ll-zodiac-inner">
          <svg viewBox="-100 -100 200 200" aria-hidden="true">
            <circle r="50" cx="0" cy="0" fill="none"
              stroke="rgba(229,194,102,0.5)" strokeWidth="0.8"
              strokeDasharray="3 8" />
          </svg>
        </div>

        {/* still center planet */}
        <div className="ll-zodiac-center">
          <div className="ll-zodiac-center-glow" />
        </div>
      </div>

      {label && <div className="ll-label">{label}</div>}
    </div>
  );
}

/* ===================================================================
   5) ECLIPSE — Two bodies sliding into alignment, repeating
   The most cinematic / emotional option.
   =================================================================== */
function LoaderEclipse({ size = 180, label = "Conjonction en cours…" }) {
  return (
    <div className="ll-wrap" style={{ "--ll-size": size + "px" }}>
      <div className="ll-canvas">
        <MicroStars seed={2} area={size} />

        {/* corona — only shows during eclipse moment */}
        <div className="ll-eclipse-corona" />

        {/* gold sun, fixed */}
        <div className="ll-eclipse-sun" />

        {/* dark moon, sweeps across */}
        <div className="ll-eclipse-moon-track">
          <div className="ll-eclipse-moon" />
        </div>

        {/* delicate trail */}
        <svg viewBox="0 0 200 200" className="ll-eclipse-trail" aria-hidden="true">
          <line x1="20" y1="100" x2="180" y2="100"
            stroke="rgba(229,194,102,0.18)" strokeWidth="0.6"
            strokeDasharray="2 6" />
        </svg>
      </div>

      {label && <div className="ll-label">{label}</div>}
    </div>
  );
}

/* expose */
Object.assign(window, {
  LoaderSaturn,
  LoaderLunarPhases,
  LoaderOrbitTrio,
  LoaderZodiac,
  LoaderEclipse,
});
