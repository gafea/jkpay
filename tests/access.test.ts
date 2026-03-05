import { describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('isOwnerEmail', () => {
  it('matches owner email case-insensitively', async () => {
    process.env.OWNER = 'Owner@Test.com';
    const { isOwnerEmail } = await import('@/lib/access');
    expect(isOwnerEmail('owner@test.com')).toBe(true);
  });

  it('returns false for other emails', async () => {
    process.env.OWNER = 'owner@test.com';
    const { isOwnerEmail } = await import('@/lib/access');
    expect(isOwnerEmail('user@test.com')).toBe(false);
  });
});
