import { useEffect, useState } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getCostSummary, getCostByUser, type CostSummary, type CostUser } from '../api/cost';

const TYPE_COLORS = ['#d4a853', '#a090e0', '#6fae8f', '#e08f6f', '#6f9ce0', '#d46f9c', '#b8b06f', '#8f6fd4'];

function usd(n: number) {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: 'EB Garamond, serif', color: 'var(--text-col)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const PERIODS: Record<string, number> = { '7j': 7, '30j': 30, '90j': 90 };

export function CostDashboardPage() {
  const [period, setPeriod] = useState<string>('30j');
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [users, setUsers] = useState<CostUser[]>([]);

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - PERIODS[period]);
    const params = { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    getCostSummary(params).then(setSummary).catch(console.error);
    getCostByUser({ ...params, limit: 15 }).then((r) => setUsers(r.data)).catch(console.error);
  }, [period]);

  if (!summary) {
    return <div style={{ color: 'var(--muted)', padding: 40 }}>Chargement...</div>;
  }

  const t = summary.totals;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, color: 'var(--text-col)' }}>Coûts LLM</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.keys(PERIODS).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                background: period === p ? 'rgba(212,168,83,0.15)' : 'var(--surface)',
                border: '1px solid var(--border-col)',
                color: period === p ? 'var(--gold)' : 'var(--muted)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>
        Tokens et coût estimé des appels LLM — du {summary.from} au {summary.to}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard label="Coût total" value={usd(t.costUsd)} sub={`${t.calls} appels`} />
        <KpiCard label="Tokens entrée" value={fmtTokens(t.inputTokens)} sub={`dont ${fmtTokens(t.cacheReadTokens)} en cache`} />
        <KpiCard label="Tokens sortie" value={fmtTokens(t.outputTokens)} />
        <KpiCard label="Coût / appel" value={usd(t.calls ? t.costUsd / t.calls : 0)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <div style={chartTitle}>Coût quotidien</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={summary.dailySeries}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d4a853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [usd(v), 'Coût']}
              />
              <Area type="monotone" dataKey="costUsd" stroke="#d4a853" fill="url(#costGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={chartTitle}>Coût par type</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={summary.byType.map((g) => ({ name: g.key, value: Number(g.costUsd.toFixed(6)) }))}
                cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}
              >
                {summary.byType.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => usd(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={card}>
          <div style={chartTitle}>Détail par type de génération</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: 'right' }}>Appels</th>
                <th style={{ ...th, textAlign: 'right' }}>Tokens</th>
                <th style={{ ...th, textAlign: 'right' }}>Coût</th>
              </tr>
            </thead>
            <tbody>
              {summary.byType.map((g) => (
                <tr key={g.key}>
                  <td style={td}>{g.key}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{g.calls}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtTokens(g.inputTokens + g.outputTokens)}</td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--gold)' }}>{usd(g.costUsd)}</td>
                </tr>
              ))}
              {summary.byType.length === 0 && (
                <tr><td style={td} colSpan={4}>Aucune donnée sur la période.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <div style={chartTitle}>Top utilisateurs par coût</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Utilisateur</th>
                <th style={{ ...th, textAlign: 'right' }}>Appels</th>
                <th style={{ ...th, textAlign: 'right' }}>Coût</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId}>
                  <td style={{ ...td, color: 'var(--text-col)' }}>{u.email}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{u.calls}</td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--gold)' }}>{usd(u.costUsd)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td style={td} colSpan={3}>Aucune donnée sur la période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 12,
  padding: '20px 24px',
};

const chartTitle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--muted)',
  marginBottom: 16,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const tooltipStyle: React.CSSProperties = {
  background: '#221830', border: '1px solid #3d2f5a', borderRadius: 8, color: '#e8e0f0', fontSize: 12,
};

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };

const th: React.CSSProperties = {
  textAlign: 'left', padding: '6px 8px', color: 'var(--muted)', fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-col)',
};

const td: React.CSSProperties = {
  padding: '7px 8px', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)',
};
