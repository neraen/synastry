import { useEffect, useRef, useState } from 'react';
import { getUsers } from '../api/users';
import { runHoroscope, runCompatibility, getSandboxResults, type SandboxResult } from '../api/sandbox';
import type { User } from '../types';

type Tab = 'horoscope' | 'compatibility' | 'history';

function fmtDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function UserPicker({ value, onChange }: { value: User | null; onChange: (u: User) => void }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setOptions([]); return; }
    getUsers({ search: query, limit: 10 }).then((r) => setOptions(r.data)).catch(() => {});
  }, [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: 360 }}>
      <input
        type="text"
        placeholder={value ? `${value.email} (id: ${value.id})` : 'Rechercher un utilisateur...'}
        value={open ? query : (value ? `${value.email}` : '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={inputStyle}
      />
      {open && options.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border-col)',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {options.map((u) => (
            <div
              key={u.id}
              onClick={() => { onChange(u); setOpen(false); setQuery(''); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid var(--border-col)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,168,83,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{u.email}</span>
              {u.displayName && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{u.displayName}</span>}
              {!u.natalChartGenerated && (
                <span style={{ color: '#e87070', fontSize: 11, marginLeft: 8 }}>pas de thème natal</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultDisplay({ data }: { data: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true);

  if (!data) return null;

  // Detect if it's a structured compatibility result with sections
  const sections = data.sections as Array<{ title?: string; text?: string; content?: string }> | undefined;
  const summary = data.summary as string | undefined;
  const score = data.score as number | undefined;
  const dailyText = data.text as string | undefined;
  const dailyDate = data.date as string | undefined;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>Résultat</span>
        {score !== undefined && (
          <span style={{
            padding: '2px 10px', borderRadius: 12,
            background: 'rgba(212,168,83,0.15)', color: 'var(--gold)', fontSize: 12,
          }}>
            Score: {score}/100
          </span>
        )}
        {dailyDate && (
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{dailyDate}</span>
        )}
        <button onClick={() => setExpanded(!expanded)} style={{ ...smallBtn, marginLeft: 'auto' }}>
          {expanded ? 'Réduire' : 'Voir tout'}
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {summary && (
            <div style={sectionBox}>
              <div style={sectionTitle}>Résumé</div>
              <p style={sectionText}>{summary}</p>
            </div>
          )}

          {dailyText && (
            <div style={sectionBox}>
              <p style={sectionText}>{dailyText}</p>
            </div>
          )}

          {sections && sections.map((s, i) => (
            <div key={i} style={sectionBox}>
              {s.title && <div style={sectionTitle}>{s.title}</div>}
              <p style={sectionText}>{s.text ?? s.content ?? ''}</p>
            </div>
          ))}

          {!summary && !dailyText && !sections && (
            <pre style={{
              background: 'var(--surface)', padding: 16, borderRadius: 8,
              fontSize: 11, color: 'var(--muted)', overflow: 'auto', maxHeight: 400,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function HoroscopeTab() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function handleRun() {
    if (!user) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await runHoroscope({ userId: user.id });
      setResult(res.result);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
        Génère l'horoscope du jour pour un utilisateur via le prompt réel de l'app.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle}>Utilisateur</label>
          <UserPicker value={user} onChange={setUser} />
        </div>
        <button onClick={handleRun} disabled={!user || loading} style={primaryBtn}>
          {loading ? 'Génération...' : 'Générer l\'horoscope'}
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}
      {result && <ResultDisplay data={result} />}
    </div>
  );
}

interface CityResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezoneName: string;
  admin1?: string;
  admin2?: string;
  postcode?: string;
}

async function searchCities(query: string): Promise<CityResult[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=fr&format=json`
    );
    const data = await res.json();
    if (!data.results) return [];
    return data.results.map((r: {
      name: string;
      country: string;
      latitude: number;
      longitude: number;
      timezone: string;
      admin1?: string;
      admin2?: string;
      postcodes?: string[];
    }) => ({
      name: r.name,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
      timezoneName: r.timezone,
      admin1: r.admin1,
      admin2: r.admin2,
      postcode: r.postcodes && r.postcodes.length > 0 ? r.postcodes[0] : undefined,
    }));
  } catch {
    return [];
  }
}

function getTimezoneOffset(timezoneName: string, dateString?: string): number {
  try {
    const date = dateString ? new Date(`${dateString}T12:00:00`) : new Date();
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezoneName }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  } catch {
    return 0;
  }
}

function getCityContext(city: CityResult) {
  const parts = [];
  if (city.postcode) parts.push(city.postcode);
  if (city.admin2) parts.push(city.admin2);
  if (city.admin1 && city.admin1 !== city.admin2) parts.push(city.admin1);
  if (city.country) parts.push(city.country);
  return parts.length > 0 ? parts.join(', ') : city.country;
}

function CityPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (city: CityResult) => void;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleChange(q: string) {
    setQuery(q);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setOptions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchCities(q);
      setOptions(results);
      setSearching(false);
    }, 300);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          style={inputStyle}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          placeholder="Paris, France..."
          autoComplete="off"
        />
        {searching && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 11 }}>
            ...
          </span>
        )}
      </div>
      {open && options.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--border-col)',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {options.map((city, i) => (
            <div
              key={`${city.name}-${city.latitude}-${i}`}
              onClick={() => { onSelect(city); setOpen(false); setOptions([]); }}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: i < options.length - 1 ? '1px solid var(--border-col)' : 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,168,83,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 13, color: 'var(--text-col)', fontWeight: 600 }}>{city.name}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{getCityContext(city)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompatibilityTab() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    partnerName: '',
    birthDate: '',
    birthTime: '12:00',
    birthCity: '',
    latitude: 0,
    longitude: 0,
    timezone: 0,
    timezoneName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  function handleCitySelect(city: CityResult) {
    const tz = getTimezoneOffset(city.timezoneName, form.birthDate || undefined);
    setForm((f) => ({
      ...f,
      birthCity: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: tz,
      timezoneName: city.timezoneName,
    }));
  }

  async function handleRun() {
    if (!user) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await runCompatibility({
        userId: user.id,
        partnerName: form.partnerName,
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        birthCity: form.birthCity,
        latitude: form.latitude,
        longitude: form.longitude,
        timezone: form.timezone,
        timezoneName: form.timezoneName,
      });
      setResult(res.result);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = user && form.partnerName && form.birthDate && form.birthCity && !loading;

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
        Lance une analyse de compatibilité synastrique avec les prompts réels de l'app.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 760 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Utilisateur (personne 1)</label>
          <UserPicker value={user} onChange={setUser} />
        </div>

        <div>
          <label style={labelStyle}>Prénom du partenaire *</label>
          <input style={inputStyle} value={form.partnerName} onChange={(e) => setForm((f) => ({ ...f, partnerName: e.target.value }))} placeholder="Marie" />
        </div>

        <div>
          <label style={labelStyle}>Date de naissance *</label>
          <input style={inputStyle} type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        </div>

        <div>
          <label style={labelStyle}>Heure de naissance</label>
          <input style={inputStyle} type="time" value={form.birthTime} onChange={(e) => setForm((f) => ({ ...f, birthTime: e.target.value }))} />
        </div>

        <div>
          <label style={labelStyle}>Ville de naissance *</label>
          <CityPicker value={form.birthCity} onSelect={handleCitySelect} />
          {form.birthCity && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)} · {form.timezoneName}
            </div>
          )}
        </div>
      </div>

      <button onClick={handleRun} disabled={!canSubmit} style={{ ...primaryBtn, marginTop: 20 }}>
        {loading ? 'Analyse en cours...' : 'Lancer la compatibilité'}
      </button>

      {error && <div style={errorBox}>{error}</div>}
      {result && <ResultDisplay data={result} />}
    </div>
  );
}

function HistoryTab() {
  const [data, setData] = useState<{ data: SandboxResult[]; total: number; page: number; limit: number } | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getSandboxResults({ page, type: typeFilter || undefined })
      .then(setData)
      .catch(console.error);
  }, [page, typeFilter]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 180 }}
        >
          <option value="">Tous les types</option>
          <option value="horoscope">Horoscope</option>
          <option value="compatibility">Compatibilité</option>
        </select>
        {data && (
          <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 'auto' }}>
            {data.total} résultat{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data?.data.map((item) => (
          <div
            key={item.id}
            style={{ background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{
                  padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: item.type === 'horoscope' ? 'rgba(120,100,200,0.2)' : 'rgba(212,168,83,0.15)',
                  color: item.type === 'horoscope' ? '#a090e0' : 'var(--gold)',
                }}>
                  {item.type === 'horoscope' ? 'Horoscope' : 'Compatibilité'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-col)' }}>{item.userEmail}</span>
                {item.type === 'compatibility' && item.inputData?.partnerName && (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    + {String(item.inputData.partnerName)}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {fmtDate(item.createdAt)}
              </span>
            </div>

            {expanded === item.id && item.outputData && (
              <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                <ResultDisplay data={item.outputData} />
              </div>
            )}
          </div>
        ))}
      </div>

      {data && data.total > data.limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Précédent</button>
          <span style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
            Page {page} / {Math.ceil(data.total / data.limit)}
          </span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / data.limit)} style={pageBtn}>Suivant →</button>
        </div>
      )}
    </div>
  );
}

export function SandboxPage() {
  const [tab, setTab] = useState<Tab>('horoscope');

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Sandbox</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Testez les prompts de l'app en conditions réelles et stockez les résultats.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-col)', paddingBottom: 0 }}>
        {(['horoscope', 'compatibility', 'history'] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = {
            horoscope: 'Horoscope',
            compatibility: 'Compatibilité',
            history: 'Historique',
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                color: tab === t ? 'var(--gold)' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tab === t ? 600 : 400,
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === 'horoscope' && <HoroscopeTab />}
      {tab === 'compatibility' && <CompatibilityTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}

// Styles
const inputStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 8,
  color: 'var(--text-col)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
};

const primaryBtn: React.CSSProperties = {
  padding: '10px 22px',
  background: 'linear-gradient(135deg, #d4a853, #b8892f)',
  border: 'none',
  borderRadius: 8,
  color: '#0a0812',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const smallBtn: React.CSSProperties = {
  padding: '4px 12px',
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 6,
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: 12,
};

const pageBtn: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 6,
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: 12,
};

const errorBox: React.CSSProperties = {
  marginTop: 16,
  padding: '10px 14px',
  background: 'rgba(232,112,112,0.12)',
  border: '1px solid rgba(232,112,112,0.3)',
  borderRadius: 8,
  color: '#e87070',
  fontSize: 13,
};

const sectionBox: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 10,
  padding: '14px 16px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--gold)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 8,
};

const sectionText: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-col)',
  lineHeight: 1.7,
  margin: 0,
};
