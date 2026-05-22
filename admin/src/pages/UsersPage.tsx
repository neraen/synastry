import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../api/users';
import { useDebounce } from '../hooks/useDebounce';
import type { User, PaginatedResponse } from '../types';

const PROVIDER_BADGE: Record<string, { label: string; color: string }> = {
  google: { label: 'Google', color: '#4285F4' },
  apple: { label: 'Apple', color: '#a0a0a0' },
  email: { label: 'Email', color: '#9b8ab0' },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function UsersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  useEffect(() => {
    getUsers({ page, limit: 25, search: debouncedSearch, filter, sort, order })
      .then(setData)
      .catch(console.error);
  }, [page, debouncedSearch, filter, sort, order]);

  const toggleSort = (col: string) => {
    if (sort === col) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(col); setOrder('desc'); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span style={{ color: sort === col ? 'var(--gold)' : 'var(--border-col)', marginLeft: 4, fontSize: 10 }}>
      {sort === col ? (order === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Utilisateurs</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Rechercher par email ou nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 300 }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={selectStyle}>
          <option value="all">Tous</option>
          <option value="premium">Premium</option>
          <option value="free">Gratuit</option>
        </select>
        {data && (
          <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
            {data.total} utilisateur{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-col)' }}>
              {[
                { key: 'email', label: 'Email' },
                { key: 'name', label: 'Nom' },
                { key: 'provider', label: 'Provider' },
                { key: 'premium', label: 'Premium' },
                { key: 'created_at', label: 'Inscrit le' },
                { key: 'last_login', label: 'Dernier login' },
                { key: 'messages', label: 'Messages' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => !['provider', 'premium', 'messages'].includes(key) && toggleSort(key)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'var(--muted)',
                    fontWeight: 500,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: !['provider', 'premium', 'messages'].includes(key) ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                  {!['provider', 'premium', 'messages'].includes(key) && <SortIcon col={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.data.map((user) => {
              const pb = PROVIDER_BADGE[user.authProvider] ?? PROVIDER_BADGE.email;
              return (
                <tr
                  key={user.id}
                  onClick={() => navigate(`/users/${user.id}`)}
                  style={{ borderBottom: '1px solid rgba(61,47,90,0.4)', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,168,83,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={tdStyle}>{user.email}</td>
                  <td style={{ ...tdStyle, color: user.displayName ? 'var(--text-col)' : 'var(--muted)' }}>
                    {user.displayName ?? '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: pb.color + '22', color: pb.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                      {pb.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {user.isPremium ? (
                      <span style={{ background: 'rgba(212,168,83,0.15)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Premium</span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>Gratuit</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{fmtDate(user.createdAt)}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{fmtDate(user.lastLoginAt)}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{user.lyraMessageCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.total > 25 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Précédent</button>
          <span style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
            Page {page} / {Math.ceil(data.total / 25)}
          </span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / 25)} style={pageBtn}>Suivant →</button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 8,
  color: 'var(--text-col)',
  fontSize: 13,
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const tdStyle: React.CSSProperties = {
  padding: '11px 16px',
  color: 'var(--text-col)',
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
