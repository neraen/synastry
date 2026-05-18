/* ============================================================
   Lunestia — Onboarding hero illustrations
   Large animated celestial icons at the top of each screen.
   Pure SVG + SMIL animations for max reliability.
   ============================================================ */

/* ---- Shared decorative bits ---- */
function AmbientStars({ seed = 0 }) {
  // 4 twinkling stars at corners of the 200x200 viewbox
  const stars = [
    { cx: 32 + seed,  cy: 56,  r: 1.3, dur: 3.4, peak: 0.9, dim: 0.15 },
    { cx: 170 - seed, cy: 64,  r: 1.0, dur: 2.9, peak: 0.7, dim: 0.10 },
    { cx: 168,        cy: 152, r: 1.3, dur: 4.0, peak: 0.85, dim: 0.10 },
    { cx: 36,         cy: 148, r: 1.0, dur: 3.3, peak: 0.6, dim: 0.15 },
    { cx: 100,        cy: 28,  r: 0.9, dur: 3.6, peak: 0.8, dim: 0.10 },
    { cx: 100,        cy: 178, r: 0.9, dur: 3.1, peak: 0.7, dim: 0.10 },
  ];
  return (
    <g>
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff">
          <animate attributeName="opacity"
            values={`${s.dim};${s.peak};${s.dim}`}
            dur={`${s.dur}s`} repeatCount="indefinite"/>
        </circle>
      ))}
    </g>
  );
}

/* ============================================================
   HERO 1 — Privacy / Shield
   ============================================================ */
function HeroShield() {
  return (
    <div className="hero-illus" aria-hidden="true">
      <div className="hero-aura" />
      <svg className="hero-svg" viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="shGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#FFE9A8"/>
            <stop offset="48%" stopColor="#E5C266"/>
            <stop offset="100%" stopColor="#8E6F31"/>
          </linearGradient>
          <linearGradient id="shFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D1F5E"/>
            <stop offset="100%" stopColor="#150B30"/>
          </linearGradient>
          <radialGradient id="shGleam" cx="32%" cy="22%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </radialGradient>
          <radialGradient id="shMoon" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFE9A8"/>
            <stop offset="100%" stopColor="#B89549"/>
          </radialGradient>
        </defs>

        <AmbientStars seed={2}/>

        {/* Tilted dashed orbit + traveling sparkle */}
        <g transform="rotate(-18 100 100)">
          <ellipse cx="100" cy="100" rx="80" ry="28"
                   stroke="rgba(229,194,102,0.32)" strokeWidth="1" fill="none"
                   strokeDasharray="1.5 4"/>
          <circle r="2.6" fill="#F4DC95">
            <animateMotion dur="9s" repeatCount="indefinite"
              path="M 180 100 A 80 28 0 1 1 20 100 A 80 28 0 1 1 180 100 Z"/>
            <animate attributeName="opacity"
              values="0;1;1;0" keyTimes="0;0.08;0.92;1"
              dur="9s" repeatCount="indefinite"/>
          </circle>
          <circle r="1.8" fill="#F4DC95" opacity="0.7">
            <animateMotion dur="9s" repeatCount="indefinite" begin="-4.5s"
              path="M 180 100 A 80 28 0 1 1 20 100 A 80 28 0 1 1 180 100 Z"/>
          </circle>
        </g>

        {/* Shield with subtle float */}
        <g>
          <animateTransform attributeName="transform" attributeType="XML"
            type="translate" values="0 0; 0 -3; 0 0"
            dur="5s" repeatCount="indefinite"/>
          {/* Outer gold rim */}
          <path d="M100 52 L138 65 L138 102 C138 124 122 142 100 150 C78 142 62 124 62 102 L62 65 Z"
                fill="url(#shGold)"/>
          {/* Thin inner gold border */}
          <path d="M100 58 L132 69 L132 102 C132 121 119 137 100 144 C81 137 68 121 68 102 L68 69 Z"
                fill="none" stroke="rgba(255,233,168,0.45)" strokeWidth="0.7"/>
          {/* Inner face */}
          <path d="M100 62 L130 72 L130 102 C130 119 117 134 100 140 C83 134 70 119 70 102 L70 72 Z"
                fill="url(#shFace)"/>
          {/* Soft gleam */}
          <path d="M100 62 L130 72 L130 102 C130 119 117 134 100 140 C83 134 70 119 70 102 L70 72 Z"
                fill="url(#shGleam)"/>
          {/* Crescent moon — thinner sickle, geometrically centered in the shield */}
          <path
            d="M 85 100 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0
               M 91 100 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 Z"
            fillRule="evenodd"
            fill="url(#shMoon)"/>
        </g>
      </svg>
    </div>
  );
}

/* ============================================================
   HERO 2 — Guide / Astrolabe
   ============================================================ */
function HeroAstrolabe() {
  // Pre-compute tick marks and zodiac dots
  const ticks = [];
  for (let i = 0; i < 24; i++) {
    const ang = (i * 15) * Math.PI / 180;
    const isMajor = i % 2 === 0;
    const r1 = isMajor ? 60 : 62;
    const r2 = 68;
    ticks.push({
      x1: 100 + Math.cos(ang) * r1,
      y1: 100 + Math.sin(ang) * r1,
      x2: 100 + Math.cos(ang) * r2,
      y2: 100 + Math.sin(ang) * r2,
      major: isMajor,
    });
  }
  const zodiacStars = [0, 60, 120, 180, 240, 300].map(a => {
    const ang = a * Math.PI / 180;
    return { x: 100 + Math.cos(ang) * 46, y: 100 + Math.sin(ang) * 46 };
  });

  return (
    <div className="hero-illus" aria-hidden="true">
      <div className="hero-aura" />
      <svg className="hero-svg" viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="asGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#FFE9A8"/>
            <stop offset="50%" stopColor="#E5C266"/>
            <stop offset="100%" stopColor="#8E6F31"/>
          </linearGradient>
          <radialGradient id="asCore" cx="38%" cy="36%" r="65%">
            <stop offset="0%"  stopColor="#FFF4CC"/>
            <stop offset="55%" stopColor="#E5C266"/>
            <stop offset="100%" stopColor="#7E6328"/>
          </radialGradient>
          <radialGradient id="asGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgba(244,220,149,0.55)"/>
            <stop offset="100%" stopColor="rgba(244,220,149,0)"/>
          </radialGradient>
        </defs>

        <AmbientStars />

        {/* Outer tick ring — rotates slowly */}
        <g>
          <animateTransform attributeName="transform" attributeType="XML"
            type="rotate" from="0 100 100" to="360 100 100"
            dur="48s" repeatCount="indefinite"/>
          <circle cx="100" cy="100" r="68" stroke="rgba(229,194,102,0.40)" strokeWidth="1" fill="none"/>
          <circle cx="100" cy="100" r="60" stroke="rgba(229,194,102,0.16)" strokeWidth="1" fill="none"/>
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? "#E5C266" : "rgba(229,194,102,0.5)"}
              strokeWidth={t.major ? 1.4 : 1} strokeLinecap="round"/>
          ))}
          {/* Cardinal sparkle markers */}
          {[0, 90, 180, 270].map((a, i) => {
            const ang = a * Math.PI / 180;
            const x = 100 + Math.cos(ang) * 72;
            const y = 100 + Math.sin(ang) * 72;
            return <circle key={i} cx={x} cy={y} r="2.2" fill="#F4DC95"/>;
          })}
        </g>

        {/* Mid ring — counter-rotates */}
        <g>
          <animateTransform attributeName="transform" attributeType="XML"
            type="rotate" from="360 100 100" to="0 100 100"
            dur="32s" repeatCount="indefinite"/>
          <circle cx="100" cy="100" r="46" stroke="rgba(229,194,102,0.45)" strokeWidth="1" fill="none" strokeDasharray="2 3"/>
          {zodiacStars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r="1.6" fill="#F4DC95"/>
          ))}
        </g>

        {/* Crossed pointers (the alidade) — slowly tilts back and forth */}
        <g>
          <animateTransform attributeName="transform" attributeType="XML"
            type="rotate" values="-6 100 100; 6 100 100; -6 100 100"
            dur="11s" repeatCount="indefinite"/>
          <line x1="100" y1="30" x2="100" y2="170"
            stroke="url(#asGold)" strokeWidth="1.6" strokeLinecap="round" opacity="0.75"/>
          <line x1="30" y1="100" x2="170" y2="100"
            stroke="url(#asGold)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5"/>
          {/* Arrow tips */}
          <circle cx="100" cy="30" r="2.4" fill="#F4DC95"/>
          <circle cx="100" cy="170" r="2" fill="#F4DC95" opacity="0.7"/>
        </g>

        {/* Central golden disc */}
        <g>
          <circle cx="100" cy="100" r="26" fill="url(#asGlow)">
            <animate attributeName="r" values="24;28;24" dur="3.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="100" cy="100" r="16" fill="url(#asCore)"
            stroke="rgba(255,233,168,0.6)" strokeWidth="0.7"/>
          {/* 4-point star embossed */}
          <path d="M100 86 L102.5 97.5 L114 100 L102.5 102.5 L100 114 L97.5 102.5 L86 100 L97.5 97.5 Z"
            fill="#180E36" opacity="0.65"/>
          {/* Tiny white pinprick */}
          <circle cx="100" cy="100" r="1" fill="#FFF4CC">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite"/>
          </circle>
        </g>
      </svg>
    </div>
  );
}

/* ============================================================
   HERO 3 — Done / Celestial finale
   ============================================================ */
function HeroFinale() {
  return (
    <div className="hero-illus hero-finale" aria-hidden="true">
      <div className="hero-aura hero-aura-strong" />
      <svg className="hero-svg" viewBox="0 0 200 200" fill="none">
        <defs>
          <radialGradient id="fnStar" cx="50%" cy="42%" r="55%">
            <stop offset="0%"  stopColor="#FFFAE0"/>
            <stop offset="35%" stopColor="#F4DC95"/>
            <stop offset="100%" stopColor="#8E6F31"/>
          </radialGradient>
          <radialGradient id="fnGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgba(244,220,149,0.6)"/>
            <stop offset="55%" stopColor="rgba(244,220,149,0.06)"/>
            <stop offset="100%" stopColor="rgba(244,220,149,0)"/>
          </radialGradient>
        </defs>

        {/* Soft inner halo */}
        <circle cx="100" cy="100" r="78" fill="url(#fnGlow)"/>

        <AmbientStars />

        {/* Outermost ring with single planet */}
        <g>
          <animateTransform attributeName="transform" attributeType="XML"
            type="rotate" from="0 100 100" to="360 100 100"
            dur="38s" repeatCount="indefinite"/>
          <circle cx="100" cy="100" r="76" stroke="rgba(229,194,102,0.18)" strokeWidth="1" fill="none"/>
          <circle cx="176" cy="100" r="3.2" fill="#F4DC95"/>
          <circle cx="176" cy="100" r="6" fill="rgba(244,220,149,0.18)"/>
        </g>

        {/* Middle dashed ring, reverse */}
        <g>
          <animateTransform attributeName="transform" attributeType="XML"
            type="rotate" from="360 100 100" to="0 100 100"
            dur="26s" repeatCount="indefinite"/>
          <circle cx="100" cy="100" r="58" stroke="rgba(229,194,102,0.32)" strokeWidth="1"
                  fill="none" strokeDasharray="2 4"/>
          <circle cx="158" cy="100" r="2.4" fill="#F4DC95"/>
          <circle cx="42"  cy="100" r="1.8" fill="#F4DC95" opacity="0.8"/>
        </g>

        {/* Inner ring */}
        <g>
          <animateTransform attributeName="transform" attributeType="XML"
            type="rotate" from="0 100 100" to="360 100 100"
            dur="18s" repeatCount="indefinite"/>
          <circle cx="100" cy="100" r="40" stroke="rgba(229,194,102,0.5)" strokeWidth="1" fill="none"/>
          <circle cx="140" cy="100" r="2" fill="#F4DC95"/>
        </g>

        {/* Central 4-point star, pulsing */}
        <g transform="translate(58 58) scale(3.5)">
          <animateTransform attributeName="transform" attributeType="XML"
            type="rotate" from="0 12 12" to="360 12 12"
            dur="40s" repeatCount="indefinite" additive="sum"/>
          <path d="M12 1.5 L13.7 8.8 c0.2 0.7 0.7 1.3 1.4 1.5 L22.5 12 L15.1 13.7 c-0.7 0.2-1.2 0.8-1.4 1.5 L12 22.5 L10.3 15.2 c-0.2-0.7-0.7-1.3-1.4-1.5 L1.5 12 L8.9 10.3 c0.7-0.2 1.2-0.8 1.4-1.5 L12 1.5 z"
            fill="url(#fnStar)">
            <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
          </path>
        </g>

        {/* Hot pinprick at very center */}
        <circle cx="100" cy="100" r="2" fill="#FFFFFF">
          <animate attributeName="r" values="1.6;2.6;1.6" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>
  );
}

Object.assign(window, { HeroShield, HeroAstrolabe, HeroFinale });
