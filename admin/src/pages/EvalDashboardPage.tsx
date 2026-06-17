import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  getEvalDashboard, getEvalResults, getEvalResult, rateEvalResult, scoreProduction,
  type EvalTypeStat, type EvalResultSummary, type EvalResultDetail,
} from '../api/eval';

type Tab = 'dashboard' | 'results';

function fmtDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function scoreColor(score: number | null) {
  if (score === null) return 'var(--muted)';
  if (score >= 75) return '#6fae8f';
  if (score >= 50) return '#d4a853';
  return '#e08f6f';
}

function ScorePill({ value }: { value: number | null }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 10, fontSize: 12, fontWeight: 600,
      background: 'rgba(255,255,255,0.04)', color: scoreColor(value),
    }}>
      {value === null ? '—' : value.toFixed(0)}
    </span>
  );
}

// ── Dashboard tab ──────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<EvalTypeStat[] | null>(null);

  useEffect(() => {
    getEvalDashboard().then((r) => setStats(r.byType)).catch(console.error);
  }, []);

  if (!stats) return <div style={{ color: 'var(--muted)', padding: 40 }}>Chargement...</div>;
  if (stats.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', padding: 40, fontSize: 14 }}>
        Aucun résultat évalué pour l'instant. Lance des tests Golden ou score des sorties de production.
      </div>
    );
  }

  return (
    <div>
      <div style={card}>
        <div style={chartTitle}>Score composite moyen par type</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats}>
            <XAxis dataKey="type" tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(1)} />
            <Bar dataKey="avgComposite" radius={[3, 3, 0, 0]}>
              {stats.map((s, i) => <Cell key={i} fill={scoreColor(s.avgComposite)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...card, marginTop: 24 }}>
        <div style={chartTitle}>Détail par type</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Type</th>
              <th style={{ ...th, textAlign: 'right' }}>N</th>
              <th style={{ ...th, textAlign: 'right' }}>Composite</th>
              <th style={{ ...th, textAlign: 'right' }}>Juge</th>
              <th style={{ ...th, textAlign: 'right' }}>Pass %</th>
              <th style={{ ...th, textAlign: 'right' }}>Humain /100</th>
              <th style={{ ...th, textAlign: 'right' }}>Écart juge↔humain</th>
              <th style={{ ...th, textAlign: 'right' }}>👍 / 👎</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.type}>
                <td style={{ ...td, color: 'var(--text-col)' }}>{s.type}</td>
                <td style={{ ...td, textAlign: 'right' }}>{s.count}</td>
                <td style={{ ...td, textAlign: 'right', color: scoreColor(s.avgComposite) }}>{s.avgComposite.toFixed(1)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{s.avgJudge ? s.avgJudge.toFixed(1) : '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{s.passRate.toFixed(0)}%</td>
                <td style={{ ...td, textAlign: 'right' }}>{s.humanAvg100 ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right', color: s.judgeHumanGap !== null && Math.abs(s.judgeHumanGap) > 15 ? '#e08f6f' : 'var(--muted)' }}>
                  {s.judgeHumanGap !== null ? (s.judgeHumanGap > 0 ? '+' : '') + s.judgeHumanGap : '—'}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {s.feedback ? `${s.feedback.positive} / ${s.feedback.negative}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Results tab ────────────────────────────────────────────────────────────
const TYPES = ['horoscope', 'synastry_v2', 'natal_section', 'transits', 'cosmic_headline', 'chat'];

function ResultsTab() {
  const [data, setData] = useState<{ data: EvalResultSummary[]; total: number; page: number; limit: number } | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  // score-production form
  const [spType, setSpType] = useState('horoscope');
  const [spId, setSpId] = useState('');
  const [spLoading, setSpLoading] = useState(false);
  const [spError, setSpError] = useState<string | null>(null);

  function reload() {
    getEvalResults({ page, type: type || undefined, source: source || undefined }).then(setData).catch(console.error);
  }
  useEffect(reload, [page, type, source]);

  async function runScore() {
    if (!spId) return;
    setSpLoading(true);
    setSpError(null);
    try {
      await scoreProduction(spType, spId, true);
      setSpId('');
      setPage(1);
      reload();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setSpError(err?.response?.data?.error ?? 'Erreur');
    } finally {
      setSpLoading(false);
    }
  }

  return (
    <div>
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={chartTitle}>Scorer une sortie de production</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={spType} onChange={(e) => setSpType(e.target.value)} style={{ ...inputStyle, width: 180 }}>
              <option value="horoscope">horoscope</option>
              <option value="synastry_v2">synastry_v2</option>
              <option value="natal_section">natal_section</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>ID entité</label>
            <input value={spId} onChange={(e) => setSpId(e.target.value)} placeholder="ex: 42" style={{ ...inputStyle, width: 120 }} />
          </div>
          <button onClick={runScore} disabled={!spId || spLoading} style={primaryBtn}>
            {spLoading ? 'Scoring...' : 'Scorer (avec juge)'}
          </button>
          {spError && <span style={{ color: '#e08f6f', fontSize: 13 }}>{spError}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 180 }}>
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 160 }}>
          <option value="">Toutes sources</option>
          <option value="golden">golden</option>
          <option value="production">production</option>
        </select>
        {data && <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 'auto', alignSelf: 'center' }}>{data.total} résultats</span>}
      </div>

      <div style={card}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Type</th>
              <th style={th}>Source</th>
              <th style={th}>Réf</th>
              <th style={{ ...th, textAlign: 'right' }}>Composite</th>
              <th style={{ ...th, textAlign: 'right' }}>Juge</th>
              <th style={{ ...th, textAlign: 'center' }}>Gate</th>
              <th style={{ ...th, textAlign: 'right' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r.id)} style={{ cursor: 'pointer' }}>
                <td style={{ ...td, color: 'var(--text-col)' }}>{r.generationType}</td>
                <td style={td}>{r.source}</td>
                <td style={td}>{r.referenceId ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}><ScorePill value={r.compositeScore} /></td>
                <td style={{ ...td, textAlign: 'right' }}><ScorePill value={r.judgeScore} /></td>
                <td style={{ ...td, textAlign: 'center' }}>{r.passed === null ? '—' : r.passed ? '✓' : '✗'}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {data?.data.length === 0 && <tr><td style={td} colSpan={7}>Aucun résultat.</td></tr>}
          </tbody>
        </table>
      </div>

      {data && data.total > data.limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Précédent</button>
          <span style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>Page {page} / {Math.ceil(data.total / data.limit)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / data.limit)} style={pageBtn}>Suivant →</button>
        </div>
      )}

      {selected !== null && <ResultDetailModal id={selected} onClose={() => setSelected(null)} onRated={reload} />}
    </div>
  );
}

function ResultDetailModal({ id, onClose, onRated }: { id: number; onClose: () => void; onRated: () => void }) {
  const [detail, setDetail] = useState<EvalResultDetail | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getEvalResult(id).then(setDetail).catch(console.error); }, [id]);

  async function submit() {
    if (ratingScore < 1) return;
    setSaving(true);
    try {
      await rateEvalResult(id, ratingScore, notes || undefined);
      await getEvalResult(id).then(setDetail);
      setRatingScore(0); setNotes('');
      onRated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, color: 'var(--text-col)' }}>Résultat #{id}</h2>
          <button onClick={onClose} style={smallBtn}>✕</button>
        </div>

        {!detail ? <div style={{ color: 'var(--muted)' }}>Chargement...</div> : (
          <>
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
              <Meta label="Type" value={detail.generationType} />
              <Meta label="Source" value={detail.source} />
              <Meta label="Composite" value={detail.compositeScore?.toFixed(1) ?? '—'} />
              <Meta label="Juge" value={detail.judgeScore?.toFixed(1) ?? '—'} />
              <Meta label="Gate" value={detail.passed === null ? '—' : detail.passed ? '✓ pass' : '✗ fail'} />
              {detail.feedback && <Meta label="👍 / 👎" value={`${detail.feedback.positive} / ${detail.feedback.negative}`} />}
            </div>

            <div style={sectionTitle}>Critères</div>
            <table style={{ ...tableStyle, marginBottom: 16 }}>
              <tbody>
                {detail.scores.map((s, i) => (
                  <tr key={i}>
                    <td style={{ ...td, width: 90, color: s.category === 'judge' ? '#a090e0' : '#6fae8f' }}>{s.category}</td>
                    <td style={{ ...td, color: 'var(--text-col)' }}>{s.criterion}</td>
                    <td style={{ ...td, textAlign: 'right', width: 70 }}>{s.score}/{s.maxScore}</td>
                    <td style={{ ...td, color: 'var(--muted)', fontSize: 12 }}>{s.rationale ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={sectionTitle}>Sortie générée</div>
            <pre style={preStyle}>{JSON.stringify(detail.outputData, null, 2)}</pre>

            <div style={sectionTitle}>Notation humaine</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRatingScore(n)} style={{
                  ...smallBtn, padding: '6px 12px',
                  background: ratingScore >= n ? 'rgba(212,168,83,0.2)' : 'var(--surface)',
                  color: ratingScore >= n ? 'var(--gold)' : 'var(--muted)',
                }}>★ {n}</button>
              ))}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optionnel)"
              style={{ ...inputStyle, width: '100%', minHeight: 60, marginBottom: 10, resize: 'vertical' }} />
            <button onClick={submit} disabled={ratingScore < 1 || saving} style={primaryBtn}>
              {saving ? 'Enregistrement...' : 'Enregistrer la note'}
            </button>

            {detail.ratings.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={sectionTitle}>Notes existantes</div>
                {detail.ratings.map((r) => (
                  <div key={r.id} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                    ★ {r.score} — {r.admin} — {fmtDate(r.createdAt)} {r.notes ? `· ${r.notes}` : ''}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 15, color: 'var(--text-col)' }}>{value}</div>
    </div>
  );
}

export function EvalDashboardPage() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div>
      <h1 style={{ fontSize: 28, color: 'var(--text-col)', marginBottom: 8 }}>Évaluation</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Qualité des prompts : checks déterministes, juge LLM, feedback utilisateurs et notation humaine.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-col)' }}>
        {(['dashboard', 'results'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'transparent', border: 'none',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === t ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t ? 600 : 400, marginBottom: -1,
          }}>
            {t === 'dashboard' ? 'Tableau de bord' : 'Résultats'}
          </button>
        ))}
      </div>

      {tab === 'dashboard' ? <DashboardTab /> : <ResultsTab />}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 12, padding: '20px 24px' };
const chartTitle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' };
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 4 };
const tooltipStyle: React.CSSProperties = { background: '#221830', border: '1px solid #3d2f5a', borderRadius: 8, color: '#e8e0f0', fontSize: 12 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-col)' };
const td: React.CSSProperties = { padding: '7px 8px', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' };
const inputStyle: React.CSSProperties = { padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 8, color: 'var(--text-col)', fontSize: 13, outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };
const primaryBtn: React.CSSProperties = { padding: '10px 22px', background: 'linear-gradient(135deg, #d4a853, #b8892f)', border: 'none', borderRadius: 8, color: '#0a0812', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
const smallBtn: React.CSSProperties = { padding: '4px 12px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 };
const pageBtn: React.CSSProperties = { padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: 40, overflowY: 'auto' };
const modal: React.CSSProperties = { background: 'var(--deep)', border: '1px solid var(--border-col)', borderRadius: 14, padding: 28, width: 'min(760px, 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' };
const preStyle: React.CSSProperties = { background: 'var(--surface)', padding: 14, borderRadius: 8, fontSize: 11, color: 'var(--muted)', overflow: 'auto', maxHeight: 280, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 };
