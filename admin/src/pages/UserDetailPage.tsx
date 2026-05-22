import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUser, togglePremium, deleteUser } from '../api/users';
import type { UserDetail } from '../types';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (id) getUser(Number(id)).then(setUser).catch(console.error);
  }, [id]);

  if (!user) return <div style={{ color: 'var(--muted)', padding: 40 }}>Chargement...</div>;

  const handleTogglePremium = async (activate: boolean) => {
    setPremiumLoading(true);
    try {
      await togglePremium(user.id, activate, expiresAt || undefined);
      setUser((u) => u ? { ...u, isPremium: activate } : u);
      setShowPremiumDialog(false);
      setExpiresAt('');
    } catch (e) {
      console.error(e);
    } finally {
      setPremiumLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== user.email) return;
    try {
      await deleteUser(user.id);
      navigate('/users');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/users" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}>← Utilisateurs</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--gold)' }}>
          {(user.displayName ?? user.email)[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>{user.displayName ?? user.email}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>{user.email}</p>
        </div>
        {user.isPremium && (
          <span style={{ marginLeft: 'auto', background: 'rgba(212,168,83,0.15)', color: 'var(--gold)', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            Premium
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Section title="Profil">
          <Row label="Provider" value={user.authProvider} />
          <Row label="Inscrit le" value={fmtDate(user.createdAt)} />
          <Row label="Dernier login" value={fmtDate(user.lastLoginAt)} />
          <Row label="RevenueCat ID" value={user.revenuecatId ?? '—'} />
          <Row label="Messages Lyra" value={String(user.lyraMessageCount)} />
        </Section>

        <Section title="Thème natal">
          {user.natalChartGenerated ? (
            <>
              <Row label="Date de naissance" value={user.birthDate ?? '—'} />
              <Row label="Lieu" value={user.birthPlace ?? '—'} />
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Non renseigné</p>
          )}
        </Section>
      </div>

      <Section title="Accès Premium" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: user.isPremium ? 'var(--gold)' : 'var(--muted)', fontSize: 14 }}>
            {user.isPremium ? `Actif${user.premiumExpiresAt ? ` — expire le ${fmtDate(user.premiumExpiresAt)}` : ' (permanent)'}` : 'Inactif'}
          </span>
          <button onClick={() => setShowPremiumDialog(true)} style={btnOutline}>
            {user.isPremium ? 'Révoquer' : 'Activer'}
          </button>
        </div>
        {user.revenuecatId && user.isPremium && (
          <p style={{ color: '#d4a853', fontSize: 12, marginTop: 8, opacity: 0.8 }}>
            ⚠ Cet utilisateur a peut-être un abonnement RevenueCat actif. L'override admin sera écrasé au prochain webhook.
          </p>
        )}
      </Section>

      {user.conversations.length > 0 && (
        <Section title={`Conversations Lyra (${user.conversations.length})`} style={{ marginBottom: 24 }}>
          {user.conversations.map((c) => (
            <Link key={c.id} to={`/conversations/${c.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(61,47,90,0.4)', textDecoration: 'none', color: 'var(--text-col)', fontSize: 13 }}>
              <span>{c.title || `Conversation #${c.id}`}</span>
              <span style={{ color: 'var(--muted)' }}>{c.messageCount} messages · {fmtDate(c.lastMessageAt)}</span>
            </Link>
          ))}
        </Section>
      )}

      <div style={{ borderTop: '1px solid var(--border-col)', paddingTop: 24 }}>
        <button onClick={() => setShowDeleteDialog(true)} style={{ padding: '8px 16px', background: 'rgba(224,92,107,0.1)', border: '1px solid rgba(224,92,107,0.4)', borderRadius: 8, color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}>
          Supprimer cet utilisateur
        </button>
      </div>

      {showPremiumDialog && (
        <Dialog title={user.isPremium ? 'Révoquer le premium' : 'Activer le premium'} onClose={() => setShowPremiumDialog(false)}>
          {!user.isPremium && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Date d'expiration (optionnel)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={dlgInput} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowPremiumDialog(false)} style={btnOutline}>Annuler</button>
            <button onClick={() => handleTogglePremium(!user.isPremium)} disabled={premiumLoading} style={btnGold}>
              {premiumLoading ? 'En cours...' : 'Confirmer'}
            </button>
          </div>
        </Dialog>
      )}

      {showDeleteDialog && (
        <Dialog title="Supprimer l'utilisateur" onClose={() => setShowDeleteDialog(false)}>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
            Cette action est irréversible. Saisissez <strong style={{ color: 'var(--text-col)' }}>{user.email}</strong> pour confirmer.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={user.email}
            style={{ ...dlgInput, marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowDeleteDialog(false)} style={btnOutline}>Annuler</button>
            <button onClick={handleDelete} disabled={deleteConfirm !== user.email} style={{ ...btnGold, background: deleteConfirm === user.email ? 'var(--danger)' : 'rgba(224,92,107,0.3)', color: '#fff' }}>
              Supprimer
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Section({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 12, padding: '16px 20px', ...style }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-col)' }}>{value}</span>
    </div>
  );
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--deep)', border: '1px solid var(--border-col)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const btnOutline: React.CSSProperties = { padding: '7px 14px', background: 'transparent', border: '1px solid var(--border-col)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 13 };
const btnGold: React.CSSProperties = { padding: '7px 14px', background: 'var(--gold)', border: 'none', borderRadius: 8, color: '#0d0a14', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 };
const dlgInput: React.CSSProperties = { width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 8, color: 'var(--text-col)', fontSize: 13, outline: 'none' };
