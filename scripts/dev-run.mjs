/* global process */
// Runs the API + web dev servers against an already-initialized database.
// Unlike dev-bootstrap.mjs it does NOT run `prisma migrate deploy` / `db seed`,
// which hang on exit against the PGlite socket server (the CLI's pg connections
// are not closed cleanly by pglite-socket). Use `npm run dev:local` for the
// first-time setup (migrate + seed) and `npm run dev:local:run` afterwards.
import { spawn } from 'node:child_process';

const childEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'jovo-local-development-only-secret-2026',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  REFRESH_TOKEN_DAYS: process.env.REFRESH_TOKEN_DAYS ?? '30',
  DEV_SHOW_VERIFICATION_CODE: process.env.DEV_SHOW_VERIFICATION_CODE ?? 'true',
  COOKIE_SECURE: process.env.COOKIE_SECURE ?? 'false',
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  VITE_API_URL: process.env.VITE_API_URL ?? 'http://localhost:4000',
};
const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run dev:core'] : ['run', 'dev:core'];
const child = spawn(command, args, {
  env: childEnv,
  stdio: 'inherit',
});

child.once('error', (error) => {
  throw error;
});

child.once('exit', (code) => {
  process.exit(code ?? 1);
});

process.once('SIGINT', () => child.kill('SIGINT'));
process.once('SIGTERM', () => child.kill('SIGTERM'));
