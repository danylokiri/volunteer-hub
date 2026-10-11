import { createHelpRequest } from '../../domain/models/HelpRequest';

describe('createHelpRequest', () => {
  it('A1: returns object with all required fields and default syncStatus="pending"', () => {
    const r = createHelpRequest({
      title: 'Вигуляти собаку',
      description: 'опис',
      category: 'pets',
      latitude: 50.45,
      longitude: 30.52,
      createdByUserId: 'demo-user-id',
    });

    expect(r.id).toEqual(expect.any(String));
    expect(r.id.length).toBeGreaterThan(0);
    expect(r.title).toBe('Вигуляти собаку');
    expect(r.description).toBe('опис');
    expect(r.category).toBe('pets');
    expect(r.status).toBe('open');
    expect(r.latitude).toBe(50.45);
    expect(r.longitude).toBe(30.52);
    expect(r.createdByUserId).toBe('demo-user-id');
    expect(r.assignedVolunteerId).toBeNull();
    expect(typeof r.createdAt).toBe('string');
    expect(typeof r.updatedAt).toBe('string');
    expect(r.syncStatus).toBe('pending');
  });

  it('A1b: respects explicit syncStatus / status / id when provided', () => {
    const r = createHelpRequest({
      id: 'fixed-id',
      title: 't',
      description: 'd',
      category: 'shopping',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
      status: 'in_progress',
      syncStatus: 'synced',
    });
    expect(r.id).toBe('fixed-id');
    expect(r.status).toBe('in_progress');
    expect(r.syncStatus).toBe('synced');
  });
});
