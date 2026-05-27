/* =========================================================
   Lunestia — Compatibilité v2 (composants + page)
   ========================================================= */

const { useState: v2useState, useEffect: v2useEffect, useMemo: v2useMemo } = React;

/* ---------- Icons ---------- */
const V2I = {
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
};

/* ---------- Starfield ---------- */
function V2Starfield({ count = 38 }) {
  const stars = v2useMemo(() => Array.from({ length: count }).map(() => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: 1 + Math.random() * 1.6,
    peak: 0.3 + Math.random() * 0.5,
    delay: Math.random() * 5, dur: 3.5 + Math.random() * 4,
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
    </div>
  );
}

/* ---------- Section head ---------- */
function SectionHead({ variant, kicker, count }) {
  return (
    <div className={"section-head sec-" + variant}>
      <span className="dot" />
      <span className="kicker">{kicker}</span>
      {count != null && <span className="count">({count})</span>}
      <span className="rule" />
    </div>
  );
}

/* ---------- Hero ---------- */
function V2Hero({ scoreTarget = 95, tagline, nameA, nameB, subjectA, subjectB, showOrbit = true }) {
  const [shown, setShown] = v2useState(0);
  const ringSize = 184;
  const stroke = 9;
  const r = (ringSize - stroke) / 2;
  const C = 2 * Math.PI * r;
  v2useEffect(() => {
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
        <b>{subjectA}</b> <span className="x">×</span> <b>{subjectB}</b>
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
          <circle className="track" cx={ringSize/2} cy={ringSize/2} r={r} fill="none" strokeWidth={stroke}/>
          <circle className="progress" cx={ringSize/2} cy={ringSize/2} r={r} fill="none" strokeWidth={stroke}
            strokeDasharray={C} strokeDashoffset={dashOffset}/>
        </svg>
        <div className="score-center">
          <div className="score-value">{shown}<span className="pct">%</span></div>
          <div className="score-label">Compatibilité</div>
        </div>
      </div>
      <h2 className="hero-tagline">{tagline}</h2>
    </section>
  );
}

/* ---------- Dimensions ---------- */
function V2Dimensions({ data, unified = false }) {
  const [openIdx, setOpenIdx] = v2useState(null);
  const [fillReady, setFillReady] = v2useState(false);
  v2useEffect(() => {
    const id = setTimeout(() => setFillReady(true), 220);
    return () => clearTimeout(id);
  }, []);
  return (
    <section className="section">
      <SectionHead variant="dim" kicker="Compatibilité par dimension" />
      <div className={"card dim-card" + (unified ? " unified" : "")}>
        {data.map((d, i) => {
          const open = openIdx === i;
          return (
            <div key={d.id} className={"dim-row " + d.id + (open ? " open" : "")}
                 onClick={() => setOpenIdx(open ? null : i)}>
              <div className="dim-head">
                <span className="dim-icon">{d.icon}</span>
                <span className="dim-name">{d.name}</span>
                <span className="dim-value">{d.value}%</span>
                <span className="dim-chev"><V2I.chev/></span>
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

/* ---------- Analyse céleste (with embedded Aspect clé) ---------- */
function V2Analyse({ headline, summary, longText, aspectKey }) {
  const [open, setOpen] = v2useState(false);
  return (
    <section className="section">
      <SectionHead variant="analyse" kicker="Analyse céleste" />
      <div className="card analyse">
        <h3 className="analyse-headline">{headline}</h3>
        <div className="analyse-text">
          {summary.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {/* Aspect clé inline as the centerpiece */}
        {aspectKey && (
          <div className="aspect-inline">
            <div className="aspect-inline-kicker">
              <span className="glow" />
              <span>Aspect clé · Conjonction parfaite</span>
            </div>
            <div className="aspect-visual">
              <span className="aspect-planet"><PlanetGlyph id={aspectKey.planetA}/></span>
              <span className="aspect-line"><span className="conj">☌</span></span>
              <span className="aspect-planet"><PlanetGlyph id={aspectKey.planetB}/></span>
            </div>
            <p className="aspect-name">{aspectKey.name}</p>
            <p className="aspect-desc">{aspectKey.desc}</p>
          </div>
        )}

        <div className={"collapse " + (open ? "open" : "")}>
          <div className="collapse-inner">
            <div className="analyse-text">
              {longText.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
        <button className={"read-more " + (open ? "open" : "")} onClick={() => setOpen(!open)}>
          {open ? "Réduire" : "Lire la suite"} <V2I.chev/>
        </button>
      </div>
    </section>
  );
}

/* ---------- Aspects list (forces / vigilance) ---------- */
function V2Aspects({ variant, kicker, items }) {
  const [openIdx, setOpenIdx] = v2useState(-1);
  return (
    <section className="section">
      <SectionHead variant={variant === "strength" ? "strength" : "watch"} kicker={kicker} count={items.length} />
      <div className="card flush">
        <div className="acc-list">
          {items.map((it, i) => {
            const open = openIdx === i;
            return (
              <div key={i} className={"acc-item " + variant + (open ? " open" : "")}>
                <button className="acc-head" onClick={() => setOpenIdx(open ? -1 : i)}>
                  <span className="acc-glyph">
                    <PlanetGlyph id={it.planet}/>
                    {it.badge && <span className="badge"><SignGlyph id={it.badge}/></span>}
                  </span>
                  <span className="acc-title">
                    {it.title}
                    <span className="acc-summary">{it.summary}</span>
                  </span>
                  <span className="acc-chev"><V2I.chev/></span>
                </button>
                <div className="acc-body">
                  <div className="acc-body-inner">
                    <div className="acc-body-pad">
                      {it.detail}
                      {it.tags && (
                        <div className="acc-tags">
                          {it.tags.map((t, j) => (
                            <span key={j} className="acc-tag">{t.icon}{t.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Conseil ---------- */
function V2Advice({ title, text }) {
  return (
    <section className="section">
      <SectionHead variant="advice" kicker="Conseil de Lyra" />
      <div className="card advice">
        <div className="advice-head">
          <span className="advice-icon"><V2I.bulb/></span>
          <h4 className="advice-title">{title}</h4>
        </div>
        <p className="advice-text">{text}</p>
      </div>
    </section>
  );
}

/* ---------- Actions ---------- */
function V2Actions({ themeName }) {
  return (
    <div className="actions">
      <div className="action-row">
        <a className="btn-ghost" href="Partage.html"><V2I.share/> Partager</a>
        <button className="btn-ghost"><V2I.star/> Thème de {themeName}</button>
      </div>
      <button className="btn-primary">Nouvelle analyse <V2I.arrowRight/></button>
    </div>
  );
}

/* =========================================================
   DATA
   ========================================================= */
const COMPAT_V2 = {
  subjectA: "Clément",
  subjectB: "Test",
  initialA: "C",
  initialB: "T",
  score: 95,
  tagline: "Un lien puissant, alliant stabilité et vivacité d'esprit",

  dimensions: [
    { id: "amour",     name: "Amour",         value: 92, icon: <V2I.heart/>,
      detail: "Vénus de Clément harmonise les besoins affectifs de Test : tendresse spontanée, gestes attentifs au quotidien." },
    { id: "conflits",  name: "Conflits",      value: 78, icon: <V2I.pulse/>,
      detail: "Mars en Bélier double : les désaccords éclatent vite, mais se résolvent aussi vite. Pas de rancune installée." },
    { id: "attirance", name: "Attirance",     value: 96, icon: <V2I.bolt/>,
      detail: "Conjonction Pluton-Pluton : magnétisme intense, fascination réciproque qui dépasse la simple alchimie physique." },
    { id: "long",      name: "Long terme",    value: 88, icon: <V2I.anchor/>,
      detail: "Jupiter en Cancer chez les deux : foyer, famille et stabilité comme socle commun pour bâtir dans la durée." },
    { id: "comm",      name: "Communication", value: 74, icon: <V2I.chat/>,
      detail: "Tension Mercure / Ascendant : façons de penser différentes. À travailler en prenant le temps de reformuler." },
  ],

  analyse: {
    headline: "Un lien puissant, alliant stabilité et vivacité d'esprit",
    summary: [
      "Clément et Test partagent une profondeur émotionnelle rare et beaucoup de points communs dans leurs valeurs, grâce à des énergies très similaires.",
      "Cependant, leurs différences dans la communication et l'ambition peuvent générer des malentendus et de la tension, exigeant un effort constant pour s'écouter.",
    ],
    longText: [
      "Leur complicité martienne et vénusienne stimule un équilibre entre passion et douceur, mais les défis liés à leur exigence mutuelle peuvent parfois les mettre en difficulté.",
      "Cette relation fonctionne comme un miroir intensifiant : chacun révèle à l'autre des facettes profondes, et l'évolution personnelle de l'un nourrit celle de l'autre. C'est une dynamique vivante, parfois inconfortable, mais profondément transformatrice.",
    ],
  },

  aspectKey: {
    planetA: "pluto", planetB: "pluto",
    name: "Pluton ☌ Pluton",
    desc: "La conjonction parfaite entre les Pluton de Clément et Test symbolise un lien aussi profond qu'exceptionnel, où chacun agit comme un miroir intensifiant les transformations intérieures de l'autre.",
  },

  forces: [
    { planet: "pluto", badge: "scorpio",
      title: "Conjonction Pluton — Pluton",
      summary: "Transformation commune, lien intense",
      detail: "La conjonction de leurs Pluton respectifs révèle une transformation commune. Clément et Test vivent une relation intense où les remises en question profondes renforcent leur union plutôt que de la fragiliser.",
      tags: [
        { icon: <V2I.sparkle/>, label: "Transformation" },
        { icon: <V2I.bolt/>, label: "Intensité" },
      ],
    },
    { planet: "mars", badge: "aries",
      title: "Mars en Bélier coordonné",
      summary: "Énergie d'action partagée",
      detail: "Leur Mars en Bélier coordonné et soutenu par l'Ascendant crée une dynamique d'action et d'initiatives partagées — un couple énergique, capable de surmonter ensemble les obstacles.",
      tags: [
        { icon: <V2I.bolt/>, label: "Initiative" },
        { icon: <V2I.heart/>, label: "Élan commun" },
      ],
    },
    { planet: "jupiter", badge: "cancer",
      title: "Jupiter en Cancer",
      summary: "Empathie et soutien émotionnel",
      detail: "L'accord entre leurs Jupiter en Cancer génère un sens commun de l'empathie et du soutien émotionnel, favorisant un climat rassurant malgré la fougue qui peut s'exprimer entre eux.",
      tags: [
        { icon: <V2I.heart/>, label: "Empathie" },
        { icon: <V2I.anchor/>, label: "Sécurité" },
      ],
    },
  ],

  vigilance: [
    { planet: "mercury", badge: "gemini",
      title: "Mercure ↔ Ascendant en tension",
      summary: "Communication parfois frustrante",
      detail: "La tension entre Mercure de Clément et l'Ascendant de Test indique que leurs façons de penser et d'exprimer leurs idées peuvent entrer en conflit, ce qui occasionne des incompréhensions parfois frustrantes.",
      tags: [
        { icon: <V2I.chat/>, label: "Reformuler" },
        { icon: <V2I.pulse/>, label: "Patience" },
      ],
    },
    { planet: "sun", badge: "capricorn",
      title: "Soleil carré Milieu du Ciel",
      summary: "Ambitions à harmoniser",
      detail: "Le Soleil de Clément en carré avec le Milieu du Ciel de Test traduit des défis dans la gestion des ambitions et projets personnels, rendant difficile l'harmonisation de leurs objectifs professionnels et de vie.",
      tags: [
        { icon: <V2I.anchor/>, label: "Aligner les caps" },
      ],
    },
  ],

  advice: {
    title: "Cultivez la patience en communication",
    text: "Clément et Test doivent cultiver la patience en communication, en étant attentifs aux façons très différentes dont ils expriment leurs idées et émotions. Apprendre à ralentir les débats pour vraiment écouter sans juger améliorera considérablement leur harmonie.",
  },
};

/* ===== Tweaks defaults ===== */
const COMPAT_V2_DEFAULTS = /*EDITMODE-BEGIN*/{
  "barStyle": "varied",
  "showStarfield": true,
  "showOrbit": true
}/*EDITMODE-END*/;

function V2Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Barres de compatibilité">
        <TweakRadio label="Couleurs"
          value={t.barStyle} onChange={(v) => setTweak("barStyle", v)}
          options={[
            { value: "varied",  label: "Variées" },
            { value: "unified", label: "Violet" },
          ]} />
      </TweakSection>
      <TweakSection title="Ambiance">
        <TweakToggle label="Étoiles" value={t.showStarfield} onChange={(v) => setTweak("showStarfield", v)} />
        <TweakToggle label="Orbite autour du score" value={t.showOrbit} onChange={(v) => setTweak("showOrbit", v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

/* ===== Page ===== */
function CompatibilityPageV2() {
  const [t, setTweak] = useTweaks(COMPAT_V2_DEFAULTS);
  return (
    <div className="stage">
      <div className="phone">
        {t.showStarfield && <V2Starfield count={42}/>}
        <div className="scroll stagger">
          <header className="topbar">
            <a className="icon-btn" href="Theme Astral v2.html" aria-label="Retour"><V2I.back/></a>
            <div className="topbar-title">Compatibilité</div>
            <button className="icon-btn" aria-label="Options"><V2I.more/></button>
          </header>

          <V2Hero
            scoreTarget={COMPAT_V2.score}
            tagline={COMPAT_V2.tagline}
            nameA={COMPAT_V2.initialA}
            nameB={COMPAT_V2.initialB}
            subjectA={COMPAT_V2.subjectA}
            subjectB={COMPAT_V2.subjectB}
            showOrbit={t.showOrbit}
          />

          <V2Dimensions data={COMPAT_V2.dimensions} unified={t.barStyle === "unified"} />

          <V2Analyse
            headline={COMPAT_V2.analyse.headline}
            summary={COMPAT_V2.analyse.summary}
            longText={COMPAT_V2.analyse.longText}
            aspectKey={COMPAT_V2.aspectKey}
          />

          <V2Aspects variant="strength" kicker="Forces de la relation" items={COMPAT_V2.forces} />
          <V2Aspects variant="watch"    kicker="Points de vigilance"   items={COMPAT_V2.vigilance} />

          <V2Advice title={COMPAT_V2.advice.title} text={COMPAT_V2.advice.text} />

          <V2Actions themeName={COMPAT_V2.subjectB} />
        </div>
      </div>
      <V2Tweaks t={t} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CompatibilityPageV2 />);
