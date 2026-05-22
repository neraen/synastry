/* =========================================================
   Lunestia — Compatibility page (sub-components)
   Expects: PG, SG, SignGlyph, PlanetGlyph on window
   Exposes: Hero, DimensionBars, AnalyseCeleste, AccordionList,
            AspectKey, AdviceCard, Actions, Starfield on window
   ========================================================= */

const { useState, useEffect, useRef, useMemo } = React;

/* ---------- Icons ---------- */
const I = {
  back: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  more: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
    </svg>
  ),
  heart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  pulse: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  bolt: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  anchor: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="22"/>
      <path d="M5 12a7 7 0 0 0 14 0"/><line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  chat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  chev: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  share: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  arrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  sparkle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>
    </svg>
  ),
  bulb: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11.2c.7.5 1 1.3 1 2.1V17h4v-.7c0-.8.3-1.6 1-2.1A6 6 0 0 0 12 3z"/>
    </svg>
  ),
  cor: () => ( /* corner ornament constellation */
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="20" cy="20" r="1.5" fill="currentColor"/>
      <circle cx="50" cy="35" r="1.2" fill="currentColor"/>
      <circle cx="80" cy="25" r="1.8" fill="currentColor"/>
      <circle cx="70" cy="60" r="1.2" fill="currentColor"/>
      <circle cx="35" cy="70" r="1.5" fill="currentColor"/>
      <line x1="20" y1="20" x2="50" y2="35" opacity="0.4"/>
      <line x1="50" y1="35" x2="80" y2="25" opacity="0.4"/>
      <line x1="50" y1="35" x2="70" y2="60" opacity="0.4"/>
      <line x1="70" y1="60" x2="35" y2="70" opacity="0.4"/>
    </svg>
  ),
};

/* ---------- Starfield ---------- */
function Starfield({ count = 38 }) {
  const stars = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 1.8,
    peak: 0.3 + Math.random() * 0.55,
    delay: Math.random() * 5,
    dur: 3.5 + Math.random() * 4,
  })), [count]);
  return (
    <div className="starfield" aria-hidden="true">
      {stars.map((s, i) => (
        <span key={i} className="star" style={{
          left: s.x + "%", top: s.y + "%",
          width: s.size, height: s.size,
          ["--peak"]: s.peak,
          animationDelay: s.delay + "s",
          animationDuration: s.dur + "s",
        }} />
      ))}
      <span className="shooting-star" style={{ top: "12%", left: "10%", animationDelay: "3s" }} />
      <span className="shooting-star" style={{ top: "60%", left: "55%", animationDelay: "9s" }} />
    </div>
  );
}

/* ---------- Hero (names + circular score) ---------- */
function Hero({ scoreTarget = 95, tagline, nameA = "C", nameB = "T", subjectA = "Clément", subjectB = "Test", showOrbit = true }) {
  const [shown, setShown] = useState(0);
  const ringSize = 200;
  const stroke = 10;
  const r = (ringSize - stroke) / 2;
  const C = 2 * Math.PI * r;

  useEffect(() => {
    // Animate from 0 to target
    let frame; const t0 = performance.now(); const dur = 1500;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(scoreTarget * eased));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scoreTarget]);

  const dashOffset = C - (shown / 100) * C;

  return (
    <section className="hero">
      <div className="hero-pair">
        <div className="hero-avatar">{nameA}</div>
        <div className="hero-link" />
        <div className="hero-avatar b">{nameB}</div>
      </div>
      <div className="hero-names">
        <b>{subjectA}</b> <span>×</span> <b>{subjectB}</b>
      </div>

      <div className="score-ring-wrap">
        {showOrbit && <div className="score-orbit" />}
        <svg className="score-ring" width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0D585"/>
              <stop offset="50%" stopColor="#E5C266"/>
              <stop offset="100%" stopColor="#9B5CFF"/>
            </linearGradient>
          </defs>
          <circle className="track" cx={ringSize/2} cy={ringSize/2} r={r}
            fill="none" strokeWidth={stroke}/>
          <circle className="progress" cx={ringSize/2} cy={ringSize/2} r={r}
            fill="none" strokeWidth={stroke}
            strokeDasharray={C}
            strokeDashoffset={dashOffset}/>
        </svg>
        <div className="score-center">
          <div className="score-value">{shown}<span className="pct">%</span></div>
          <div className="score-label">Compatibilité</div>
        </div>
      </div>

      <h2 className="hero-tagline">{tagline}</h2>
      <div className="hero-divider" />
    </section>
  );
}

/* ---------- Dimension bars (collapsible) ---------- */
function DimensionBars({ data, unified = false }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [fillReady, setFillReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFillReady(true), 220);
    return () => clearTimeout(id);
  }, []);

  return (
    <section className="section">
      <div className="section-head">
        <span className="kicker">Compatibilité par dimension</span>
        <span className="rule"/>
      </div>
      <div className={"dim-card" + (unified ? " unified" : "")}>
        {data.map((d, i) => {
          const open = openIdx === i;
          return (
            <div key={d.id}
                 className={"dim-row " + d.id + (open ? " open" : "")}
                 onClick={() => setOpenIdx(open ? null : i)}>
              <div className="dim-head">
                <span className="dim-icon">{d.icon}</span>
                <span className="dim-name">{d.name}</span>
                <span className="dim-value">{d.value}%</span>
                <span className="dim-chev"><I.chev/></span>
              </div>
              <div className="dim-bar">
                <div className="dim-bar-fill"
                     style={{ width: fillReady ? d.value + "%" : "0%",
                              transitionDelay: (0.1 + i * 0.08) + "s" }} />
              </div>
              <div className="dim-detail">
                <div className="dim-detail-inner">{d.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Analyse céleste (collapsible long text) ---------- */
function AnalyseCeleste({ headline, summary, longText }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="section">
      <div className="analyse-card">
        <div className="analyse-corner"><I.cor/></div>
        <div className="analyse-kicker"><I.star/> Analyse céleste</div>
        <h3 className="analyse-headline">{headline}</h3>
        <div className={"analyse-text text-fader " + (open ? "" : "collapsed")}>
          {summary.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className={"collapse " + (open ? "open" : "")}>
          <div className="collapse-inner">
            <div className="analyse-text" style={{ marginTop: 8 }}>
              {longText.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
        <button className={"read-more " + (open ? "open" : "")} onClick={() => setOpen(!open)}>
          {open ? "Réduire" : "Lire la suite"} <I.chev/>
        </button>
      </div>
    </section>
  );
}

/* ---------- Accordion list (forces / vigilance) ---------- */
function AccordionList({ kicker, items, variant = "strength" }) {
  const [openIdx, setOpenIdx] = useState(-1);
  return (
    <section className="section">
      <div className="section-head">
        <span className="kicker">{kicker}</span>
        <span className="rule"/>
      </div>
      <div className="acc-list">
        {items.map((it, i) => {
          const open = openIdx === i;
          return (
            <div key={i} className={"acc-item " + variant + (open ? " open" : "")}>
              <button className="acc-head" onClick={() => setOpenIdx(open ? -1 : i)}>
                <span className="acc-glyph">
                  <PlanetGlyph id={it.planet}/>
                  {it.badge && (
                    <span className="badge"><SignGlyph id={it.badge}/></span>
                  )}
                </span>
                <span className="acc-title">
                  {it.title}
                  <span className="acc-summary">{it.summary}</span>
                </span>
                <span className="acc-chev"><I.chev/></span>
              </button>
              <div className="acc-body">
                <div className="acc-body-inner">
                  {it.detail}
                  {it.tags && (
                    <div className="acc-tags">
                      {it.tags.map((t, j) => (
                        <span key={j} className="acc-tag">
                          {t.icon}{t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Aspect clé ---------- */
function AspectKey({ planetA, planetB, name, desc }) {
  return (
    <section className="aspect-key">
      <div className="aspect-key-kicker">Aspect clé · Conjonction parfaite</div>
      <div className="aspect-visual">
        <span className="aspect-planet"><PlanetGlyph id={planetA}/></span>
        <span className="aspect-line">
          <span className="conj">☌</span>
        </span>
        <span className="aspect-planet"><PlanetGlyph id={planetB}/></span>
      </div>
      <p className="aspect-name">{name}</p>
      <p className="aspect-desc">{desc}</p>
    </section>
  );
}

/* ---------- Conseil ---------- */
function AdviceCard({ title, text }) {
  return (
    <section className="advice">
      <span className="advice-icon"><I.bulb/></span>
      <h4 className="advice-title">{title}</h4>
      <p className="advice-text">{text}</p>
    </section>
  );
}

/* ---------- Actions ---------- */
function Actions({ onTheme, onNew, themeName = "Test" }) {
  return (
    <div className="actions">
      <div className="action-row">
        <a className="btn-ghost" href="Partage.html"><I.share/> Partager</a>
        <button className="btn-ghost" onClick={onTheme}><I.star/> Thème de {themeName}</button>
      </div>
      <button className="btn-primary" onClick={onNew}>Nouvelle analyse <I.arrowRight/></button>
    </div>
  );
}

Object.assign(window, {
  CompatI: I,
  Hero, DimensionBars, AnalyseCeleste, AccordionList,
  AspectKey, AdviceCard, Actions, Starfield,
});
