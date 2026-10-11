import { createUserProfile } from '../../domain/models/UserProfile';

describe('createUserProfile', () => {
  it('A2: defaults rating=0, completedRequests=0, isVerified=false', () => {
    const u = createUserProfile({ fullName: 'Олена Тест' });

    expect(u.id).toEqual(expect.any(String));
    expect(u.fullName).toBe('Олена Тест');
    expect(u.rating).toBe(0);
    expect(u.completedRequests).toBe(0);
    expect(u.isVerified).toBe(false);
    expect(typeof u.createdAt).toBe('string');
    expect(u.avatarUrl).toBeUndefined();
  });

  it('A2b: respects explicit field values', () => {
    const u = createUserProfile({
      id: 'fixed',
      fullName: 'Test',
      rating: 4.5,
      completedRequests: 10,
      isVerified: true,
      avatarUrl: 'https://example.com/a.png',
    });
    expect(u.id).toBe('fixed');
    expect(u.rating).toBe(4.5);
    expect(u.completedRequests).toBe(10);
    expect(u.isVerified).toBe(true);
    expect(u.avatarUrl).toBe('https://example.com/a.png');
  });
});
