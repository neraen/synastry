import { useEffect, useRef, useState } from 'react';
import {
  getGoldenCases, createGoldenCase, updateGoldenCase, deleteGoldenCase,
  createGoldenRun, getGoldenRuns, getGoldenRun, getGoldenDiff,
  type GoldenCase, type GoldenRun, type GoldenRunResult, type DiffRow,
} from '../api/golden';

type Tab = 'cases' | 'runs' | 'diff';

const TYPES = ['horoscope', 'synastry_v2', 'natal_section', 'transits', 'cosmic_headline', 'chat'];

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
}

function statusColor(s: string) {
  return { pending: '#9b8ab0', running: '#d4a853', completed: '#6fae8f', failed: '#e08f6f' }[s] ?? 'var(--muted)';
}

// ── Cases tab ────────────────────────────────────────────────────────────
function CasesTab() {
  const [cases, setCases] = useState<GoldenCase[]>([]);
  const [editing, setEditing] = useState<GoldenCase | 'new' | null>(null);

  function reload() { getGoldenCases().then((r) => setCases(r.data)).catch(console.error); }
  useEffect(reload, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>{cases.length} cas</span>
        <button onClick={() => setEditing('new')} style={primaryBtn}>+ Nouveau cas</button>
      </div>

      <div style={card}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Nom</th><th style={th}>Type</th><th style={{ ...th, textAlign: 'center' }}>Actif</th>
              <th style={{ ...th, textAlign: 'right' }}>Maj</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td style={{ ...td, color: 'var(--text-col)' }}>{c.name}</td>
                <td style={td}>{c.generationType}</td>
                <td style={{ ...td, textAlign: 'center' }}>{c.active ? '✓' : '—'}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtDate(c.updatedAt)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={() => setEditing(c)} style={smallBtn}>Éditer</button>
                </td>
              </tr>
            ))}
            {cases.length === 0 && <tr><td style={td} colSpan={5}>Aucun cas. Crée-en un pour démarrer.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <CaseEditor
          value={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function CaseEditor({ value, onClose, onSaved }: { value: GoldenCase | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(value?.name ?? '');
  const [type, setType] = useState(value?.generationType ?? 'horoscope');
  const [active, setActive] = useState(value?.active ?? true);
  const [inputJson, setInputJson] = useState(JSON.stringify(value?.inputData ?? { prompt: '' }, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    let inputData: Record<string, unknown>;
    try { inputData = JSON.parse(inputJson); } catch { setError('inputData : JSON invalide'); return; }
    setSaving(true); setError(null);
    try {
      const payload = { name, generationType: type, active, inputData };
      if (value) await updateGoldenCase(value.id, payload);
      else await createGoldenCase(payload);
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error ?? 'Erreur');
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!value) return;
    await deleteGoldenCase(value.id);
    onSaved();
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <h2 style={{ fontSize: 20, color: 'var(--text-col)', marginBottom: 16 }}>{value ? 'Éditer le cas' : 'Nouveau cas golden'}</h2>
        <label style={labelStyle}>Nom</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13, alignSelf: 'flex-end', paddingBottom: 8 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Actif
          </label>
        </div>
        <label style={labelStyle}>inputData (JSON) — ex. {'{ "prompt": "..." }'}</label>
        <textarea value={inputJson} onChange={(e) => setInputJson(e.target.value)}
          style={{ ...inputStyle, width: '100%', minHeight: 200, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', marginBottom: 12 }} />
        {error && <div style={{ color: '#e08f6f', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={saving || !name} style={primaryBtn}>{saving ? '...' : 'Enregistrer'}</button>
          <button onClick={onClose} style={smallBtn}>Annuler</button>
          {value && <button onClick={remove} style={{ ...smallBtn, color: '#e08f6f', marginLeft: 'auto' }}>Désactiver</button>}
        </div>
      </div>
    </div>
  );
}

// ── Runs tab ─────────────────────────────────────────────────────────────
function RunsTab() {
  const [runs, setRuns] = useState<GoldenRun[]>([]);
  const [launching, setLaunching] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reload() { getGoldenRuns().then((r) => setRuns(r.data)).catch(console.error); }
  useEffect(() => {
    reload();
    pollRef.current = setInterval(() => {
      // Poll while any run is active.
      getGoldenRuns().then((r) => {
        setRuns(r.data);
      }).catch(() => {});
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function launch() {
    setLaunching(true);
    try { await createGoldenRun(); reload(); }
    finally { setLaunching(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
          Lance tous les cas actifs et les note (avec juge LLM). Un worker messenger doit tourner.
        </span>
        <button onClick={launch} disabled={launching} style={primaryBtn}>{launching ? '...' : '▶ Lancer un run'}</button>
      </div>

      <div style={card}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Run</th><th style={th}>Statut</th>
              <th style={{ ...th, textAlign: 'right' }}>Cas</th><th style={{ ...th, textAlign: 'right' }}>Score moy.</th>
              <th style={{ ...th, textAlign: 'right' }}>Coût</th><th style={{ ...th, textAlign: 'right' }}>Créé</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r.id)} style={{ cursor: 'pointer' }}>
                <td style={{ ...td, color: 'var(--text-col)' }}>{r.label ?? `#${r.id}`}</td>
                <td style={{ ...td, color: statusColor(r.status), fontWeight: 600 }}>{r.status}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.caseCount}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.avgScore?.toFixed(1) ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>${r.totalCostUsd.toFixed(4)}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {runs.length === 0 && <tr><td style={td} colSpan={6}>Aucun run.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected !== null && <RunDetail id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RunDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const [data, setData] = useState<{ run: GoldenRun; results: GoldenRunResult[] } | null>(null);
  useEffect(() => {
    function load() { getGoldenRun(id).then(setData).catch(console.error); }
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [id]);

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, color: 'var(--text-col)' }}>Run #{id}</h2>
          <button onClick={onClose} style={smallBtn}>✕</button>
        </div>
        {!data ? <div style={{ color: 'var(--muted)' }}>Chargement...</div> : (
          <>
            <div style={{ color: statusColor(data.run.status), marginBottom: 12, fontWeight: 600 }}>
              {data.run.status} · {data.results.length}/{data.run.caseCount} cas
              {data.run.errorMessage && <span style={{ color: '#e08f6f' }}> · {data.run.errorMessage}</span>}
            </div>
            <table style={tableStyle}>
              <thead><tr><th style={th}>Cas</th><th style={th}>Type</th><th style={{ ...th, textAlign: 'right' }}>Composite</th><th style={{ ...th, textAlign: 'right' }}>Juge</th><th style={{ ...th, textAlign: 'center' }}>Gate</th></tr></thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...td, color: 'var(--text-col)' }}>{r.caseName ?? '—'}</td>
                    <td style={td}>{r.generationType}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.compositeScore?.toFixed(1) ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.judgeScore?.toFixed(1) ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{r.passed === null ? '—' : r.passed ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

// ── Diff tab ─────────────────────────────────────────────────────────────
function DiffTab() {
  const [runs, setRuns] = useState<GoldenRun[]>([]);
  const [a, setA] = useState<number | ''>('');
  const [b, setB] = useState<number | ''>('');
  const [rows, setRows] = useState<DiffRow[] | null>(null);

  useEffect(() => { getGoldenRuns().then((r) => setRuns(r.data.filter((x) => x.status === 'completed'))).catch(console.error); }, []);

  async function run() {
    if (a === '' || b === '') return;
    const r = await getGoldenDiff(Number(a), Number(b));
    setRows(r.rows);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Run A (référence)</label>
          <select value={a} onChange={(e) => setA(e.target.value ? Number(e.target.value) : '')} style={{ ...inputStyle, width: 220 }}>
            <option value="">—</option>
            {runs.map((r) => <option key={r.id} value={r.id}>{r.label ?? `#${r.id}`} ({r.avgScore?.toFixed(1)})</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Run B (comparé)</label>
          <select value={b} onChange={(e) => setB(e.target.value ? Number(e.target.value) : '')} style={{ ...inputStyle, width: 220 }}>
            <option value="">—</option>
            {runs.map((r) => <option key={r.id} value={r.id}>{r.label ?? `#${r.id}`} ({r.avgScore?.toFixed(1)})</option>)}
          </select>
        </div>
        <button onClick={run} disabled={a === '' || b === ''} style={primaryBtn}>Comparer</button>
      </div>

      {rows && (
        <div style={card}>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Cas</th><th style={th}>Type</th><th style={{ ...th, textAlign: 'right' }}>A</th><th style={{ ...th, textAlign: 'right' }}>B</th><th style={{ ...th, textAlign: 'right' }}>Δ</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.caseId}>
                  <td style={{ ...td, color: 'var(--text-col)' }}>{r.caseName}</td>
                  <td style={td}>{r.type}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.scoreA?.toFixed(1) ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.scoreB?.toFixed(1) ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: r.delta === null ? 'var(--muted)' : r.delta < -2 ? '#e08f6f' : r.delta > 2 ? '#6fae8f' : 'var(--muted)' }}>
                    {r.delta === null ? '—' : (r.delta > 0 ? '+' : '') + r.delta.toFixed(1)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td style={td} colSpan={5}>Aucun cas commun.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GoldenSuitePage() {
  const [tab, setTab] = useState<Tab>('cases');

  return (
    <div>
      <h1 style={{ fontSize: 28, color: 'var(--text-col)', marginBottom: 8 }}>Tests Golden</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Suite de cas rejouables : prompt → génération → scoring, avec détection de régression entre runs.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-col)' }}>
        {(['cases', 'runs', 'diff'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'transparent', border: 'none',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === t ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t ? 600 : 400, marginBottom: -1,
          }}>
            {{ cases: 'Cas', runs: 'Runs', diff: 'Régression' }[t]}
          </button>
        ))}
      </div>

      {tab === 'cases' && <CasesTab />}
      {tab === 'runs' && <RunsTab />}
      {tab === 'diff' && <DiffTab />}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 12, padding: '20px 24px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-col)' };
const td: React.CSSProperties = { padding: '7px 8px', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' };
const inputStyle: React.CSSProperties = { padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 8, color: 'var(--text-col)', fontSize: 13, outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };
const primaryBtn: React.CSSProperties = { padding: '10px 22px', background: 'linear-gradient(135deg, #d4a853, #b8892f)', border: 'none', borderRadius: 8, color: '#0a0812', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
const smallBtn: React.CSSProperties = { padding: '4px 12px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: 40, overflowY: 'auto' };
const modal: React.CSSProperties = { background: 'var(--deep)', border: '1px solid var(--border-col)', borderRadius: 14, padding: 28, width: 'min(720px, 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' };
