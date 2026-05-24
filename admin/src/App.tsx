import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { ConversationDetailPage } from './pages/ConversationDetailPage';
import { ChatLogsPage } from './pages/ChatLogsPage';

function App() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout onLogout={logout} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/conversations/:id" element={<ConversationDetailPage />} />
          <Route path="/chat-logs" element={<ChatLogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
