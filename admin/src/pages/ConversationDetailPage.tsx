import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getConversationMessages } from '../api/conversations';
import type { Message } from '../types';

function fmtTime(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<{ userEmail: string; title: string; total: number } | null>(null);

  useEffect(() => {
    if (id) {
      getConversationMessages(Number(id), { limit: 200 }).then((r) => {
        setMessages(r.data);
        setMeta({ userEmail: r.userEmail, title: r.title, total: r.total });
      }).catch(console.error);
    }
  }, [id]);

  const totalTokens = messages.reduce((acc, m) => acc + (m.tokenCount ?? 0), 0);

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/conversations" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}>← Conversations</Link>
      </div>

      {meta && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>{meta.title || `Conversation #${id}`}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            {meta.userEmail} · {meta.total} messages{totalTokens > 0 ? ` · ${totalTokens.toLocaleString()} tokens` : ''}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'rgba(212,168,83,0.15)' : 'var(--surface)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(212,168,83,0.3)' : 'var(--border-col)'}`,
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--text-col)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span>{msg.role === 'user' ? 'Utilisateur' : 'Lyra'}</span>
                <span>{fmtTime(msg.createdAt)}{msg.tokenCount ? ` · ${msg.tokenCount} tok` : ''}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Aucun message</div>
      )}
    </div>
  );
}
