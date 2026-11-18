export function canonicalDirectKey(firstUserId: string, secondUserId: string) {
  if (firstUserId === secondUserId) throw new Error('Direct chat requires two different users');
  return [firstUserId, secondUserId].sort().join(':');
}
