import { useState } from 'react';
import type { FormEvent } from 'react';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch {
      setError('Email ou mot de passe invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      background: 'var(--void)',
    }}>
      <div style={{
        width: 380,
        background: 'var(--deep)',
        border: '1px solid var(--border-col)',
        borderRadius: 16,
        padding: 40,
      }}>
        <h1 style={{ textAlign: 'center', fontSize: 32, color: 'var(--gold)', margin: '0 0 8px' }}>Lunestia</h1>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 32 }}>Administration</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="admin@lunestia.app"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(224,92,107,0.15)', border: '1px solid rgba(224,92,107,0.4)', borderRadius: 8, padding: '10px 14px', color: '#e05c6b', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)',
              border: 'none',
              borderRadius: 8,
              color: '#0d0a14',
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--surface)',
  border: '1px solid var(--border-col)',
  borderRadius: 8,
  color: 'var(--text-col)',
  fontSize: 14,
  outline: 'none',
};
