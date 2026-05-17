/* ============================================================
   Lunestia — Onboarding app shell
   - Manages screen index + transition direction
   - Renders persistent star background, progress, back button
   ============================================================ */

const { useState, useMemo, useCallback, useEffect } = React;

/* --- Star field generator (one-time) ------------------------- */
function Starfield() {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 36; i++) {
      arr.push({
        top:   Math.random() * 100,
        left:  Math.random() * 100,
        size:  Math.random() < 0.85 ? 1.2 : 2,
        peak:  0.25 + Math.random() * 0.55,
        delay: Math.random() * 4,
      });
    }
    return arr;
  }, []);

  return (
    <div className="starfield" aria-hidden="true">
      {stars.map((s, i) => (
        <span key={i} className="star" style={{
          top: `${s.top}%`,
          left: `${s.left}%`,
          width:  `${s.size}px`,
          height: `${s.size}px`,
          "--peak": s.peak,
          animationDelay: `${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

/* --- Progress dots ------------------------------------------- */
function Progress({ index, total }) {
  return (
    <div className="progress" aria-label={`Étape ${index + 1} sur ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i}
          className={
            "progress-dot " +
            (i === index ? "active" : i < index ? "done" : "")
          }
        />
      ))}
    </div>
  );
}

/* --- App ----------------------------------------------------- */
function App() {
  const TOTAL = 4;
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(0); // for exit direction

  const next = useCallback(() => {
    setPrevIdx(idx);
    setIdx(i => Math.min(i + 1, TOTAL - 1));
  }, [idx]);

  const back = useCallback(() => {
    setPrevIdx(idx);
    setIdx(i => Math.max(i - 1, 0));
  }, [idx]);

  const finish = useCallback(() => {
    // For the prototype, loop back to the start as a friendly demo
    setPrevIdx(idx);
    setIdx(0);
  }, [idx]);

  // Direction: 1 = going forward (new enters from right), -1 = backward (from left)
  const direction = idx >= prevIdx ? 1 : -1;

  const screens = [
    <ScreenPrivacy onContinue={next} />,
    <ScreenGuide   onContinue={next} />,
    <ScreenForm    onContinue={next} onSkip={next} />,
    <ScreenDone    onFinish={finish} active={idx === 3} />,
  ];

  return (
    <div className="stage">
      <div className="phone">
        <Starfield />
        <Progress index={idx} total={TOTAL} />

        <button className={"back-btn" + (idx === 0 ? " hidden" : "")}
                onClick={back} aria-label="Précédent">
          <OBIcon.arrowLeft />
        </button>

        <div className="screens">
          {screens.map((node, i) => {
            // Determine state classes
            let cls = "screen";
            if (i === idx) cls += " active";
            else if (i === prevIdx) {
              cls += direction === 1 ? " exit-left" : " exit-right";
            } else if (i < idx) {
              // already-passed screens sit off to the left, ready for back-nav from-left
              cls += " enter-from-left";
            }
            return <div key={i} className={cls}>{node}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
