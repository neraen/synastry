/**
 * Lunestia — MiroirTemporelScreen
 *
 * Écran complet du Miroir temporel (variant A).
 * Composé de :
 *   • <DecadeYearPicker /> (composant isolé)
 *   • <ChapterCardList />  (composant isolé)
 *   • header / tabs / pin CTA / feedback / bottom bar (chrome d'app)
 *
 * Branchement live :
 *   - état d'âge local (par défaut 31)
 *   - le contenu des chapitres est ici un mock figé ; côté RN,
 *     remplacer `MOCK_CHAPTERS_BY_AGE` par un appel API ou un selector.
 */

const { useState } = React;

const BIRTH_YEAR = 1993; // → âge 31 = 2024

const MOCK_CHAPTERS = [
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

/* ---------- chrome bits (kept here as they're screen-level, not reusable) ---------- */

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

function TopTabs({ active = "miroir", onChange }) {
  const tabs = [
    { id: "transits",   label: "Transits",   icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2"/></svg>) },
    { id: "calendrier", label: "Calendrier", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>) },
    { id: "miroir",     label: "Miroir",     icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>) },
  ];
  return (
    <div className="mt-tabs">
      <div className="mt-tab-group">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"mt-tab" + (active === t.id ? " is-active" : "")}
            onClick={() => onChange && onChange(t.id)}
          >
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

function Feedback() {
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

function BottomBar() {
  const I = {
    sun:   (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>),
    star:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9.3 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.3 9 9 12 2"/></svg>),
    heart: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>),
    chat:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>),
    bolt:  (<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 14 2"/></svg>),
  };
  return (
    <div className="mt-tabbar">
      <button className="mt-tabbar-btn" aria-label="Thème">{I.sun}</button>
      <button className="mt-tabbar-btn" aria-label="Favoris">{I.star}</button>
      <button className="mt-tabbar-btn" aria-label="Compatibilité">{I.heart}</button>
      <button className="mt-tabbar-btn" aria-label="Chat">{I.chat}</button>
      <button className="mt-tabbar-btn is-active" aria-label="Voyage temporel">{I.bolt}</button>
    </div>
  );
}

/* ---------- screen ---------- */

function MiroirTemporelScreen() {
  const [age, setAge] = useState(31);
  // In RN, this would come from an API selector keyed by age.
  // Here we always render the mock dataset.
  const chapters = MOCK_CHAPTERS;

  return (
    <div className="mt-screen">
      <AppHeader />

      <h1 className="mt-title">Voyage<br/>temporel</h1>
      <p className="mt-sub">Explorez vos transits planétaires à n'importe quel âge de votre vie.</p>

      <TopTabs active="miroir" />

      <DecadeYearPicker
        value={age}
        onChange={setAge}
        min={0}
        max={89}
        birthYear={BIRTH_YEAR}
      />

      <ChapterCardList chapters={chapters} />

      <PinCta />
      <Feedback />

      <BottomBar />
    </div>
  );
}

/* ---------- mount inside phone shell ---------- */

function App() {
  return (
    <div className="phone">
      <div className="phone-notch" />
      <MiroirTemporelScreen />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
