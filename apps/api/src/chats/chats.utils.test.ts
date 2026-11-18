import { describe, expect, it } from 'vitest';
import { canonicalDirectKey } from './chats.utils';

describe('canonicalDirectKey', () => {
  it('returns the same key regardless of participant order', () => {
    expect(canonicalDirectKey('b-user', 'a-user')).toBe('a-user:b-user');
    expect(canonicalDirectKey('a-user', 'b-user')).toBe('a-user:b-user');
  });

  it('rejects self conversations', () => {
    expect(() => canonicalDirectKey('same', 'same')).toThrow();
  });
});
