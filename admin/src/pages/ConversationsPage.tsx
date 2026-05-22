import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConversations } from '../api/conversations';
import type { Conversation, PaginatedResponse } from '../types';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ConversationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<Conversation> | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    getConversations({ page, limit: 25, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then(setData)
      .catch(console.error);
  }, [page, dateFrom, dateTo]);

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Conversations Lyra</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ color: 'var(--muted)', fontSize: 12 }}>Du</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ color: 'var(--muted)', fontSize: 12 }}>Au</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
            Réinitialiser
          </button>
        )}
        {data && (
          <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
            {data.total} conversation{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-col)' }}>
              {['Utilisateur', 'Titre', 'Messages', 'Premier message', 'Dernier message'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.data.map((conv) => (
              <tr
                key={conv.id}
                onClick={() => navigate(`/conversations/${conv.id}`)}
                style={{ borderBottom: '1px solid rgba(61,47,90,0.4)', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,168,83,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={tdStyle}>{conv.userEmail}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.title || '—'}
                </td>
                <td style={tdStyle}>{conv.messageCount}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)' }}>{fmtDate(conv.firstMessageAt)}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)' }}>{fmtDate(conv.lastMessageAt)}</td>
              </tr>
            ))}
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
  padding: '7px 12px',
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 8,
  color: 'var(--text-col)',
  fontSize: 13,
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  color: 'var(--muted)',
  fontWeight: 500,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
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
