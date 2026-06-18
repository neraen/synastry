import { useEffect, useState } from 'react';
import {
  getNotifStats, getNotifLogs, previewNotif, sendTestPush, triggerNotif, getNotifSchedule,
  type NotifType, type TriggerType, type PreviewResponse, type NotifLog, type NotifStats,
  type ScheduleResponse, type NotifMessage,
} from '../api/notifications';

type Tab = 'preview' | 'test' | 'trigger' | 'schedule' | 'history';

const TAB_LABELS: Record<Tab, string> = {
  preview: 'Aperçu & contenu',
  test: 'Test d\'envoi',
  trigger: 'Déclencheurs',
  schedule: 'Scheduler & file',
  history: 'Historique',
};

const TYPE_LABELS: Record<string, string> = {
  transit: 'Transit personnel',
  transit_personal: 'Transit personnel',
  sky_event: 'Événement du ciel',
  daily_reminder: 'Rappel quotidien',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function errMsg(e: unknown): string {
  const ax = e as { response?: { data?: { error?: string } } };
  return ax?.response?.data?.error ?? 'Erreur inattendue';
}

// ── Notification preview card (phone-style) ────────────────────────────────
function NotifCard({ message }: { message: NotifMessage }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #2a1f3d, #1c1530)', border: '1px solid var(--border-col)',
      borderRadius: 14, padding: '14px 16px', maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #d4a853, #b8892f)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lunestia · maintenant</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-col)', marginBottom: 4 }}>{message.title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{message.body}</div>
    </div>
  );
}

// ── Preview tab ────────────────────────────────────────────────────────────
function PreviewTab() {
  const [type, setType] = useState<NotifType>('transit');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResponse | null>(null);

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await previewNotif(type, type === 'transit' ? email : undefined));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      <div style={chartTitle}>Générer le contenu sans l'envoyer</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as NotifType)} style={inputStyle}>
            <option value="transit">Transit personnel</option>
            <option value="sky_event">Événement du ciel</option>
            <option value="daily_reminder">Rappel quotidien</option>
          </select>
        </div>
        {type === 'transit' && (
          <div>
            <label style={labelStyle}>Email utilisateur</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com"
              style={{ ...inputStyle, width: 260 }} />
          </div>
        )}
        <button onClick={generate} disabled={loading || (type === 'transit' && !email)} style={primaryBtn}>
          {loading ? 'Génération...' : 'Générer'}
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {result && (
        <div>
          {result.type === 'transit' && (
            result.found && result.message
              ? <>
                  <NotifCard message={result.message} />
                  <pre style={{ ...preStyle, marginTop: 16 }}>{JSON.stringify(result.transit, null, 2)}</pre>
                </>
              : <div style={infoBox}>Aucun transit notifiable actuellement pour cet utilisateur
                  {result.reason ? ` (${result.reason})` : ''}.</div>
          )}
          {result.type === 'sky_event' && (
            result.message
              ? <>
                  <NotifCard message={result.message} />
                  <pre style={{ ...preStyle, marginTop: 16 }}>{JSON.stringify(result.events, null, 2)}</pre>
                </>
              : <div style={infoBox}>Aucun événement du ciel aujourd'hui
                  {result.reason ? ` (${result.reason})` : ''}.</div>
          )}
          {result.type === 'daily_reminder' && (
            <>
              <NotifCard message={{ title: result.title, body: result.body }} />
              <div style={{ ...sectionTitle, marginTop: 20 }}>Titres possibles (rotation aléatoire)</div>
              {result.templates.map((t, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 3 }}>· {t}</div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Test push tab ──────────────────────────────────────────────────────────
function TestTab() {
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('Test depuis Lunestia 🌙');
  const [body, setBody] = useState('Ceci est une notification de test.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function send() {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const r = await sendTestPush({ token: token.trim() || undefined, title, body });
      setSuccess(`Envoyé à ${r.tokensTargeted} appareil(s).`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      <div style={chartTitle}>Envoyer une vraie notification de test</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        Laisse le token vide pour envoyer aux appareils enregistrés sur ton compte admin, ou colle un
        ExponentPushToken[...] précis.
      </p>
      <div style={{ display: 'grid', gap: 14, maxWidth: 480 }}>
        <div>
          <label style={labelStyle}>Token Expo (optionnel)</label>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="ExponentPushToken[...]"
            style={{ ...inputStyle, width: '100%' }} />
        </div>
        <div>
          <label style={labelStyle}>Titre</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
        </div>
        <div>
          <label style={labelStyle}>Corps</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            style={{ ...inputStyle, width: '100%', minHeight: 60, resize: 'vertical' }} />
        </div>
        <NotifCard message={{ title, body }} />
        <button onClick={send} disabled={loading} style={{ ...primaryBtn, justifySelf: 'start' }}>
          {loading ? 'Envoi...' : 'Envoyer le test'}
        </button>
      </div>
      {error && <div style={{ ...errorBox, marginTop: 16 }}>{error}</div>}
      {success && <div style={{ ...successBox, marginTop: 16 }}>{success}</div>}
    </div>
  );
}

// ── Trigger tab ────────────────────────────────────────────────────────────
const TRIGGERS: { type: TriggerType; label: string; desc: string }[] = [
  { type: 'transits', label: 'Transits personnels', desc: 'Détecte les transits exacts et notifie les utilisateurs éligibles.' },
  { type: 'sky_events', label: 'Événements du ciel', desc: 'Pleine/Nouvelle Lune, Mercure rétrograde, solstices/équinoxes du jour.' },
  { type: 'daily_reminders', label: 'Rappels quotidiens', desc: 'Rappel générique aux utilisateurs ayant activé l\'option.' },
];

function TriggerTab() {
  const [busy, setBusy] = useState<TriggerType | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  async function run(type: TriggerType) {
    if (!window.confirm('Envoi RÉEL à tous les utilisateurs éligibles. Confirmer ?')) return;
    setBusy(type);
    try {
      const r = await triggerNotif(type);
      setResults((p) => ({ ...p, [type]: `✓ ${r.sent} notification(s) envoyée(s) à ${fmtDate(new Date().toISOString())}` }));
    } catch (e) {
      setResults((p) => ({ ...p, [type]: `✗ ${errMsg(e)}` }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={{ ...errorBox, marginBottom: 20 }}>
        ⚠️ Ces actions envoient de vraies notifications push à tous les utilisateurs éligibles (mêmes règles
        que le scheduler : fenêtre horaire, rate-limit, déduplication).
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        {TRIGGERS.map((t) => (
          <div key={t.type} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, color: 'var(--text-col)', marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.desc}</div>
              {results[t.type] && (
                <div style={{ fontSize: 13, marginTop: 8, color: results[t.type].startsWith('✗') ? '#e08f6f' : '#6fae8f' }}>
                  {results[t.type]}
                </div>
              )}
            </div>
            <button onClick={() => run(t.type)} disabled={busy === t.type} style={primaryBtn}>
              {busy === t.type ? 'En cours...' : 'Déclencher'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Schedule tab ───────────────────────────────────────────────────────────
function ScheduleTab() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    getNotifSchedule().then(setData).catch((e) => setError(errMsg(e)));
  }
  useEffect(reload, []);

  if (error) return <div style={errorBox}>{error}</div>;
  if (!data) return <div style={{ color: 'var(--muted)', padding: 40 }}>Chargement...</div>;

  const pendingEntries = Object.entries(data.queue.pending);

  return (
    <div>
      <div style={card}>
        <div style={chartTitle}>Planning du scheduler (worker messenger:consume scheduler_notifications)</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Job</th>
              <th style={th}>Cadence</th>
              <th style={th}>Prochaine exécution (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((j) => (
              <tr key={j.type}>
                <td style={{ ...td, color: 'var(--text-col)' }}>{j.label}</td>
                <td style={td}>{j.cadence}</td>
                <td style={td}>{fmtDate(j.nextRun)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>Heure serveur : {fmtDate(data.now)}</div>
      </div>

      <div style={{ ...card, marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ ...chartTitle, marginBottom: 0 }}>File Messenger</div>
          <button onClick={reload} style={smallBtn}>Rafraîchir</button>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Stat label="En échec" value={data.queue.failed} danger={data.queue.failed > 0} />
          {pendingEntries.length === 0
            ? <Stat label="En attente" value={0} />
            : pendingEntries.map(([q, n]) => <Stat key={q} label={`En attente · ${q}`} value={n} />)}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color: danger ? '#e08f6f' : 'var(--text-col)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

// ── History tab ────────────────────────────────────────────────────────────
function HistoryTab() {
  const [logs, setLogs] = useState<{ items: NotifLog[]; total: number } | null>(null);
  const [stats, setStats] = useState<NotifStats | null>(null);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => { getNotifStats().then(setStats).catch(console.error); }, []);
  useEffect(() => {
    getNotifLogs({ type: type || undefined, page, limit }).then(setLogs).catch(console.error);
  }, [type, page]);

  const totalPages = logs ? Math.max(1, Math.ceil(logs.total / limit)) : 1;

  return (
    <div>
      {stats && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={chartTitle}>Envoyées aujourd'hui / cette semaine</div>
          <table style={tableStyle}>
            <thead>
              <tr><th style={th}>Type</th><th style={{ ...th, textAlign: 'right' }}>Aujourd'hui</th><th style={{ ...th, textAlign: 'right' }}>Semaine</th></tr>
            </thead>
            <tbody>
              {Array.from(new Set([...stats.today, ...stats.week].map((s) => s.type))).map((t) => (
                <tr key={t}>
                  <td style={{ ...td, color: 'var(--text-col)' }}>{TYPE_LABELS[t] ?? t}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{stats.today.find((s) => s.type === t)?.count ?? 0}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{stats.week.find((s) => s.type === t)?.count ?? 0}</td>
                </tr>
              ))}
              {stats.today.length === 0 && stats.week.length === 0 && (
                <tr><td style={td} colSpan={3}>Aucune notification envoyée récemment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ ...chartTitle, marginBottom: 0 }}>Historique des envois</div>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} style={inputStyle}>
            <option value="">Tous les types</option>
            <option value="transit_personal">Transits personnels</option>
            <option value="sky_event">Événements du ciel</option>
            <option value="daily_reminder">Rappels quotidiens</option>
          </select>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Date</th><th style={th}>Type</th><th style={th}>Titre</th><th style={th}>Corps</th><th style={th}>Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {logs?.items.map((l) => (
              <tr key={l.id}>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(l.sentAt)}</td>
                <td style={td}>{TYPE_LABELS[l.type] ?? l.type}</td>
                <td style={{ ...td, color: 'var(--text-col)' }}>{l.title}</td>
                <td style={td}>{l.body}</td>
                <td style={td}>{l.userEmail ?? '—'}</td>
              </tr>
            ))}
            {logs && logs.items.length === 0 && (
              <tr><td style={td} colSpan={5}>Aucun envoi pour ce filtre.</td></tr>
            )}
          </tbody>
        </table>
        {logs && logs.total > limit && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={pageBtn}>‹ Précédent</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={pageBtn}>Suivant ›</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────
export function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('preview');

  return (
    <div>
      <h1 style={{ fontSize: 28, color: 'var(--text-col)', marginBottom: 8 }}>Notifications</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Prévisualiser le contenu, envoyer des tests, déclencher le traitement et suivre l'historique des push.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-col)' }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'transparent', border: 'none',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === t ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t ? 600 : 400, marginBottom: -1,
          }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'preview' && <PreviewTab />}
      {tab === 'test' && <TestTab />}
      {tab === 'trigger' && <TriggerTab />}
      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 12, padding: '20px 24px' };
const chartTitle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' };
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-col)' };
const td: React.CSSProperties = { padding: '7px 8px', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' };
const inputStyle: React.CSSProperties = { padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 8, color: 'var(--text-col)', fontSize: 13, outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };
const primaryBtn: React.CSSProperties = { padding: '10px 22px', background: 'linear-gradient(135deg, #d4a853, #b8892f)', border: 'none', borderRadius: 8, color: '#0a0812', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
const smallBtn: React.CSSProperties = { padding: '4px 12px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 };
const pageBtn: React.CSSProperties = { padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 };
const preStyle: React.CSSProperties = { background: 'var(--deep)', padding: 14, borderRadius: 8, fontSize: 11, color: 'var(--muted)', overflow: 'auto', maxHeight: 280, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
const errorBox: React.CSSProperties = { padding: '12px 16px', background: 'rgba(224,143,111,0.1)', border: '1px solid rgba(224,143,111,0.3)', borderRadius: 8, color: '#e08f6f', fontSize: 13 };
const successBox: React.CSSProperties = { padding: '12px 16px', background: 'rgba(111,174,143,0.1)', border: '1px solid rgba(111,174,143,0.3)', borderRadius: 8, color: '#6fae8f', fontSize: 13 };
const infoBox: React.CSSProperties = { padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-col)', borderRadius: 8, color: 'var(--muted)', fontSize: 13 };
