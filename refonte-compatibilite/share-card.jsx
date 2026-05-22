/* =========================================================
   Lunestia — Share Card component
   Exposes ShareCard, ShareCardPage on window
   Requires: PG (planet glyphs) — optional
   ========================================================= */

const { useState: sUseState, useEffect: sUseEffect, useMemo: sUseMemo, useRef: sUseRef } = React;

/* ---------- Icons ---------- */
const SI = {
  back: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>),
  story: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="3" width="8" height="18" rx="2"/></svg>),
  square: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>),
  portrait: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="3" width="12" height="18" rx="2"/></svg>),
  ig: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>),
  x: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>),
  fb: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.563 9.876v-6.987H7.898V12h2.539V9.797c0-2.506 1.492-3.89 3.776-3.89 1.094 0 2.238.196 2.238.196v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.986A10.002 10.002 0 0 0 22 12"/></svg>),
  tt: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.16a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.59z"/></svg>),
  wa: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"/></svg>),
  link: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>),
  download: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>),
  more: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/></svg>),
  check: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  share: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>),
  constellation: () => (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="0.8">
      <circle cx="20" cy="22" r="1.6" fill="currentColor"/>
      <circle cx="50" cy="14" r="1.2" fill="currentColor"/>
      <circle cx="78" cy="30" r="2" fill="currentColor"/>
      <circle cx="98" cy="60" r="1.4" fill="currentColor"/>
      <circle cx="60" cy="62" r="1.8" fill="currentColor"/>
      <circle cx="32" cy="76" r="1.2" fill="currentColor"/>
      <circle cx="84" cy="92" r="1.6" fill="currentColor"/>
      <line x1="20" y1="22" x2="50" y2="14" opacity="0.5"/>
      <line x1="50" y1="14" x2="78" y2="30" opacity="0.5"/>
      <line x1="78" y1="30" x2="98" y2="60" opacity="0.5"/>
      <line x1="78" y1="30" x2="60" y2="62" opacity="0.5"/>
      <line x1="60" y1="62" x2="32" y2="76" opacity="0.5"/>
      <line x1="60" y1="62" x2="84" y2="92" opacity="0.5"/>
    </svg>
  ),
};

/* ---------- Inline stars inside card ---------- */
function CardStars({ count = 18 }) {
  const stars = sUseMemo(() => Array.from({ length: count }).map(() => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: 1 + Math.random() * 1.4,
    peak: 0.3 + Math.random() * 0.5,
    delay: Math.random() * 4,
    dur: 3.5 + Math.random() * 3,
  })), [count]);
  return (
    <div className="sc-stars" aria-hidden="true">
      {stars.map((s, i) => (
        <span key={i} className="star" style={{
          left: s.x + "%", top: s.y + "%",
          width: s.size, height: s.size,
          ["--peak"]: s.peak,
          animationDelay: s.delay + "s",
          animationDuration: s.dur + "s",
        }}/>
      ))}
    </div>
  );
}

/* ---------- Share Card ---------- */
function ShareCard({ format = "story", data }) {
  const d = data;
  const ringSize = format === "story" ? 180 : 130;
  const stroke = format === "story" ? 10 : 8;
  const r = (ringSize - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dashOffset = C - (d.score / 100) * C;

  return (
    <div className={"share-card " + format}>
      <CardStars count={format === "story" ? 22 : 14}/>
      <div className="sc-constellation"><SI.constellation/></div>
      <div className="sc-constellation-2"><SI.constellation/></div>

      <div className="sc-brand">
        <span className="sc-brand-name">Lunestia</span>
        <span>★ Synastrie</span>
      </div>

      <div className="sc-names">
        <div className="sc-names-row">Compatibilité</div>
        <div className="sc-pair">
          {d.subjectA} <span className="amp">&</span> {d.subjectB}
        </div>
      </div>

      <div className="sc-score-wrap">
        <div className="sc-score-ring">
          <svg viewBox={`0 0 ${ringSize} ${ringSize}`}>
            <defs>
              <linearGradient id={"shareGrad-" + format} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F0D585"/>
                <stop offset="50%" stopColor="#E5C266"/>
                <stop offset="100%" stopColor="#9B5CFF"/>
              </linearGradient>
            </defs>
            <circle className="sc-track" cx={ringSize/2} cy={ringSize/2} r={r}
              fill="none" strokeWidth={stroke}/>
            <circle className="sc-progress" cx={ringSize/2} cy={ringSize/2} r={r}
              fill="none" strokeWidth={stroke}
              stroke={`url(#shareGrad-${format})`}
              strokeDasharray={C}
              strokeDashoffset={dashOffset}/>
          </svg>
          <div className="sc-score-num">
            <div className="sc-score-value">{d.score}<span className="pct">%</span></div>
            <div className="sc-score-label">Compatibilité</div>
          </div>
        </div>
      </div>

      <p className="sc-tagline">« {d.tagline} »</p>

      <div className="sc-dims">
        {d.dimensions.slice(0, format === "square" ? 3 : 5).map((dim) => (
          <div key={dim.id} className={"sc-dim " + dim.id}>
            <span className="sc-dim-label">{dim.name}</span>
            <span className="sc-dim-bar">
              <span className="sc-dim-fill" style={{ width: dim.value + "%" }}/>
            </span>
            <span className="sc-dim-val">{dim.value}</span>
          </div>
        ))}
      </div>

      <div className="sc-footer">
        <span className="sc-footer-left">lunestia.app</span>
        <span className="sc-footer-right">Découvre ta synastrie</span>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
function ShareCardPage({ data }) {
  const [format, setFormat] = sUseState("story");
  const [toast, setToast] = sUseState(null);

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => setToast(null), 2000);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Compatibilité ${data.subjectA} & ${data.subjectB} : ${data.score}% sur Lunestia ✨`);
      flash("Lien copié");
    } catch { flash("Impossible de copier"); }
  };

  const onNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lunestia — ${data.subjectA} & ${data.subjectB}`,
          text: `Notre compatibilité : ${data.score}% — ${data.tagline}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      flash("Partage non supporté");
    }
  };

  const onSocial = (name) => flash(`Préparation pour ${name}…`);
  const onSave = () => flash("Image enregistrée");

  return (
    <div className="share-stage">
      <div className="share-phone">
        <Starfield count={36}/>
        <div className="share-scroll stagger">
          <header className="topbar">
            <a className="icon-btn" href="Compatibilite.html" aria-label="Retour"><SI.back/></a>
            <div className="topbar-title">Partager</div>
            <button className="icon-btn" onClick={onNativeShare} aria-label="Partage système"><SI.share/></button>
          </header>

          <p className="share-subtitle">Choisis un format, prévisualise, et publie ta carte.</p>

          <div className="format-tabs">
            <button className={"format-tab " + (format === "story" ? "active" : "")} onClick={() => setFormat("story")}>
              <SI.story/> Story
            </button>
            <button className={"format-tab " + (format === "portrait" ? "active" : "")} onClick={() => setFormat("portrait")}>
              <SI.portrait/> Post
            </button>
            <button className={"format-tab " + (format === "square" ? "active" : "")} onClick={() => setFormat("square")}>
              <SI.square/> Carré
            </button>
          </div>

          <div className="preview-stage">
            <div className="preview-wrap">
              <ShareCard format={format} data={data}/>
            </div>
          </div>

          <div className="share-section-head">
            <span className="kicker">Publier sur</span>
            <span className="rule"/>
          </div>

          <div className="share-actions">
            <div className="share-row">
              <button className="share-chip ig" onClick={() => onSocial("Instagram")}>
                <span className="chip-icon"><SI.ig/></span>Instagram
              </button>
              <button className="share-chip tt" onClick={() => onSocial("TikTok")}>
                <span className="chip-icon"><SI.tt/></span>TikTok
              </button>
              <button className="share-chip x" onClick={() => onSocial("X")}>
                <span className="chip-icon"><SI.x/></span>X
              </button>
              <button className="share-chip wa" onClick={() => onSocial("WhatsApp")}>
                <span className="chip-icon"><SI.wa/></span>WhatsApp
              </button>
            </div>
            <div className="share-row">
              <button className="share-chip fb" onClick={() => onSocial("Facebook")}>
                <span className="chip-icon"><SI.fb/></span>Facebook
              </button>
              <button className="share-chip save" onClick={onSave}>
                <span className="chip-icon"><SI.download/></span>Enregistrer
              </button>
              <button className="share-chip link" onClick={onCopy}>
                <span className="chip-icon"><SI.link/></span>Copier
              </button>
              <button className="share-chip more" onClick={onNativeShare}>
                <span className="chip-icon"><SI.more/></span>Plus
              </button>
            </div>
          </div>

          <button className="share-cta" onClick={onNativeShare}>
            <SI.share/> Partager maintenant
          </button>
        </div>
      </div>

      <div className={"share-toast " + (toast ? "show" : "")}>
        <SI.check/> {toast || ""}
      </div>
    </div>
  );
}

Object.assign(window, { ShareCard, ShareCardPage, SI });
