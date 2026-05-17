/* ============================================================
   astral-hero.jsx — <AstralHero />
   Reusable hero block: avatar in diamond frame, with key
   astrological stats laid out left and right.

   Required globals (load before this file):
     - React 18
     - data.jsx          (PLANETS, SIGNS, ASC_LON, BIRTH,
                          ELEMENT_COLOR, lonToSign)
     - astro-glyphs.jsx  (SignGlyph, PlanetGlyph, PG)

   Required CSS classes in the host page:
     .hero, .stats-col, .stats-col.left, .stats-col.right,
     .stat, .stat-label-row, .stat-label, .stat-value,
     .stat-value.dual, .avatar-frame, .avatar-glow, .avatar-img,
     .twinkle-dot
   ============================================================ */

(function () {

  /* -------- Small lucide-style label icons -------- */
  const LI = {
    sun:   () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>),
    moon:  () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z"/></svg>),
    asc:   () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><polyline points="13 4 20 4 20 11"/></svg>),
    heart: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>),
    flame: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C12 6 7 8 7 13a5 5 0 0 0 10 0c0-2.5-1.5-4-3-5.5C13 6.5 12 4 12 2z"/></svg>),
    leaf:  () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>),
    wind:  () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2M12.59 19.41A2 2 0 1 0 14 16H2M17.73 6.27A2.5 2.5 0 1 1 19.5 11H2"/></svg>),
    drop:  () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>),
    venus: () => PG.venus(),
    mars:  () => PG.mars(),
    crown: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4 6 5-9 5 9 4-6v11H3z"/></svg>),
  };

  const ELEMENT_ICON = {
    "Feu": LI.flame, "Terre": LI.leaf, "Air": LI.wind, "Eau": LI.drop,
  };

  /* -------- StatItem helpers -------- */
  function StatItem({ icon: IconComp, label, children }) {
    return (
      <div className="stat">
        <span className="stat-label-row">
          <IconComp />
          <span className="stat-label">{label}</span>
        </span>
        <div className="stat-value">{children}</div>
      </div>
    );
  }
  function StatItemDual({ icon: IconComp, label, children }) {
    return (
      <div className="stat">
        <span className="stat-label-row">
          <IconComp />
          <span className="stat-label">{label}</span>
        </span>
        <div className="stat-value dual">{children}</div>
      </div>
    );
  }

  /**
   * <AstralHero avatarSrc="assets/avatar-lion.png" />
   *
   * Props:
   *   avatarSrc — path to avatar PNG (default: "assets/avatar-lion.png")
   *   avatarAlt — alt text                (default: "Avatar astrologique")
   */
  function AstralHero({ avatarSrc = "assets/avatar-lion.png", avatarAlt = "Avatar astrologique" }) {
    const sun   = PLANETS.find(p => p.id === "sun");
    const moon  = PLANETS.find(p => p.id === "moon");
    const venus = PLANETS.find(p => p.id === "venus");
    const mars  = PLANETS.find(p => p.id === "mars");

    const sunSign   = lonToSign(sun.lon).sign;
    const moonSign  = lonToSign(moon.lon).sign;
    const venusSign = lonToSign(venus.lon).sign;
    const marsSign  = lonToSign(mars.lon).sign;
    const ascSign   = lonToSign(ASC_LON).sign;

    // Dominant element across all planets
    const elementCount = { Feu: 0, Terre: 0, Air: 0, Eau: 0 };
    PLANETS.forEach(p => { elementCount[lonToSign(p.lon).sign.element]++; });
    const dominantElement = Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0][0];

    // Master = ruler of the ascendant sign
    const masterName   = ascSign.ruler;
    const masterPlanet = PLANETS.find(p => p.name === masterName) || PLANETS[0];

    // Affinity = same element as Sun, excluding Sun's own sign
    const affinitySigns = SIGNS.filter(s => s.element === sunSign.element && s.id !== sunSign.id).slice(0, 2);

    return (
      <div className="hero">
        <div className="stats-col left">
          <StatItem icon={LI.sun}  label="Soleil">
            {sunSign.name}<SignGlyph id={sunSign.id} />
          </StatItem>
          <StatItem icon={LI.moon} label="Lune">
            {moonSign.name}<SignGlyph id={moonSign.id} />
          </StatItem>
          <StatItem icon={LI.asc}  label="Ascendant">
            {ascSign.name}<SignGlyph id={ascSign.id} />
          </StatItem>
          <StatItemDual icon={LI.heart} label="Affinités">
            {affinitySigns.map(s => (
              <span key={s.id}>{s.name}<SignGlyph id={s.id} /></span>
            ))}
          </StatItemDual>
        </div>

        <div className="avatar-frame">
          <div className="avatar-glow" />
          <img className="avatar-img" src={avatarSrc} alt={avatarAlt} />
          <span className="twinkle-dot" style={{ top: "8%",  left: "12%", animationDelay: "0.5s" }} />
          <span className="twinkle-dot" style={{ top: "20%", right: "8%", animationDelay: "1.4s" }} />
          <span className="twinkle-dot" style={{ bottom: "12%", left: "10%", animationDelay: "2.2s" }} />
          <span className="twinkle-dot" style={{ bottom: "20%", right: "14%", animationDelay: "0.8s" }} />
        </div>

        <div className="stats-col right">
          <StatItem icon={ELEMENT_ICON[dominantElement]} label="Élément">
            <span style={{ color: ELEMENT_COLOR[dominantElement] }}>{dominantElement}</span>
          </StatItem>
          <StatItem icon={LI.venus} label="Vénus">
            {venusSign.name}<SignGlyph id={venusSign.id} />
          </StatItem>
          <StatItem icon={LI.mars}  label="Mars">
            {marsSign.name}<SignGlyph id={marsSign.id} />
          </StatItem>
          <StatItem icon={LI.crown} label="Maître">
            {masterName}<PlanetGlyph id={masterPlanet.id} />
          </StatItem>
        </div>
      </div>
    );
  }

  window.AstralHero = AstralHero;
})();
