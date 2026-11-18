import { describe, expect, it } from 'vitest';
import { editMessageSchema, messageContentSchema, messageReactionSchema, registerSchema, usernameSchema } from './index';

describe('shared validation', () => {
  it('normalizes email and username', () => {
    const value = registerSchema.parse({
      email: 'ALICE@EXAMPLE.COM',
      username: 'Alice_01',
      displayName: 'Alice',
      password: 'JOVO1234',
    });
    expect(value.email).toBe('alice@example.com');
    expect(value.username).toBe('alice_01');
  });

  it('rejects unsafe usernames and blank messages', () => {
    expect(usernameSchema.safeParse('a/b').success).toBe(false);
    expect(messageContentSchema.safeParse('   ').success).toBe(false);
  });

  it('validates message edits and emoji reactions', () => {
    expect(editMessageSchema.parse({ content: '  Yangilangan xabar  ' }).content).toBe('Yangilangan xabar');
    expect(messageReactionSchema.parse({ emoji: ' 👍 ' }).emoji).toBe('👍');
    expect(messageReactionSchema.safeParse({ emoji: '' }).success).toBe(false);
  });
});
