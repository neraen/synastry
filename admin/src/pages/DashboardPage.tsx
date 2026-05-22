import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats, getSignupStats, getLyraUsageStats, getProviderStats } from '../api/stats';
import type { DashboardStats, TimeSeriesPoint } from '../types';

const PROVIDER_COLORS = ['#4285F4', '#000000', '#d4a853'];

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-col)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: 'EB Garamond, serif', color: 'var(--text-col)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [signups, setSignups] = useState<TimeSeriesPoint[]>([]);
  const [lyraUsage, setLyraUsage] = useState<TimeSeriesPoint[]>([]);
  const [providers, setProviders] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.error);
    getSignupStats('30d').then((r) => setSignups(r.data)).catch(console.error);
    getLyraUsageStats('30d').then((r) => setLyraUsage(r.data)).catch(console.error);
    getProviderStats().then((r) => setProviders(r.data)).catch(console.error);
  }, []);

  if (!stats) {
    return <div style={{ color: 'var(--muted)', padding: 40 }}>Chargement...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, color: 'var(--text-col)', marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>Vue d'ensemble de Lunestia</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard label="Utilisateurs" value={stats.totalUsers} sub={`+${stats.signupsThisWeek} cette semaine`} />
        <KpiCard label="Premium" value={stats.premiumUsers} sub={`${stats.conversionRate}% de conversion`} />
        <KpiCard label="Messages Lyra (today)" value={stats.signupsToday} sub={`Total: ${stats.totalLyraMessages}`} />
        <KpiCard label="MRR estimé" value={`${stats.mrr.toFixed(2)} €`} sub={`${stats.premiumUsers} × 7,99 €`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={chartCard}>
          <div style={chartTitle}>Inscriptions — 30 derniers jours</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={signups}>
              <defs>
                <linearGradient id="sgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d4a853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#221830', border: '1px solid #3d2f5a', borderRadius: 8, color: '#e8e0f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="value" stroke="#d4a853" fill="url(#sgGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={chartCard}>
          <div style={chartTitle}>Providers</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={providers} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {providers.map((_, i) => (
                  <Cell key={i} fill={PROVIDER_COLORS[i % PROVIDER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#221830', border: '1px solid #3d2f5a', borderRadius: 8, color: '#e8e0f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={chartCard}>
        <div style={chartTitle}>Utilisation Lyra — 30 derniers jours</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={lyraUsage}>
            <XAxis dataKey="date" tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: '#9b8ab0', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#221830', border: '1px solid #3d2f5a', borderRadius: 8, color: '#e8e0f0', fontSize: 12 }} />
            <Bar dataKey="value" fill="#d4a853" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const chartCard: React.CSSProperties = {
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
