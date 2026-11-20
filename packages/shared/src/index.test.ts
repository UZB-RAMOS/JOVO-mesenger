import { describe, expect, it } from 'vitest';
import { editMessageSchema, messageContentSchema, messageReactionSchema, registerSchema, usernameSchema, uzPhoneSchema, phoneRegisterSchema } from './index';

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

  it('accepts valid +998 phone numbers and strips separators', () => {
    expect(uzPhoneSchema.parse('+998 90 123 45 67')).toBe('+998901234567');
    expect(uzPhoneSchema.parse('+998(90)123-45-67')).toBe('+998901234567');
    expect(phoneRegisterSchema.parse({ phone: '+998901234567', username: 'Aziz_01', displayName: 'Aziz' }).username).toBe('aziz_01');
  });

  it('rejects non-+998 and malformed phone numbers', () => {
    expect(uzPhoneSchema.safeParse('+79001234567').success).toBe(false); // wrong country code
    expect(uzPhoneSchema.safeParse('+99890123456').success).toBe(false); // 8 digits
    expect(uzPhoneSchema.safeParse('998901234567').success).toBe(false); // missing +
    expect(uzPhoneSchema.safeParse('+9989012345678').success).toBe(false); // 10 digits
  });
});
