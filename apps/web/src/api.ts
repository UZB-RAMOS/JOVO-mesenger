import { useAppStore } from './store';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAppStore.getState().accessToken;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(7000),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    const issueMessage = Array.isArray(body.issues) ? body.issues[0]?.message : undefined;
    throw new ApiError(issueMessage ?? message ?? 'Server bilan aloqa xatosi', response.status);
  }
  return body as T;
}
