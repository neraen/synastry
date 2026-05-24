import { useEffect, useState } from 'react';
import { getChatLogs, type ChatLog } from '../api/chatLogs';
import { useDebounce } from '../hooks/useDebounce';
import type { PaginatedResponse } from '../types';

function fmtDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function ChatLogsPage() {
  const [data, setData] = useState<PaginatedResponse<ChatLog> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  useEffect(() => {
    getChatLogs({ page, limit: 50, search: debouncedSearch })
      .then(setData)
      .catch(console.error);
  }, [page, debouncedSearch]);

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Logs de conversations</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Tous les échanges Lyra — non sauvegardés inclus
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Rechercher par email ou message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        {data && (
          <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
            {data.total} échange{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data?.data.map((log) => (
          <div
            key={log.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-col)',
              borderRadius: 10,
              padding: '14px 16px',
              cursor: 'pointer',
            }}
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
                    {log.userEmail}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {log.messageCount} msg{log.messageCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-col)', marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)', marginRight: 6 }}>User:</span>
                  {expanded === log.id ? log.userMessage : truncate(log.userMessage)}
                </div>
                {log.assistantResponse && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    <span style={{ marginRight: 6 }}>Lyra:</span>
                    {expanded === log.id ? log.assistantResponse : truncate(log.assistantResponse)}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {fmtDate(log.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {data && data.total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Précédent</button>
          <span style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>
            Page {page} / {Math.ceil(data.total / 50)}
          </span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / 50)} style={pageBtn}>Suivant →</button>
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
  width: 320,
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
