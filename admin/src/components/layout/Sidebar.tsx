import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◇' },
  { to: '/users', label: 'Utilisateurs', icon: '◉' },
  { to: '/conversations', label: 'Conversations sauvées', icon: '◎' },
  { to: '/chat-logs', label: 'Logs Lyra', icon: '◐' },
  { to: '/sandbox', label: 'Sandbox', icon: '◈' },
];

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--deep)',
      borderRight: '1px solid var(--border-col)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border-col)' }}>
        <div style={{ fontFamily: 'EB Garamond, serif', fontSize: 22, color: 'var(--gold)', fontWeight: 500 }}>
          Lunestia
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Admin
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              color: isActive ? 'var(--gold)' : 'var(--muted)',
              background: isActive ? 'rgba(212,168,83,0.08)' : 'transparent',
              borderRight: isActive ? '2px solid var(--gold)' : '2px solid transparent',
              textDecoration: 'none',
              fontSize: 14,
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onLogout}
        style={{
          margin: 16,
          padding: '8px 16px',
          background: 'transparent',
          border: '1px solid var(--border-col)',
          borderRadius: 8,
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Déconnexion
      </button>
    </aside>
  );
}
