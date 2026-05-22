/* =========================================================
   Lunestia — Compatibility page (data + assembly)
   ========================================================= */

const { useState: cuseState } = React;

/* ===== Data ===== */
const COMPAT = {
  subjectA: "Clément",
  subjectB: "Test",
  initialA: "C",
  initialB: "T",
  score: 95,
  tagline: "Un lien puissant, alliant stabilité et vivacité d'esprit",

  dimensions: [
    { id: "amour",     name: "Amour",         value: 92, icon: <CompatI.heart/>,
      detail: "Vénus de Clément harmonise les besoins affectifs de Test : tendresse spontanée, gestes attentifs au quotidien." },
    { id: "conflits",  name: "Conflits",      value: 78, icon: <CompatI.pulse/>,
      detail: "Mars en Bélier double : les désaccords éclatent vite, mais se résolvent aussi vite. Pas de rancune installée." },
    { id: "attirance", name: "Attirance",     value: 96, icon: <CompatI.bolt/>,
      detail: "Conjonction Pluton-Pluton : magnétisme intense, fascination réciproque qui dépasse la simple alchimie physique." },
    { id: "long",      name: "Long terme",    value: 88, icon: <CompatI.anchor/>,
      detail: "Jupiter en Cancer chez les deux : foyer, famille et stabilité comme socle commun pour bâtir dans la durée." },
    { id: "comm",      name: "Communication", value: 74, icon: <CompatI.chat/>,
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

  forces: [
    {
      planet: "pluto", badge: "scorpio",
      title: "Conjonction Pluton — Pluton",
      summary: "Transformation commune, lien intense",
      detail: "La conjonction de leurs Pluton respectifs révèle une transformation commune. Clément et Test vivent une relation intense où les remises en question profondes renforcent leur union plutôt que de la fragiliser.",
      tags: [
        { icon: <CompatI.sparkle/>, label: "Transformation" },
        { icon: <CompatI.bolt/>, label: "Intensité" },
      ],
    },
    {
      planet: "mars", badge: "aries",
      title: "Mars en Bélier coordonné",
      summary: "Énergie d'action partagée",
      detail: "Leur Mars en Bélier coordonné et soutenu par l'Ascendant crée une dynamique d'action et d'initiatives partagées — un couple énergique, capable de surmonter ensemble les obstacles.",
      tags: [
        { icon: <CompatI.bolt/>, label: "Initiative" },
        { icon: <CompatI.heart/>, label: "Élan commun" },
      ],
    },
    {
      planet: "jupiter", badge: "cancer",
      title: "Jupiter en Cancer",
      summary: "Empathie et soutien émotionnel",
      detail: "L'accord entre leurs Jupiter en Cancer génère un sens commun de l'empathie et du soutien émotionnel, favorisant un climat rassurant malgré la fougue qui peut s'exprimer entre eux.",
      tags: [
        { icon: <CompatI.heart/>, label: "Empathie" },
        { icon: <CompatI.anchor/>, label: "Sécurité" },
      ],
    },
  ],

  vigilance: [
    {
      planet: "mercury", badge: "gemini",
      title: "Mercure ↔ Ascendant en tension",
      summary: "Communication parfois frustrante",
      detail: "La tension entre Mercure de Clément et l'Ascendant de Test indique que leurs façons de penser et d'exprimer leurs idées peuvent entrer en conflit, ce qui occasionne des incompréhensions parfois frustrantes.",
      tags: [
        { icon: <CompatI.chat/>, label: "Reformuler" },
        { icon: <CompatI.pulse/>, label: "Patience" },
      ],
    },
    {
      planet: "sun", badge: "capricorn",
      title: "Soleil carré Milieu du Ciel",
      summary: "Ambitions à harmoniser",
      detail: "Le Soleil de Clément en carré avec le Milieu du Ciel de Test traduit des défis dans la gestion des ambitions et projets personnels, rendant difficile l'harmonisation de leurs objectifs professionnels et de vie.",
      tags: [
        { icon: <CompatI.anchor/>, label: "Aligner les caps" },
      ],
    },
  ],

  aspectKey: {
    planetA: "pluto", planetB: "pluto",
    name: "Pluton ☌ Pluton",
    desc: "La conjonction parfaite entre les Pluton de Clément et Test symbolise un lien aussi profond qu'exceptionnel, où chacun agit comme un miroir intensifiant les transformations intérieures de l'autre. Au quotidien, cela se traduit par une relation où le changement personnel est constant, parfois exigeant et bouleversant, mais absolument stimulant pour leur croissance commune.",
  },

  advice: {
    title: "Conseil de Lyra",
    text: "Clément et Test doivent cultiver la patience en communication, en étant attentifs aux façons très différentes dont ils expriment leurs idées et émotions. Apprendre à ralentir les débats pour vraiment écouter sans juger améliorera considérablement leur harmonie.",
  },
};

/* ===== Default tweaks (saved on disk via __edit_mode_set_keys) ===== */
const COMPAT_DEFAULTS = /*EDITMODE-BEGIN*/{
  "barStyle": "varied",
  "density": "comfortable",
  "showStarfield": true,
  "showOrbit": true
}/*EDITMODE-END*/;

/* ===== Tweaks panel ===== */
function CompatTweaks({ t, setTweak }) {
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
      <TweakSection title="Mise en page">
        <TweakRadio label="Densité"
          value={t.density} onChange={(v) => setTweak("density", v)}
          options={[
            { value: "comfortable", label: "Confort" },
            { value: "compact",     label: "Compact" },
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
function CompatibilityPage() {
  const [t, setTweak] = useTweaks(COMPAT_DEFAULTS);

  const compact = t.density === "compact";

  return (
    <div className="stage" style={compact ? { ["--row-pad"]: "8px" } : null}>
      <div className="phone">
        {t.showStarfield && <Starfield count={42}/>}
        <div className="scroll stagger">
          <header className="topbar">
            <a className="icon-btn" href="Theme Astral v2.html" aria-label="Retour"><CompatI.back/></a>
            <div className="topbar-title">Compatibilité</div>
            <button className="icon-btn" aria-label="Options"><CompatI.more/></button>
          </header>

          <Hero
            scoreTarget={COMPAT.score}
            tagline={COMPAT.tagline}
            nameA={COMPAT.initialA}
            nameB={COMPAT.initialB}
            subjectA={COMPAT.subjectA}
            subjectB={COMPAT.subjectB}
            showOrbit={t.showOrbit}
          />

          <DimensionBars data={COMPAT.dimensions} unified={t.barStyle === "unified"} />

          <AnalyseCeleste
            headline={COMPAT.analyse.headline}
            summary={COMPAT.analyse.summary}
            longText={COMPAT.analyse.longText}
          />

          <AccordionList
            kicker="Points forts"
            items={COMPAT.forces}
            variant="strength"
          />

          <AccordionList
            kicker="Points de vigilance"
            items={COMPAT.vigilance}
            variant="watch"
          />

          <AspectKey
            planetA={COMPAT.aspectKey.planetA}
            planetB={COMPAT.aspectKey.planetB}
            name={COMPAT.aspectKey.name}
            desc={COMPAT.aspectKey.desc}
          />

          <AdviceCard
            title={COMPAT.advice.title}
            text={COMPAT.advice.text}
          />

          <Actions themeName={COMPAT.subjectB} />
        </div>
      </div>
      <CompatTweaks t={t} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CompatibilityPage />);
