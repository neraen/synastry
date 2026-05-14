/* ============================================================
   <NatalChart /> — circular astrological chart (SVG)
   Reads from window globals: SIGNS, PLANETS, HOUSES,
   ASPECTS_DEF, ASC_LON, computeAspects.
   ============================================================ */

const { useMemo } = React;

/* --- Geometry helpers ---------------------------------------- */
const CX = 500, CY = 500;
const R_OUTER       = 480;   // outermost edge
const R_SIGN_INNER  = 408;   // inner edge of sign ring
const R_TICK_OUT    = 408;
const R_TICK_IN     = 396;
const R_HOUSE_OUTER = 396;   // top of houses area
const R_HOUSE_INNER = 290;   // bottom (where aspects start)
const R_HOUSE_NUM   = 312;   // where Roman numerals sit
const R_PLANET      = 358;   // planet glyph orbit
const R_PLANET_TICK = 392;   // little tick from glyph toward outer
const R_PLANET_ANCH = 300;   // anchor for aspect lines (inside aspects circle)
const R_ASPECT      = 290;   // aspect circle

/* Convert ecliptic longitude → SVG angle (radians).
   Convention: ASC at left (9 o'clock); longitude increases CCW. */
function lonToRad(lon) {
  return ((180 + ASC_LON - lon) * Math.PI) / 180;
}
function polar(r, lon) {
  const a = lonToRad(lon);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

/* SVG annular-sector path from lon1→lon2 (lon2 > lon1, sweep < 180°) */
function sectorPath(r1, r2, lon1, lon2) {
  const p1 = polar(r2, lon1);
  const p2 = polar(r2, lon2);
  const p3 = polar(r1, lon2);
  const p4 = polar(r1, lon1);
  // Going from lon1→lon2 visually = CCW on screen → sweep-flag 0
  return `M ${p1.x} ${p1.y}
          A ${r2} ${r2} 0 0 0 ${p2.x} ${p2.y}
          L ${p3.x} ${p3.y}
          A ${r1} ${r1} 0 0 1 ${p4.x} ${p4.y} Z`;
}

/* Collision-avoidance: nudge planets so glyphs don't overlap.
   Returns new {displayLon} per planet; lon (true) is kept for aspect math. */
function spreadPlanets(planets, minSep = 7) {
  // Sort by longitude
  const idx = planets.map((p, i) => ({ p, i })).sort((a, b) => a.p.lon - b.p.lon);

  // First pass forward
  for (let k = 1; k < idx.length; k++) {
    const prev = idx[k - 1];
    const cur  = idx[k];
    const gap = cur.p.lon - prev.p._adjustedLon;
    cur.p._adjustedLon = gap < minSep ? prev.p._adjustedLon + minSep : cur.p.lon;
    if (k === 1) prev.p._adjustedLon = prev.p._adjustedLon ?? prev.p.lon;
  }
  if (idx.length) idx[0].p._adjustedLon ??= idx[0].p.lon;

  // Map back to original order
  const out = planets.map(p => ({ ...p, displayLon: p._adjustedLon ?? p.lon }));
  // Clean up
  planets.forEach(p => delete p._adjustedLon);
  return out;
}

/* --- Component ------------------------------------------------ */
function NatalChart({ selected, onSelect }) {
  const aspects   = useMemo(() => computeAspects(PLANETS), []);
  const placement = useMemo(() => spreadPlanets(PLANETS, 7), []);

  const selKind = selected?.kind;
  const selId   = selected?.id;

  /* Tick marks every 1°/5°/10° on the inner edge of sign ring */
  const ticks = [];
  for (let d = 0; d < 360; d++) {
    const isMajor = d % 10 === 0;
    const isMid   = d % 5 === 0 && !isMajor;
    const r1 = R_TICK_OUT;
    const r2 = isMajor ? R_TICK_IN : isMid ? R_TICK_OUT - 6 : R_TICK_OUT - 3;
    const p1 = polar(r1, d);
    const p2 = polar(r2, d);
    ticks.push(
      <line key={`t${d}`}
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke="rgba(236,229,247,0.22)"
        strokeWidth={isMajor ? 1.2 : isMid ? 0.9 : 0.55}
      />
    );
  }

  /* House cusp lines */
  const houseLines = HOUSES.map((h, i) => {
    const isAngle = i === 0 || i === 3 || i === 6 || i === 9; // ASC, IC, DSC, MC
    const p1 = polar(R_HOUSE_INNER, h.cusp);
    const p2 = polar(R_HOUSE_OUTER, h.cusp);
    return (
      <line key={`hcusp${i}`}
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={isAngle ? "rgba(229,194,102,0.55)" : "rgba(236,229,247,0.18)"}
        strokeWidth={isAngle ? 1.5 : 0.8}
        strokeDasharray={isAngle ? "0" : "4 4"}
      />
    );
  });

  /* Angle (ASC/MC/DSC/IC) labels just outside the sign ring */
  const axisLabels = [
    { lon: ASC_LON,             text: "ASC", anchor: "end",   dx: -10, dy: 4 },
    { lon: (ASC_LON + 90)%360,  text: "IC",  anchor: "middle",dx: 0,   dy: 18 },
    { lon: (ASC_LON + 180)%360, text: "DSC", anchor: "start", dx: 10,  dy: 4 },
    { lon: (ASC_LON + 270)%360, text: "MC",  anchor: "middle",dx: 0,   dy: -10 },
  ].map((a, i) => {
    const p = polar(R_OUTER + 8, a.lon);
    return (
      <text key={`ax${i}`}
        x={p.x + a.dx} y={p.y + a.dy}
        textAnchor={a.anchor}
        fontSize="14"
        fontWeight="600"
        letterSpacing="0.12em"
        fill="rgba(229,194,102,0.85)"
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
      >{a.text}</text>
    );
  });

  return (
    <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Roue zodiacale interactive">

      {/* Soft glow backdrop */}
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="rgba(155,92,255,0.10)" />
          <stop offset="55%" stopColor="rgba(155,92,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="rgba(229,194,102,0.16)" />
          <stop offset="60%" stopColor="rgba(229,194,102,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r={R_OUTER + 6} fill="url(#bgGlow)" />

      {/* Outer rings */}
      <circle cx={CX} cy={CY} r={R_OUTER}        fill="none" stroke="rgba(236,229,247,0.20)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={R_SIGN_INNER}   fill="none" stroke="rgba(236,229,247,0.12)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={R_HOUSE_INNER}  fill="none" stroke="rgba(236,229,247,0.10)" strokeWidth="1" />

      {/* Zodiac sectors */}
      <g>
        {SIGNS.map((s, i) => {
          const active = selKind === "sign" && selId === s.id;
          const fill = active
            ? "rgba(229,194,102,0.18)"
            : i % 2 === 0
              ? "rgba(255,255,255,0.025)"
              : "rgba(255,255,255,0.045)";
          return (
            <path key={s.id}
              d={sectorPath(R_SIGN_INNER, R_OUTER, s.range[0], s.range[1])}
              fill={fill}
              stroke={active ? "rgba(229,194,102,0.55)" : "rgba(255,255,255,0.06)"}
              strokeWidth={active ? 1.5 : 0.6}
              className="hit"
              onClick={() => onSelect({ kind: "sign", id: s.id })}
            />
          );
        })}
      </g>

      {/* Tick marks */}
      <g pointerEvents="none">{ticks}</g>

      {/* Sign glyphs */}
      <g pointerEvents="none">
        {SIGNS.map((s) => {
          const mid = (s.range[0] + s.range[1]) / 2;
          const p = polar((R_OUTER + R_SIGN_INNER) / 2, mid);
          const active = selKind === "sign" && selId === s.id;
          return (
            <text key={s.id + "-g"}
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="34"
              fill={active ? "var(--gold)" : ELEMENT_COLOR[s.element]}
              opacity={active ? 1 : 0.92}
              className="symbol-font"
              style={{ transition: "fill .15s" }}
            >{s.glyph}</text>
          );
        })}
      </g>

      {/* House cusp lines */}
      <g pointerEvents="none">{houseLines}</g>

      {/* House numbers (clickable) */}
      <g>
        {HOUSES.map((h, i) => {
          const mid = (h.cusp + 15) % 360;
          const p = polar(R_HOUSE_NUM, mid);
          const active = selKind === "house" && selId === h.id;
          return (
            <g key={h.id} className="hit" onClick={() => onSelect({ kind: "house", id: h.id })}>
              {/* invisible larger hit area */}
              <circle cx={p.x} cy={p.y} r="22" fill="rgba(0,0,0,0)" />
              <text
                x={p.x} y={p.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize="14"
                fontWeight="500"
                fill={active ? "var(--gold)" : "rgba(189,178,212,0.65)"}
                style={{ fontFamily: '"DM Serif Display", serif', transition: "fill .15s" }}
              >{h.roman}</text>
            </g>
          );
        })}
      </g>

      {/* Center glow */}
      <circle cx={CX} cy={CY} r={R_ASPECT - 4} fill="url(#centerGlow)" pointerEvents="none" />

      {/* Aspect lines (in center) */}
      <g>
        {aspects.map((asp, i) => {
          const pa = placement.find(x => x.id === asp.a);
          const pb = placement.find(x => x.id === asp.b);
          const p1 = polar(R_PLANET_ANCH, pa.displayLon);
          const p2 = polar(R_PLANET_ANCH, pb.displayLon);
          const active = selKind === "aspect" && selId === `${asp.a}-${asp.b}`;
          return (
            <g key={`asp${i}`} className="hit"
               onClick={() => onSelect({ kind: "aspect", id: `${asp.a}-${asp.b}`, payload: asp })}>
              {/* invisible thick line for easier tap */}
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="rgba(0,0,0,0)" strokeWidth="14" pointerEvents="stroke" />
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={asp.color}
                strokeWidth={active ? 2.4 : 1.5}
                opacity={active ? 1 : 0.72}
                strokeLinecap="round"
                pointerEvents="none"
                style={{ transition: "opacity .15s, stroke-width .15s" }}
              />
            </g>
          );
        })}
      </g>

      {/* Axis labels (ASC/DSC/MC/IC) */}
      <g pointerEvents="none">{axisLabels}</g>

      {/* Planets */}
      <g>
        {placement.map((p) => {
          const trueP   = polar(R_PLANET_TICK, p.lon);          // true position tick on the wheel
          const dispP   = polar(R_PLANET, p.displayLon);        // glyph location after spread
          const linkA   = polar(R_PLANET_TICK - 6, p.lon);
          const linkB   = polar(R_PLANET + 16, p.displayLon);
          const active  = selKind === "planet" && selId === p.id;
          return (
            <g key={p.id}>
              {/* tiny tick at exact longitude on the wheel */}
              <line
                x1={polar(R_SIGN_INNER - 1, p.lon).x} y1={polar(R_SIGN_INNER - 1, p.lon).y}
                x2={polar(R_SIGN_INNER - 12, p.lon).x} y2={polar(R_SIGN_INNER - 12, p.lon).y}
                stroke="rgba(229,194,102,0.65)" strokeWidth="1.4"
                pointerEvents="none"
              />
              {/* connector from glyph to tick (only visible if displayLon != lon) */}
              {Math.abs(p.displayLon - p.lon) > 0.5 && (
                <line x1={linkA.x} y1={linkA.y} x2={linkB.x} y2={linkB.y}
                  stroke="rgba(229,194,102,0.35)" strokeWidth="0.8" strokeDasharray="2 2"
                  pointerEvents="none" />
              )}

              <g className="hit" onClick={() => onSelect({ kind: "planet", id: p.id })}>
                <circle cx={dispP.x} cy={dispP.y} r="22"
                  fill={active ? "rgba(229,194,102,0.95)" : "rgba(31,23,64,0.92)"}
                  stroke={active ? "var(--gold)" : "rgba(229,194,102,0.65)"}
                  strokeWidth={active ? 2 : 1.4}
                  style={{ transition: "all .15s" }}
                />
                <text x={dispP.x} y={dispP.y + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="22"
                  fill={active ? "#1A1233" : "var(--gold)"}
                  className="symbol-font"
                  style={{ transition: "fill .15s" }}
                >{p.glyph}</text>
              </g>
            </g>
          );
        })}
      </g>

      {/* Center mark */}
      <circle cx={CX} cy={CY} r="3" fill="rgba(229,194,102,0.6)" pointerEvents="none" />
    </svg>
  );
}

window.NatalChart = NatalChart;
