/* ============================================================
   Miroir Temporel — Variante A · Décennies + années
   Prototype web (référence pour intégration React Native)

   Écran "Miroir" sous l'onglet "Voyage temporel".
   Sélecteur d'âge à 2 niveaux (décennies → années)
   + chapitres en cards individuelles.
   ============================================================ */

const { useState, useRef, useEffect, useCallback } = React;

/* ---------- shared content (verbatim from screenshot, chunked) ---------- */

const BIRTH_YEAR = 1993; // displayed age 31 → year 2024

/* The 4 thematic chapters of the age-31 reading.
   Same words as the screenshots; only structured. */
const CHAPTERS = [
  {
    theme: "Énergie dominante",
    glyph: "☽",
    accent: "var(--gold)",
    text:
      "Tu te retrouves face à une fragilité émotionnelle qui ne peut plus être ignorée. Ce que tu as toujours protégé dans ta sensibilité profonde, cette part de toi qui ressent intensément et aspire à être tenue avec douceur, s’expose à une remise en question douloureuse. Cette fois, tu ne peux pas garder derrière un voile de rêve ou de nostalgie ce qui t’émeut au plus vif.",
  },
  {
    theme: "Tension intérieure",
    glyph: "♄",
    accent: "var(--violet)",
    text:
      "Tu oscilles entre le besoin de structurer ta vie et d’imposer des limites claires, et la peur viscérale de perdre ce fragile équilibre émotionnel. Tu ressens que poser des barrières te fait trahir ta nature empathique, pourtant sans elles tu sombrerais dans la confusion et le flottement. Ce conflit intérieur t’oblige à te confronter à tes vulnérabilités sans pouvoir les fuir, à l’opposé d’une tendance à te réfugier dans un monde intérieur à l’abri.",
  },
  {
    theme: "Au quotidien",
    glyph: "♀",
    accent: "var(--pink)",
    text:
      "Dans ton quotidien, cela peut se traduire par une relation amoureuse ou amicale qui te bouleverse profondément, où la question du contrôle ou de la perte s’impose brutalement. Les choix professionnels ou personnels deviennent lourds de sens, chargés d’une responsabilité nouvelle. Tu sens combien tes décisions affectent non seulement ta stabilité, mais aussi la manière dont tu t’autorises à t’aimer et à te laisser aimer.",
  },
  {
    theme: "L’empreinte",
    glyph: "♇",
    accent: "var(--blue)",
    text:
      "Cette année a ouvert une brèche dans ta manière d’habiter tes émotions, inscrivant une exigence nouvelle : celle de ne plus fuir l’ombre sous-jacente à ta douceur. Cette transformation modifie durablement ta relation à toi-même et au monde affectif.",
  },
];

/* Life milestones — astro-meaningful turning points (Saturn return, etc.) */
const MILESTONES = [
  { age: 0,  label: "Naissance", glyph: "✦" },
  { age: 7,  label: "Enfance",   glyph: "☉" },
  { age: 14, label: "Adolescence", glyph: "☿" },
  { age: 18, label: "Émancipation", glyph: "♂" },
  { age: 21, label: "Quête",     glyph: "♃" },
  { age: 25, label: "Premiers choix", glyph: "♀" },
  { age: 29, label: "Retour de Saturne", glyph: "♄" },
  { age: 35, label: "Conscience", glyph: "♇" },
  { age: 42, label: "Mi-parcours", glyph: "♅" },
  { age: 50, label: "Maturité",   glyph: "☉" },
  { age: 58, label: "2e retour de Saturne", glyph: "♄" },
  { age: 70, label: "Récolte",   glyph: "♃" },
];

/* ===========================================================
   Shared chrome (header + tabs + bottom bar)
   =========================================================== */

function AppHeader() {
  return (
    <div className="mt-app-head">
      <div className="mt-brand">
        <span className="mt-brand-spark">✦</span>
        Lunestia
      </div>
      <div className="mt-app-head-spacer" />
      <div className="mt-greet">Bonjour, Clément</div>
      <div className="mt-avatar" />
    </div>
  );
}

function TopTabs({ active = "miroir" }) {
  const tabs = [
    {
      id: "transits",
      label: "Transits",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2"/></svg>
      ),
    },
    {
      id: "calendrier",
      label: "Calendrier",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
      ),
    },
    {
      id: "miroir",
      label: "Miroir",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
      ),
    },
  ];
  return (
    <div className="mt-tabs">
      <div className="mt-tab-group">
        {tabs.map(t => (
          <button key={t.id} className={"mt-tab" + (active === t.id ? " is-active" : "")}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <button className="mt-help" aria-label="Aide">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
    </div>
  );
}

function BottomBar() {
  const Icon = {
    sun: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9.3 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.3 9 9 12 2"/></svg>
    ),
    heart: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
    ),
    chat: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    ),
    bolt: (
      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 14 2"/></svg>
    ),
  };
  return (
    <div className="mt-tabbar">
      <button className="mt-tabbar-btn" aria-label="Thème">{Icon.sun}</button>
      <button className="mt-tabbar-btn" aria-label="Favoris">{Icon.star}</button>
      <button className="mt-tabbar-btn" aria-label="Compatibilité">{Icon.heart}</button>
      <button className="mt-tabbar-btn" aria-label="Chat">{Icon.chat}</button>
      <button className="mt-tabbar-btn is-active" aria-label="Voyage temporel">{Icon.bolt}</button>
    </div>
  );
}

function ChapterFeedback() {
  return (
    <div className="mt-feedback">
      <span>Cette lecture résonne-t-elle ?</span>
      <div className="mt-feedback-btns">
        <button aria-label="J'aime">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 22V10M2 13v7a2 2 0 0 0 2 2h13.34a2 2 0 0 0 1.98-1.7l1.36-9A2 2 0 0 0 18.7 9H14V5a3 3 0 0 0-3-3l-4 8"/>
          </svg>
        </button>
        <button aria-label="Je n'aime pas">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 2v12M22 11V4a2 2 0 0 0-2-2H6.66a2 2 0 0 0-1.98 1.7l-1.36 9A2 2 0 0 0 5.3 15H10v4a3 3 0 0 0 3 3l4-8"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function PinCta() {
  return (
    <button className="mt-pin-cta">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 17v5"/>
        <path d="M9 10.76V6h6v4.76l3 5.24H6l3-5.24Z"/>
      </svg>
      ÉPINGLER CE SOUVENIR
    </button>
  );
}

function TitleBlock() {
  return (
    <>
      <h1 className="mt-title">Voyage<br/>temporel</h1>
      <p className="mt-sub">Explorez vos transits planétaires à n'importe quel âge de votre vie.</p>
    </>
  );

/* ===========================================================
   VARIANT A — Décennies + années
   Two-row picker:
     - decade pills (00s / 10s / 20s / …) for coarse navigation
     - year grid for fine selection (10 cells wide)
   Body: chapter cards (1 paragraph per card, theme + glyph)
   =========================================================== */

function VariantA() {
  const [age, setAge] = useState(31);
  const decade = Math.floor(age / 10) * 10;
  const decades = [0, 10, 20, 30, 40, 50, 60, 70, 80];
  const milestoneAges = new Set(MILESTONES.map(m => m.age));

  return (
    <div className="mt-screen">
      <AppHeader />
      <TitleBlock />
      <TopTabs active="miroir" />

      <div className="mtA-picker-card">
        <div className="mt-context">
          <span className="mt-context-age">{age}</span>
          <span className="mt-context-age-suffix">ans</span>
          <span className="mt-context-year">{BIRTH_YEAR + age}</span>
        </div>

        <div className="mtA-decades">
          {decades.map(d => (
            <button
              key={d}
              className={"mtA-decade" + (decade === d ? " is-active" : "")}
              onClick={() => setAge(d === decade ? age : d)}
            >
              {d}–{d + 9}
            </button>
          ))}
        </div>

        <div className="mtA-years">
          {Array.from({ length: 10 }, (_, i) => decade + i).map(y => (
            <button
              key={y}
              className={
                "mtA-year" +
                (age === y ? " is-active" : "") +
                (milestoneAges.has(y) ? " is-milestone" : "")
              }
              onClick={() => setAge(y)}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Chapter cards */}
      <div className="mtA-chapters">
        {CHAPTERS.map((c, i) => (
          <article
            key={i}
            className={"mtA-chapter" + (i === 0 ? " mtA-chapter--first" : "")}
            style={{ "--chap-accent": c.accent }}
          >
            <header className="mtA-chapter-head">
              <span className="mtA-chap-glyph">{c.glyph}</span>
              <span className="mtA-chap-theme">{c.theme}</span>
              <span className="mtA-chap-step">{String(i + 1).padStart(2, "0")} / 04</span>
            </header>
            <p className="mtA-chap-text">
              {i === 0 ? (
                <>
                  <span className="mtA-dropcap">{c.text.charAt(0)}</span>
                  {c.text.slice(1)}
                </>
              ) : c.text}
            </p>
          </article>
        ))}
      </div>

      <PinCta />
      <ChapterFeedback />

      <BottomBar />
    </div>
  );
}
