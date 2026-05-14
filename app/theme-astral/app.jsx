/* ============================================================
   Lunestia — Thème astral
   Mounts the screen: header, chart, legend, info panel, tab bar.
   ============================================================ */

const { useState, useMemo, useCallback } = React;

/* --- Small inline icons (stroke = currentColor) -------------- */
const Icon = {
  sparkle: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l2.3 6.7L21 11l-6.7 2.3L12 20l-2.3-6.7L3 11l6.7-2.3L12 2z"/>
    </svg>
  ),
  help: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>
    </svg>
  ),
  pin: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  cake: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M3 15h18"/><path d="M8 11V8m4 3V8m4 3V8"/>
    </svg>
  ),
  clock: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  sun: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  ),
  star: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l2.9 6.9L22 9.7l-5.3 4.7L18.2 22 12 18.3 5.8 22l1.5-7.6L2 9.7l7.1-.8L12 2z"/>
    </svg>
  ),
  starOutline: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
      <path d="M12 2l2.9 6.9L22 9.7l-5.3 4.7L18.2 22 12 18.3 5.8 22l1.5-7.6L2 9.7l7.1-.8L12 2z"/>
    </svg>
  ),
  heart: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  chat: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  bolt: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

/* --- Info panel content based on selection ------------------- */
function InfoPanel({ selected, onClear }) {
  const aspectsAll = useMemo(() => computeAspects(PLANETS), []);

  if (!selected || selected.kind === "chart") {
    return (
      <div className="info">
        <div className="info-kicker">Explore</div>
        <h3 className="info-title">Touche un élément</h3>
        <p className="info-sub">Planètes, signes, maisons ou lignes d'aspect — touche pour voir le détail.</p>
        <div className="pill-row">
          <span className="pill">☉ Soleil — <b>Verseau</b></span>
          <span className="pill">☽ Lune — <b>Gémeaux</b></span>
          <span className="pill">ASC — <b>Cancer</b></span>
        </div>
      </div>
    );
  }

  if (selected.kind === "planet") {
    const p = PLANETS.find(x => x.id === selected.id);
    const { sign, degInSign } = lonToSign(p.lon);
    const houseIdx = HOUSES.findIndex((h, i) => {
      const next = HOUSES[(i+1) % 12].cusp;
      const inSec = h.cusp < next
        ? (p.lon >= h.cusp && p.lon < next)
        : (p.lon >= h.cusp || p.lon < next);
      return inSec;
    });
    const house = HOUSES[houseIdx];
    const myAspects = aspectsAll.filter(a => a.a === p.id || a.b === p.id);

    return (
      <div className="info">
        <div className="info-head">
          <div className="info-glyph symbol-font">{p.glyph}</div>
          <div className="info-meta">
            <div className="info-kicker">Planète</div>
            <h3 className="info-title">{p.name}</h3>
            <div className="info-sub">{formatPos(p.lon)} · Maison {house.roman}</div>
          </div>
        </div>
        <div className="info-body"><p>{p.desc}</p></div>
        {myAspects.length > 0 && (
          <div className="pill-row">
            {myAspects.slice(0, 5).map((a, i) => {
              const other = a.a === p.id ? a.bName : a.aName;
              const oG    = a.a === p.id ? a.bGlyph : a.aGlyph;
              return (
                <span key={i} className="pill" style={{ borderColor: a.color, color: "var(--text)" }}>
                  <span style={{ color: a.color, marginRight: 4 }}>{a.typeName === "Conjonction" ? "☌" : a.typeName === "Trigone" ? "△" : a.typeName === "Carré" ? "□" : a.typeName === "Sextile" ? "⚹" : "☍"}</span>
                  {oG} {other}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (selected.kind === "sign") {
    const s = SIGNS.find(x => x.id === selected.id);
    const planetsInSign = PLANETS.filter(p => {
      const L = p.lon;
      return L >= s.range[0] && L < s.range[1];
    });
    return (
      <div className="info">
        <div className="info-head">
          <div className="info-glyph symbol-font" style={{ color: ELEMENT_COLOR[s.element], background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.10)" }}>{s.glyph}</div>
          <div className="info-meta">
            <div className="info-kicker">Signe</div>
            <h3 className="info-title">{s.name}</h3>
            <div className="info-sub">{s.element} · {s.modality} · Régi par {s.ruler}</div>
          </div>
        </div>
        <div className="info-body"><p>{s.desc}</p></div>
        {planetsInSign.length > 0 ? (
          <div className="pill-row">
            {planetsInSign.map(p => (
              <span key={p.id} className="pill"><span style={{marginRight:4}}>{p.glyph}</span> <b>{p.name}</b></span>
            ))}
          </div>
        ) : (
          <div className="pill-row"><span className="pill">Aucune planète personnelle</span></div>
        )}
      </div>
    );
  }

  if (selected.kind === "house") {
    const h = HOUSES.find(x => x.id === selected.id);
    const next = HOUSES[(h.num % 12)].cusp;
    const planetsHere = PLANETS.filter(p => {
      const L = p.lon;
      return h.cusp < next ? (L >= h.cusp && L < next) : (L >= h.cusp || L < next);
    });
    const cuspSign = lonToSign(h.cusp);
    return (
      <div className="info">
        <div className="info-head">
          <div className="info-glyph" style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28 }}>{h.roman}</div>
          <div className="info-meta">
            <div className="info-kicker">Maison</div>
            <h3 className="info-title">Maison {h.num}</h3>
            <div className="info-sub">Cuspide en {cuspSign.sign.name} {Math.floor(cuspSign.degInSign)}°</div>
          </div>
        </div>
        <div className="info-body"><p>{h.desc}</p></div>
        {planetsHere.length > 0 && (
          <div className="pill-row">
            {planetsHere.map(p => (
              <span key={p.id} className="pill"><span style={{marginRight:4}}>{p.glyph}</span> <b>{p.name}</b></span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (selected.kind === "aspect") {
    const a = selected.payload;
    const def = ASPECTS_DEF.find(d => d.id === a.type);
    return (
      <div className="info">
        <div className="info-head">
          <div className="info-glyph symbol-font" style={{ color: def.color, background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.10)" }}>{def.glyph}</div>
          <div className="info-meta">
            <div className="info-kicker">Aspect</div>
            <h3 className="info-title">{a.typeName}</h3>
            <div className="info-sub">
              <span style={{ marginRight: 6 }}>{a.aGlyph} {a.aName}</span>
              <span style={{ color: "var(--text-3)" }}>—</span>
              <span style={{ marginLeft: 6 }}>{a.bGlyph} {a.bName}</span>
            </div>
          </div>
        </div>
        <div className="info-body"><p>{def.desc}</p></div>
        <div className="pill-row">
          <span className="pill">Angle <b>{def.angle}°</b></span>
          <span className="pill">Orbe <b>{a.orbActual}°</b></span>
        </div>
      </div>
    );
  }

  return null;
}

/* --- Aspect legend (also filters/highlights on hover-tap) ----- */
function Legend({ selected, onSelect }) {
  return (
    <div className="legend" role="list">
      {ASPECTS_DEF.map(a => {
        const isActive = selected?.kind === "aspectType" && selected.id === a.id;
        return (
          <button
            key={a.id}
            type="button"
            className={"leg" + (isActive ? " active" : "")}
            onClick={() => onSelect({ kind: "aspectType", id: a.id, payload: { typeName: a.name, desc: a.desc, color: a.color, def: a } })}
          >
            <span className="swatch" style={{ background: a.color }} />
            {a.short}
          </button>
        );
      })}
    </div>
  );
}

/* --- Aspect-type info card (when legend tapped) -------------- */
function AspectTypeCard({ selected }) {
  if (selected?.kind !== "aspectType") return null;
  const def = selected.payload.def;
  return (
    <div className="info">
      <div className="info-head">
        <div className="info-glyph symbol-font" style={{ color: def.color, background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.10)" }}>{def.glyph}</div>
        <div className="info-meta">
          <div className="info-kicker">Type d'aspect</div>
          <h3 className="info-title">{def.name}</h3>
          <div className="info-sub">Angle de {def.angle}° · Orbe ±{def.orb}°</div>
        </div>
      </div>
      <div className="info-body"><p>{def.desc}</p></div>
    </div>
  );
}

/* --- Tab bar -------------------------------------------------- */
function TabBar({ active }) {
  const tabs = [
    { id: "horo",  icon: <Icon.sun /> },
    { id: "natal", icon: <Icon.star /> },
    { id: "compa", icon: <Icon.heart /> },
    { id: "lyra",  icon: <Icon.chat /> },
    { id: "cal",   icon: <Icon.bolt /> },
  ];
  return (
    <nav className="tabbar" aria-label="Navigation">
      {tabs.map(t => (
        <button key={t.id} type="button"
          className={"tab" + (t.id === active ? " active" : "")}
          aria-current={t.id === active ? "page" : undefined}
        >{t.icon}</button>
      ))}
    </nav>
  );
}

/* --- App ----------------------------------------------------- */
function App() {
  const [selected, setSelected] = useState({ kind: "chart" });

  const handleSelect = useCallback((s) => {
    setSelected(prev => (prev && prev.kind === s.kind && prev.id === s.id) ? { kind: "chart" } : s);
  }, []);

  return (
    <div className="stage">
      <div className="phone">
        <div className="scroll">
          {/* Top bar */}
          <header className="topbar">
            <div className="brand">
              <Icon.sparkle />
              <span>Lunestia</span>
            </div>
            <div className="hello">
              <span className="hello-text">Bonjour, Clément</span>
              <span className="avatar">C</span>
            </div>
          </header>

          {/* Section chip */}
          <div className="chip-row">
            <span className="chip"><span className="dot" />Thème astral</span>
            <button type="button" className="help" aria-label="Aide"><Icon.help /></button>
          </div>

          {/* Title */}
          <h1 className="title">Votre carte du ciel</h1>
          <p className="subtitle">
            Touchez les planètes, signes, maisons ou lignes d'aspect pour explorer leur signification.
          </p>

          {/* Birth metadata */}
          <div className="meta">
            <span className="meta-item"><Icon.cake /> <b>{BIRTH.date}</b></span>
            <span className="meta-item"><Icon.clock /> <b>{BIRTH.time}</b></span>
            <span className="meta-item"><Icon.pin /> <b>{BIRTH.place}</b></span>
          </div>

          {/* Chart */}
          <div className="chart-wrap">
            <NatalChart selected={selected} onSelect={handleSelect} />
          </div>

          {/* Aspect legend */}
          <Legend selected={selected} onSelect={handleSelect} />

          {/* Info panel — switches between aspect-type card and per-element card */}
          {selected?.kind === "aspectType"
            ? <AspectTypeCard selected={selected} />
            : <InfoPanel selected={selected} onClear={() => setSelected({ kind: "chart" })} />
          }
        </div>

        <TabBar active="natal" />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
