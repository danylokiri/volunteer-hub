import { HttpApiService, DEFAULT_BASE_URL } from '../../data/api/ApiService';
import { ApiError } from '../../data/api/ApiError';

function makeFetchMock(handler: (url: string, init?: any) => Promise<any>) {
  return jest.fn(handler);
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe('Phase 4 — HttpApiService', () => {
  it('C15: listRequests builds correct query string', async () => {
    const fetchMock = makeFetchMock(async (url) => {
      expect(url).toBe(
        `${DEFAULT_BASE_URL}/requests?lat=50.45&lng=30.52&radius=2&status=open&category=pets`,
      );
      return jsonResponse([]);
    });
    const api = new HttpApiService(undefined, fetchMock);
    await api.listRequests({
      lat: 50.45,
      lng: 30.52,
      radius: 2,
      status: 'open',
      category: 'pets',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('C15b: listRequests omits undefined query params', async () => {
    const fetchMock = makeFetchMock(async (url) => {
      expect(url).toBe(`${DEFAULT_BASE_URL}/requests`);
      return jsonResponse([]);
    });
    const api = new HttpApiService(undefined, fetchMock);
    await api.listRequests();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('C16: getRequest parses HelpRequest shape', async () => {
    const fetchMock = makeFetchMock(async (url) => {
      expect(url).toBe(`${DEFAULT_BASE_URL}/requests/req-1`);
      return jsonResponse({
        id: 'req-1',
        title: 't',
        description: 'd',
        category: 'pets',
        status: 'open',
        latitude: 50,
        longitude: 30,
        createdByUserId: 'u',
        assignedVolunteerId: null,
        createdAt: 'now',
        updatedAt: 'now',
        syncStatus: 'synced',
      });
    });
    const api = new HttpApiService(undefined, fetchMock);
    const r = await api.getRequest('req-1');
    expect(r.id).toBe('req-1');
    expect(r.status).toBe('open');
  });

  it('C17: createRequest posts JSON body and parses response', async () => {
    let captured: any;
    const fetchMock = makeFetchMock(async (url, init) => {
      captured = { url, init };
      expect(url).toBe(`${DEFAULT_BASE_URL}/requests`);
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      const parsed = JSON.parse(init.body);
      expect(parsed.title).toBe('t');
      return jsonResponse({
        id: 'new-id',
        title: 't',
        description: 'd',
        category: 'pets',
        status: 'open',
        latitude: 0,
        longitude: 0,
        createdByUserId: 'u',
        createdAt: 'now',
        updatedAt: 'now',
        syncStatus: 'synced',
      });
    });
    const api = new HttpApiService(undefined, fetchMock);
    const created = await api.createRequest({
      title: 't',
      description: 'd',
      category: 'pets',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
    });
    expect(created.id).toBe('new-id');
    expect(captured).toBeDefined();
  });

  it('C18: createResponse posts {volunteerId, message}', async () => {
    const fetchMock = makeFetchMock(async (url, init) => {
      expect(url).toBe(`${DEFAULT_BASE_URL}/requests/req-1/responses`);
      const parsed = JSON.parse(init.body);
      expect(parsed.volunteerId).toBe('u');
      expect(parsed.message).toBe('hi');
      return jsonResponse({
        id: 'res-1',
        requestId: 'req-1',
        volunteerId: 'u',
        message: 'hi',
        status: 'pending',
        createdAt: 'now',
        syncStatus: 'synced',
      });
    });
    const api = new HttpApiService(undefined, fetchMock);
    const r = await api.createResponse('req-1', {
      volunteerId: 'u',
      message: 'hi',
    });
    expect(r.id).toBe('res-1');
  });

  it('C19: patchStatus issues PATCH with status field', async () => {
    const fetchMock = makeFetchMock(async (url, init) => {
      expect(url).toBe(`${DEFAULT_BASE_URL}/requests/req-1/status`);
      expect(init.method).toBe('PATCH');
      const parsed = JSON.parse(init.body);
      expect(parsed.status).toBe('completed');
      return jsonResponse({
        id: 'req-1',
        title: 't',
        description: 'd',
        category: 'pets',
        status: 'completed',
        latitude: 0,
        longitude: 0,
        createdByUserId: 'u',
        createdAt: 'now',
        updatedAt: 'now',
        syncStatus: 'synced',
      });
    });
    const api = new HttpApiService(undefined, fetchMock);
    const r = await api.patchStatus('req-1', { status: 'completed' });
    expect(r.status).toBe('completed');
  });

  it('C19b: non-2xx responses throw ApiError with code/message/status', async () => {
    const fetchMock = makeFetchMock(async () => {
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'VALIDATION', message: 'bad' } }),
      };
    });
    const api = new HttpApiService(undefined, fetchMock);
    await expect(
      api.createRequest({
        title: '',
        description: '',
        category: 'pets',
        latitude: 0,
        longitude: 0,
        createdByUserId: 'u',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
