export type AuthUser = {
  userId: string;
  sessionId: string;
};

declare module 'http' {
  interface IncomingMessage {
    auth?: AuthUser;
  }
}
