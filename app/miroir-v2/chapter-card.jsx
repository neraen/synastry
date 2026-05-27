/**
 * Lunestia — ChapterCard
 *
 * Carte "chapitre" pour aérer un texte long en sections thématiques.
 * Utilisée par le Miroir Temporel pour découper la lecture d'un âge
 * en 4 chapitres (Énergie / Tension / Quotidien / Empreinte).
 *
 * Props :
 *   theme:   string             ex: "Énergie dominante"  — petit label tracking
 *   glyph:   string             ex: "☽"  — glyphe planétaire dans le carré
 *   text:    string             le paragraphe
 *   step?:   { current, total } ex: { current: 1, total: 4 } → "01 / 04"
 *   accent?: string             couleur de l'accent (défaut: var(--gold))
 *   first?:  boolean            si true → drop-cap serif + fond plus chaud
 */

function ChapterCard({ theme, glyph, text, step, accent, first }) {
  const styleVars = accent ? { '--cc-accent': accent } : undefined;
  const cls = 'cc' + (first ? ' cc--first' : '');
  const stepLabel = step
    ? `${String(step.current).padStart(2, '0')} / ${String(step.total).padStart(2, '0')}`
    : null;

  return (
    <article className={cls} style={styleVars}>
      <header className="cc-head">
        <span className="cc-glyph">{glyph}</span>
        <span className="cc-theme">{theme}</span>
        {stepLabel && <span className="cc-step">{stepLabel}</span>}
      </header>
      <p className="cc-text">
        {first ? (
          <>
            <span className="cc-dropcap">{text.charAt(0)}</span>
            {text.slice(1)}
          </>
        ) : (
          text
        )}
      </p>
    </article>
  );
}

/** Helper: render an ordered list of chapters. */
function ChapterCardList({ chapters }) {
  return (
    <div className="cc-list">
      {chapters.map((c, i) => (
        <ChapterCard
          key={i}
          theme={c.theme}
          glyph={c.glyph}
          text={c.text}
          accent={c.accent}
          first={i === 0}
          step={{ current: i + 1, total: chapters.length }}
        />
      ))}
    </div>
  );
}

window.ChapterCard = ChapterCard;
window.ChapterCardList = ChapterCardList;
