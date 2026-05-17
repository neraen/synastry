/* ============================================================
   Lunestia — Onboarding screens
   4 screens with shared icon set. Exposes to window.
   ============================================================ */

const { useState, useEffect, useRef } = React;

/* ---------- Icons ---------- */
const OBIcon = {
  shield: (p) => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2.5l8 3.2v6.5c0 4.7-3.4 8.6-8 9.3-4.6-.7-8-4.6-8-9.3V5.7l8-3.2z"/>
      <path d="M9 12.3l2.2 2.2L15.5 10.2"/>
    </svg>
  ),
  question: (p) => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9.5"/>
      <path d="M9.3 9a3 3 0 0 1 5.7 1c0 2-3 2-3 4"/>
      <circle cx="12" cy="17" r="0.7" fill="currentColor"/>
    </svg>
  ),
  sparkle4: (p) => (
    <svg width="58" height="58" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 1.5l1.7 7.3c.2.7.7 1.3 1.4 1.5L22.5 12l-7.4 1.7c-.7.2-1.2.8-1.4 1.5L12 22.5l-1.7-7.3c-.2-.7-.7-1.3-1.4-1.5L1.5 12l7.4-1.7c.7-.2 1.2-.8 1.4-1.5L12 1.5z"/>
    </svg>
  ),
  check: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  arrowLeft: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  arrowRight: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  mail: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <polyline points="3 7 12 13 21 7"/>
    </svg>
  ),
  user: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  cake: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <path d="M3 15h18M8 11V8m4 3V8m4 3V8"/>
    </svg>
  ),
  clock: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  pin: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  calendar: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  ),
  search: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7"/>
      <line x1="20" y1="20" x2="16.65" y2="16.65"/>
    </svg>
  ),
  question20: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.3 9a3 3 0 0 1 5.7 1c0 2-3 2-3 4"/>
      <circle cx="12" cy="17" r="0.7" fill="currentColor"/>
    </svg>
  ),
  /* Feature icons */
  chart: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="4.5"/>
      <line x1="3"  y1="12" x2="21" y2="12"/>
      <line x1="12" y1="3"  x2="12" y2="21"/>
    </svg>
  ),
  heart: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  orbit: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  mirror: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2 L18 12 L12 22 L6 12 Z"/>
      <line x1="6" y1="12" x2="18" y2="12" strokeDasharray="2 2"/>
    </svg>
  ),
  moon: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z"/>
    </svg>
  ),
  diamond: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)"/>
    </svg>
  ),
  spark: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 3l1.2 5.3L18.5 9.5l-5.3 1.2L12 16l-1.2-5.3L5.5 9.5l5.3-1.2z"/>
    </svg>
  ),
};

/* ============================================================
   Screen 1 — Privacy / Avant de commencer
   ============================================================ */
function ScreenPrivacy({ onContinue }) {
  const [terms, setTerms] = useState(false);
  const [ai, setAi]       = useState(false);
  const ready = terms && ai;

  const dataPoints = [
    { icon: <OBIcon.mail />, title: "Ton adresse e-mail",
      desc: "Collectée via Google ou Apple pour identifier ton compte." },
    { icon: <OBIcon.user />, title: "Ton prénom",
      desc: "Optionnel — utilisé uniquement pour personnaliser les messages de Lyra." },
    { icon: <OBIcon.cake />, title: "Tes données de naissance",
      desc: "Date, heure et lieu — pour calculer ton thème natal." },
  ];

  return (
    <div className="screen-body stagger">
      <div className="hero-medallion">
        <OBIcon.shield />
      </div>

      <div className="center">
        <span className="chip">Confidentialité</span>
      </div>

      <h1 className="h1 center">Avant de commencer</h1>
      <p className="lead center">
        Lunestia a besoin de quelques données personnelles pour fonctionner.
        Voici exactement ce que nous collectons.
      </p>

      <div className="card">
        <p className="list-title">Ce que nous collectons</p>
        <ul className="data-list">
          {dataPoints.map((d, i) => (
            <li key={i}>
              <div className="data-icon">{d.icon}</div>
              <div className="data-body">
                <strong>{d.title}</strong>
                <span>{d.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="consents">
        <div className="consent" data-checked={terms}
             onClick={() => setTerms(v => !v)} role="checkbox" aria-checked={terms} tabIndex={0}>
          <div className="checkbox"><OBIcon.check /></div>
          <div className="consent-text">
            J'accepte les conditions d'utilisation et la <a onClick={e=>e.stopPropagation()}>politique de confidentialité</a>.
          </div>
        </div>
        <div className="consent" data-checked={ai}
             onClick={() => setAi(v => !v)} role="checkbox" aria-checked={ai} tabIndex={0}>
          <div className="checkbox"><OBIcon.check /></div>
          <div className="consent-text">
            J'accepte que mes données de naissance soient transmises à OpenAI uniquement
            pour générer mes analyses astrologiques personnalisées.
          </div>
        </div>
      </div>

      <div className="cta">
        <button className="btn btn-primary" disabled={!ready} onClick={onContinue}>
          Continuer
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Screen 2 — Guide intégré
   ============================================================ */
function ScreenGuide({ onContinue }) {
  const [open, setOpen] = useState(null);
  const features = [
    { id: "natal",  name: "Thème natal",
      icon: <OBIcon.chart />,
      desc: "Ta carte du ciel à la minute près. Planètes, signes, maisons et aspects, le tout interactif." },
    { id: "compa",  name: "Compatibilité",
      icon: <OBIcon.heart />,
      desc: "La synastrie : comment deux thèmes dialoguent. Forces, tensions et clés de relation." },
    { id: "trans",  name: "Transits",
      icon: <OBIcon.orbit />,
      desc: "Ce que le ciel actuel active dans ton thème. Périodes-clés, fenêtres d'action." },
    { id: "mirror", name: "Miroir temporel",
      icon: <OBIcon.mirror />,
      desc: "Une lecture comparée : passé · présent · futur, pour suivre ton évolution." },
  ];

  return (
    <div className="screen-body stagger">
      <div className="hero-medallion">
        <OBIcon.question />
      </div>

      <div style={{ marginTop: 6 }}>
        {features.map(f => (
          <div key={f.id} className={"feature-row" + (open === f.id ? " open" : "")}
               onClick={() => setOpen(open === f.id ? null : f.id)} role="button" tabIndex={0}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-name">{f.name}</div>
                <div className="feature-help"><OBIcon.question20 /></div>
              </div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, textAlign: "center" }}>
        <span className="chip">Guide intégré</span>
        <h1 className="h1 center" style={{ fontSize: 34, marginTop: 12 }}>L'aide est partout</h1>
        <p className="lead center">
          Sur chaque page, un bouton <b style={{color:"var(--gold)"}}>?</b> te donne des explications
          sur ce que tu vois — symboles, scores, aspects, tout est décrypté.
        </p>
      </div>

      <div className="cta">
        <button className="btn btn-primary" onClick={onContinue}>Compris !</button>
      </div>
    </div>
  );
}

/* ============================================================
   Screen 3 — Form / Ton thème natal
   ============================================================ */
function ScreenForm({ onContinue, onSkip }) {
  const [name, setName]   = useState("");
  const [date, setDate]   = useState("");
  const [time, setTime]   = useState("");
  const [place, setPlace] = useState("");
  const ready = date.trim().length > 0;

  return (
    <div className="screen-body stagger">
      <div>
        <span className="chip" style={{ marginBottom: 14, display: "inline-flex" }}>Étape 3 / 4</span>
        <h1 className="h1" style={{ marginBottom: 8 }}>Ton thème natal</h1>
        <p className="lead" style={{ marginLeft: 0, marginRight: 0, maxWidth: "none" }}>
          Ces données permettent de calculer tes transits personnels et ton thème natal précis.
        </p>
      </div>

      <div className="card" style={{ marginTop: 4 }}>
        <div className="form-field">
          <label className="form-label">Prénom</label>
          <div className="form-input-wrap">
            <input type="text" placeholder="Votre prénom" value={name}
              onChange={e => setName(e.target.value)} />
            <span className="form-input-icon"><OBIcon.user /></span>
          </div>
          <span className="form-hint">Optionnel — utilisé dans les analyses</span>
        </div>

        <div className="form-field">
          <label className="form-label">Date de naissance</label>
          <div className="form-input-wrap">
            <input type="date" placeholder="Sélectionner une date" value={date}
              onChange={e => setDate(e.target.value)} />
            <span className="form-input-icon"><OBIcon.calendar /></span>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Heure de naissance</label>
          <div className="form-input-wrap">
            <input type="time" placeholder="Sélectionner l'heure" value={time}
              onChange={e => setTime(e.target.value)} />
            <span className="form-input-icon"><OBIcon.clock /></span>
          </div>
          <span className="form-hint">Optionnel — plus précis si connu</span>
        </div>

        <div className="form-field">
          <label className="form-label">Lieu de naissance</label>
          <div className="form-input-wrap">
            <input type="text" placeholder="Rechercher une ville…" value={place}
              onChange={e => setPlace(e.target.value)} />
            <span className="form-input-icon"><OBIcon.search /></span>
          </div>
        </div>
      </div>

      <div className="cta">
        <button className="btn btn-primary" disabled={!ready} onClick={onContinue}>
          Continuer
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>Passer pour l'instant</button>
      </div>
    </div>
  );
}

/* ============================================================
   Screen 4 — Done / Tout est prêt
   ============================================================ */
function ScreenDone({ onFinish, active }) {
  const burstRef = useRef(null);

  // Sparkle burst on enter
  useEffect(() => {
    if (!active || !burstRef.current) return;
    const host = burstRef.current;
    // clear any old
    host.innerHTML = "";
    const N = 14;
    for (let i = 0; i < N; i++) {
      const el = document.createElement("div");
      el.className = "sparkle burst";
      const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
      const dist  = 90 + Math.random() * 70;
      el.style.left = "50%";
      el.style.top  = "50%";
      el.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      el.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
      el.style.animationDelay = (Math.random() * 0.3) + "s";
      host.appendChild(el);
    }
  }, [active]);

  const feats = [
    { name: "Horoscope quotidien",  icon: <OBIcon.moon /> },
    { name: "Analyse de synastrie", icon: <OBIcon.diamond /> },
    { name: "Miroir temporel",      icon: <OBIcon.mirror /> },
    { name: "Lyra, astrologue IA",  icon: <OBIcon.spark /> },
  ];

  return (
    <div className="screen-body stagger" style={{ justifyContent: "center" }}>
      <div className="finale-medallion">
        <div className="ring r3" />
        <div className="ring r2" />
        <div className="ring" />
        <div className="core">
          <OBIcon.sparkle4 />
        </div>
        <div ref={burstRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      </div>

      <h1 className="h1 center" style={{ marginTop: 0 }}>Tout est prêt</h1>
      <p className="lead center">
        Ton thème natal est enregistré. Toutes les fonctionnalités sont débloquées.
      </p>

      <div className="feature-grid">
        {feats.map((f, i) => (
          <div key={i} className="feat-card">
            <div className="icon">{f.icon}</div>
            <div className="name">{f.name}</div>
          </div>
        ))}
      </div>

      <div className="cta">
        <button className="btn btn-primary" onClick={onFinish}>
          Entrer dans Lunestia <OBIcon.arrowRight />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenPrivacy, ScreenGuide, ScreenForm, ScreenDone, OBIcon,
});
