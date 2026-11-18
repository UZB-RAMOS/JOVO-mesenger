import { useEffect, useState } from 'react';
import type { PublicUser } from '@jovo/shared';
import { api } from './api';
import { AuthPage } from './components/AuthPage';
import { Messenger } from './components/Messenger';
import { useAppStore } from './store';

type SessionResponse = { accessToken: string; user: PublicUser };

export function App() {
  const { accessToken, user, theme } = useAppStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    async function restore() {
      const state = useAppStore.getState();
      try {
        if (state.accessToken && state.user) {
          await api('/api/me');
          state.setSession(state.accessToken, state.user);
        } else {
          const session = await api<SessionResponse>('/api/auth/refresh', { method: 'POST' });
          if (active) state.setSession(session.accessToken, session.user);
        }
      } catch {
        if (active) state.clearSession();
      } finally {
        if (active) setBooting(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  if (booting) {
    return (
      <main className="splash" aria-label="JOVO yuklanmoqda">
        <img src="/logo.svg" alt="" />
        <div className="splash-dot" />
      </main>
    );
  }

  if (!accessToken || !user) return <AuthPage />;
  return <Messenger key={`${user.id}:${accessToken}`} />;
}
