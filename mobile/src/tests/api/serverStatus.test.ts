import { ServerStatusService } from '../../data/api/ServerStatusService';
import { MockApiService } from '../../data/api/MockApiService';

describe('Phase 10 — ServerStatusService', () => {
  it('SS1: ping returns online=true and a numeric latency on success', async () => {
    const api = new MockApiService();
    const svc = new ServerStatusService(api);
    const snap = await svc.ping();
    expect(snap.online).toBe(true);
    expect(snap.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof snap.ts).toBe('string');
  });

  it('SS2: ping returns online=false with an error message on failure', async () => {
    const api = new MockApiService({ failOn: new Set(['health']) });
    const svc = new ServerStatusService(api);
    const snap = await svc.ping();
    expect(snap.online).toBe(false);
    expect(snap.errorMessage).toMatch(/Mock failure/);
  });
});
