/**
 * Lunestia — DecadeYearPicker
 *
 * Sélecteur d'âge en 2 niveaux (web reference for the React Native port).
 *
 *   Rangée 1 : pilules de décennies (0-9, 10-19, …, 80-89)
 *   Rangée 2 : grille de 10 années (les 10 ans de la décennie active)
 *   Sous le picker : bandeau "jalon astral" si l'âge sélectionné en est un
 *
 * Avantages vs slider :
 *   - chaque année est un hit-target de 30+px (facile à taper)
 *   - sélection précise sans gestes de fine-tuning
 *   - les jalons astraux sont marqués par un point doré sous la cellule
 *
 * Props (controlled) :
 *   value:       number              âge sélectionné
 *   onChange:    (age: number) => void
 *   min?:        number  = 0
 *   max?:        number  = 89
 *   birthYear?:  number              affiche l'année calendaire
 *   milestones?: Milestone[]         défaut: DEFAULT_MILESTONES
 *   labels?:     i18n strings
 */

const DYP_DEFAULT_MILESTONES = [
  { age: 7,  label: 'Premier seuil',          glyph: '☉' },
  { age: 14, label: 'Adolescence',            glyph: '☿' },
  { age: 18, label: 'Émancipation',           glyph: '♂' },
  { age: 21, label: 'Quête',                  glyph: '♃' },
  { age: 25, label: 'Premiers choix',         glyph: '♀' },
  { age: 29, label: 'Retour de Saturne',      glyph: '♄' },
  { age: 35, label: 'Conscience',             glyph: '♇' },
  { age: 42, label: 'Mi-parcours',            glyph: '♅' },
  { age: 50, label: 'Maturité',               glyph: '☉' },
  { age: 58, label: 'Second retour Saturne',  glyph: '♄' },
  { age: 70, label: 'Récolte',                glyph: '♃' },
  { age: 84, label: 'Cycle d’Uranus',         glyph: '♅' },
];

function DecadeYearPicker({
  value,
  onChange,
  min = 0,
  max = 89,
  birthYear,
  milestones = DYP_DEFAULT_MILESTONES,
  labels,
}) {
  const L = {
    yearsSuffix: 'ans',
    milestoneTag: 'JALON ASTRAL',
    ...labels,
  };

  const clamp = (n) => Math.max(min, Math.min(max, n));
  const safeValue = clamp(value);

  // Active decade is derived from `value`, not held in state — so external
  // changes to `value` (e.g. tapping a milestone elsewhere) keep the grid
  // in sync without an extra effect.
  const activeDecade = Math.floor(safeValue / 10) * 10;

  // Build the decade list dynamically from min/max.
  const decades = [];
  for (let d = Math.floor(min / 10) * 10; d <= Math.floor(max / 10) * 10; d += 10) {
    decades.push(d);
  }

  const milestoneByAge = React.useMemo(() => {
    const m = {};
    milestones.forEach((x) => { m[x.age] = x; });
    return m;
  }, [milestones]);

  const currentMilestone = milestoneByAge[safeValue];
  const calendarYear = birthYear != null ? birthYear + safeValue : null;

  // When user taps a decade, jump to its first year (or stay on `value`
  // if `value` is already inside the new decade — which only happens for
  // the active decade, so effectively: jump to decade-start).
  const pickDecade = (d) => {
    if (d === activeDecade) return;
    onChange(clamp(d));
  };

  const pickYear = (y) => {
    if (y < min || y > max) return;
    onChange(y);
  };

  return (
    <div className="dyp">
      {/* Hero row: big age + calendar-year badge */}
      <div className="dyp-hero">
        <span className="dyp-age">{safeValue}</span>
        <span className="dyp-age-suffix">{L.yearsSuffix}</span>
        {calendarYear != null && (
          <span className="dyp-year">{calendarYear}</span>
        )}
      </div>

      {/* Decade pills (coarse) */}
      <div className="dyp-decades" role="tablist" aria-label="Décennie">
        {decades.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={activeDecade === d}
            className={'dyp-decade' + (activeDecade === d ? ' is-active' : '')}
            onClick={() => pickDecade(d)}
          >
            {d}–{d + 9}
          </button>
        ))}
      </div>

      {/* Year grid (fine) */}
      <div className="dyp-years" role="radiogroup" aria-label="Année">
        {Array.from({ length: 10 }, (_, i) => activeDecade + i).map((y) => {
          const inRange = y >= min && y <= max;
          const isActive = inRange && safeValue === y;
          const isMilestone = !!milestoneByAge[y];
          const cls =
            'dyp-year-cell' +
            (isActive ? ' is-active' : '') +
            (isMilestone ? ' is-milestone' : '') +
            (!inRange ? ' is-out' : '');
          return (
            <button
              key={y}
              role="radio"
              aria-checked={isActive}
              aria-label={
                isMilestone
                  ? `${y} ans — ${milestoneByAge[y].label}`
                  : `${y} ans`
              }
              className={cls}
              onClick={() => pickYear(y)}
              disabled={!inRange}
            >
              {y}
            </button>
          );
        })}
      </div>

      {/* Milestone bandeau (only when current age is a milestone) */}
      {currentMilestone && (
        <div className="dyp-milestone">
          <span className="dyp-milestone-glyph">{currentMilestone.glyph}</span>
          <div className="dyp-milestone-meta">
            <span className="dyp-milestone-tag">{L.milestoneTag}</span>
            <span className="dyp-milestone-label">{currentMilestone.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

window.DecadeYearPicker = DecadeYearPicker;
window.DYP_DEFAULT_MILESTONES = DYP_DEFAULT_MILESTONES;
