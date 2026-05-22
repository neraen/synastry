import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1, background: 'var(--void)', overflowY: 'auto', padding: 32 }}>
        <Outlet />
      </main>
    </div>
  );
}
