import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicUser } from '@jovo/shared';

type Locale = 'uz' | 'ru' | 'en';
type Theme = 'light' | 'dark';
export type AccountSession = { accessToken: string; user: PublicUser };

type AppState = {
  accessToken: string | null;
  user: PublicUser | null;
  accounts: AccountSession[];
  locale: Locale;
  theme: Theme;
  setSession: (accessToken: string, user: PublicUser) => void;
  switchAccount: (userId: string) => void;
  clearSession: () => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      accounts: [],
      locale: 'uz',
      theme: 'light',
      setSession: (accessToken, user) => set((state) => ({
        accessToken,
        user,
        accounts: [...state.accounts.filter((account) => account.user.id !== user.id), { accessToken, user }],
      })),
      switchAccount: (userId) => set((state) => {
        const account = state.accounts.find((item) => item.user.id === userId);
        return account ? { accessToken: account.accessToken, user: account.user } : {};
      }),
      clearSession: () => set((state) => {
        const accounts = state.accounts.filter((account) => account.user.id !== state.user?.id);
        const next = accounts[0];
        return {
          accounts,
          accessToken: next?.accessToken ?? null,
          user: next?.user ?? null,
        };
      }),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme;
        set({ theme });
      },
    }),
    { name: 'jovo-preferences' },
  ),
);
