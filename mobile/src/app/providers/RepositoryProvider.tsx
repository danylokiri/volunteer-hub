// Phase 4 implementation. The provider now constructs a
// RepositoryBundle (which depends on a LocalDataSourceBundle and an
// ApiService) and subscribes to each repository's change emitter to
// keep React state in sync. Mutations call the repository, which
// handles the local-first / online-first orchestration; the provider
// itself stays thin and just rebroadcasts state.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CreateHelpRequestInput,
  HelpRequest,
} from '../../domain/models/HelpRequest';
import {
  CreateVolunteerResponseInput,
  VolunteerResponse,
} from '../../domain/models/VolunteerResponse';
import {
  CreateNotificationEventInput,
  NotificationEvent,
} from '../../domain/models/NotificationEvent';
import { UserProfile } from '../../domain/models/UserProfile';
import {
  buildSeedNotifications,
  buildSeedRequests,
  buildSeedResponses,
  buildSeedUsers,
} from '../../domain/seed/mockData';
import { RequestStatus } from '../../domain/enums';
import {
  filterNearbyRequests,
  sortByDistance,
} from '../../domain/geo/distance';
import { RequestListFilter } from '../../data/repositories/types';
import { LocalDataSourceBundle } from '../../data/local/types';
import { MapLocalDataSourceBundle } from '../../data/local/MapLocalDataSource';
import { ApiService } from '../../data/api/types';
import { MockApiService } from '../../data/api/MockApiService';
import { RepositoryBundle } from '../../data/repositories/RepositoryBundle';

type RepositoryState = {
  requests: HelpRequest[];
  responses: VolunteerResponse[];
  notifications: NotificationEvent[];
  users: UserProfile[];
};

export type RequestsHookValue = {
  requests: HelpRequest[];
  list: (filter?: RequestListFilter) => HelpRequest[];
  getById: (id: string) => HelpRequest | undefined;
  create: (input: CreateHelpRequestInput) => Promise<HelpRequest>;
  delete: (id: string) => Promise<void>;
  updateStatus: (id: string, status: RequestStatus) => Promise<HelpRequest>;
  upsertFromRemote: (r: HelpRequest) => Promise<void>;
  refreshFromApi: (params?: {
    lat?: number;
    lng?: number;
    radius?: number;
    status?: RequestStatus;
    category?: string;
  }) => Promise<{ ok: boolean }>;
  setRegistrationStatus: (
    requestId: string,
    status: 'open' | 'closed',
    declinePending?: boolean,
  ) => Promise<HelpRequest>;
  requestCompletion: (
    requestId: string,
    requestedByVolunteerId: string,
  ) => Promise<HelpRequest>;
  confirmCompletion: (requestId: string) => Promise<HelpRequest>;
};

export type ResponsesHookValue = {
  responses: VolunteerResponse[];
  listByRequest: (requestId: string) => VolunteerResponse[];
  create: (input: CreateVolunteerResponseInput) => Promise<VolunteerResponse>;
  delete: (id: string) => Promise<void>;
  upsertFromRemote: (r: VolunteerResponse) => Promise<void>;
  accept: (
    requestId: string,
    responseId: string,
  ) => Promise<{ response: VolunteerResponse; request: HelpRequest }>;
  decline: (
    requestId: string,
    responseId: string,
  ) => Promise<VolunteerResponse>;
  withdraw: (
    requestId: string,
    responseId: string,
    volunteerId: string,
  ) => Promise<VolunteerResponse>;
};

export type NotificationsHookValue = {
  notifications: NotificationEvent[];
  unreadCount: number;
  create: (input: CreateNotificationEventInput) => Promise<NotificationEvent>;
  markRead: (id: string) => Promise<void>;
  appendFromSocket: (event: NotificationEvent) => Promise<void>;
};

type RepositoryContextValue = {
  isHydrated: boolean;
  state: RepositoryState;
  requests: RequestsHookValue;
  responses: ResponsesHookValue;
  notifications: NotificationsHookValue;
  users: UserProfile[];
  getUserById: (id: string) => UserProfile | undefined;
  repos: RepositoryBundle;
};

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
  bundle?: LocalDataSourceBundle;
  apiService?: ApiService;
  initialState?: Partial<RepositoryState>;
  skipSeed?: boolean;
  /** Override automatic refreshFromApi on mount (default: false in tests). */
  refreshOnMount?: boolean;
};

function emptyState(): RepositoryState {
  return { requests: [], responses: [], notifications: [], users: [] };
}

function defaultSeedState(): RepositoryState {
  return {
    requests: buildSeedRequests(),
    responses: buildSeedResponses(),
    notifications: buildSeedNotifications(),
    users: buildSeedUsers(),
  };
}

export function RepositoryProvider({
  children,
  bundle,
  apiService,
  initialState,
  skipSeed,
  refreshOnMount = false,
}: ProviderProps) {
  // Stable instances for the lifetime of this provider.
  const localBundle = useMemo<LocalDataSourceBundle>(
    () => bundle ?? new MapLocalDataSourceBundle(),
    [bundle],
  );
  const api = useMemo<ApiService>(
    () => apiService ?? new MockApiService(),
    [apiService],
  );
  const repos = useMemo<RepositoryBundle>(
    () => new RepositoryBundle(localBundle, api),
    [localBundle, api],
  );

  const [state, setState] = useState<RepositoryState>(() => {
    if (initialState) return { ...emptyState(), ...initialState };
    return skipSeed ? emptyState() : defaultSeedState();
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Re-read state from the local bundle. Triggered both on mount and
  // every time a repository emits a change event.
  const syncFromLocal = useCallback(async () => {
    const [requests, users, notifications] = await Promise.all([
      localBundle.requests.list(),
      localBundle.users.list(),
      localBundle.notifications.list(),
    ]);
    const responseGroups = await Promise.all(
      requests.map((r) => localBundle.responses.listByRequest(r.id)),
    );
    setState({
      requests,
      users,
      notifications,
      responses: responseGroups.flat(),
    });
  }, [localBundle]);

  // Mount: initialize bundle, seed if empty, then mark hydrated.
  useEffect(() => {
    let alive = true;
    (async () => {
      await localBundle.initialize();
      const existing = await localBundle.requests.list();
      const usersExisting = await localBundle.users.list();
      const notifExisting = await localBundle.notifications.list();
      const isEmpty =
        existing.length === 0 &&
        usersExisting.length === 0 &&
        notifExisting.length === 0;

      if (isEmpty && !skipSeed && !initialState) {
        const seed = defaultSeedState();
        for (const u of seed.users) await localBundle.users.save(u);
        for (const r of seed.requests) await localBundle.requests.save(r);
        for (const r of seed.responses) await localBundle.responses.save(r);
        for (const n of seed.notifications)
          await localBundle.notifications.save(n);
      } else if (initialState) {
        if (initialState.users)
          for (const u of initialState.users) await localBundle.users.save(u);
        if (initialState.requests)
          for (const r of initialState.requests)
            await localBundle.requests.save(r);
        if (initialState.responses)
          for (const r of initialState.responses)
            await localBundle.responses.save(r);
        if (initialState.notifications)
          for (const n of initialState.notifications)
            await localBundle.notifications.save(n);
      }

      if (!alive) return;
      await syncFromLocal();
      setIsHydrated(true);

      if (refreshOnMount) {
        // Online-first refresh in background. Do not block hydration.
        repos.requests.refreshFromApi().catch(() => {});
      }
    })().catch(() => {
      if (alive) setIsHydrated(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localBundle, skipSeed, refreshOnMount]);

  // Subscribe to every repository's change events to keep state fresh.
  useEffect(() => {
    const unsubscribers = [
      repos.requests.changes.subscribe(() => {
        void syncFromLocal();
      }),
      repos.users.changes.subscribe(() => {
        void syncFromLocal();
      }),
      repos.responses.changes.subscribe(() => {
        void syncFromLocal();
      }),
      repos.notifications.changes.subscribe(() => {
        void syncFromLocal();
      }),
    ];
    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [repos, syncFromLocal]);

  // ---------- Selectors ----------
  const list = useCallback(
    (filter?: RequestListFilter): HelpRequest[] => {
      let result = state.requests;
      if (filter?.status) result = result.filter((r) => r.status === filter.status);
      if (filter?.category)
        result = result.filter((r) => r.category === filter.category);
      if (filter?.nearby) {
        result = filterNearbyRequests(
          result,
          filter.nearby.reference,
          filter.nearby.radiusKm,
        );
      }
      if (filter?.sortByDistanceFrom) {
        result = sortByDistance(result, filter.sortByDistanceFrom);
      }
      return result;
    },
    [state.requests],
  );

  const getRequestById = useCallback(
    (id: string) => state.requests.find((r) => r.id === id),
    [state.requests],
  );

  const listResponsesByRequest = useCallback(
    (requestId: string) =>
      state.responses.filter((r) => r.requestId === requestId),
    [state.responses],
  );

  const getUserById = useCallback(
    (id: string) => state.users.find((u) => u.id === id),
    [state.users],
  );

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  );

  // ---------- Bound mutators (delegate to repos) ----------
  const requestsHook = useMemo<RequestsHookValue>(
    () => ({
      requests: state.requests,
      list,
      getById: getRequestById,
      create: (input) => repos.requests.create(input),
      delete: (id) => repos.requests.delete(id),
      updateStatus: (id, status) => repos.requests.updateStatus(id, status),
      upsertFromRemote: (r) => repos.requests.upsertFromRemote(r),
      refreshFromApi: (p) => repos.requests.refreshFromApi(p),
      setRegistrationStatus: async (requestId, status, declinePending = true) => {
        const result = await repos.api.setRegistrationStatus(requestId, {
          status,
          declinePending,
        });
        await repos.requests.upsertFromRemote(result.request);
        for (const declined of result.declined) {
          await repos.responses.upsertFromRemote(declined);
        }
        return result.request;
      },
      requestCompletion: async (requestId, requestedByVolunteerId) => {
        const updated = await repos.api.patchStatus(requestId, {
          status: 'completion_requested',
          requestedByVolunteerId,
        });
        await repos.requests.upsertFromRemote(updated);
        return updated;
      },
      confirmCompletion: async (requestId) => {
        const updated = await repos.api.patchStatus(requestId, {
          status: 'completed',
        });
        await repos.requests.upsertFromRemote(updated);
        return updated;
      },
    }),
    [state.requests, list, getRequestById, repos],
  );

  const responsesHook = useMemo<ResponsesHookValue>(
    () => ({
      responses: state.responses,
      listByRequest: listResponsesByRequest,
      create: (input) => repos.responses.create(input),
      delete: (id) => repos.responses.delete(id),
      upsertFromRemote: (r) => repos.responses.upsertFromRemote(r),
      accept: async (requestId, responseId) => {
        const result = await repos.api.acceptResponse(requestId, responseId);
        await repos.requests.upsertFromRemote(result.request);
        await repos.responses.upsertFromRemote(result.response);
        // Sync locally any siblings that may have flipped to declined.
        const siblings = await repos.local.responses.listByRequest(requestId);
        for (const sibling of siblings) {
          if (sibling.id !== result.response.id && sibling.status === 'pending') {
            // Re-fetch from API isn't available here without listing all
            // responses; we rely on the broadcast loop to update them.
          }
        }
        return result;
      },
      decline: async (requestId, responseId) => {
        const declined = await repos.api.declineResponse(requestId, responseId);
        await repos.responses.upsertFromRemote(declined);
        return declined;
      },
      withdraw: async (requestId, responseId, volunteerId) => {
        const withdrawn = await repos.api.withdrawResponse(
          requestId,
          responseId,
          volunteerId,
        );
        await repos.responses.upsertFromRemote(withdrawn);
        return withdrawn;
      },
    }),
    [state.responses, listResponsesByRequest, repos],
  );

  const notificationsHook = useMemo<NotificationsHookValue>(
    () => ({
      notifications: state.notifications,
      unreadCount,
      create: (input) => repos.notifications.create(input),
      markRead: (id) => repos.notifications.markRead(id),
      appendFromSocket: (event) =>
        repos.notifications.appendFromSocket(event),
    }),
    [state.notifications, unreadCount, repos.notifications],
  );

  const value = useMemo<RepositoryContextValue>(
    () => ({
      isHydrated,
      state,
      requests: requestsHook,
      responses: responsesHook,
      notifications: notificationsHook,
      users: state.users,
      getUserById,
      repos,
    }),
    [
      isHydrated,
      state,
      requestsHook,
      responsesHook,
      notificationsHook,
      getUserById,
      repos,
    ],
  );

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

function useRepositoryContext(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error('Repository hook used outside RepositoryProvider');
  }
  return ctx;
}

export function useRequests(): RequestsHookValue {
  return useRepositoryContext().requests;
}

export function useResponses(): ResponsesHookValue {
  return useRepositoryContext().responses;
}

export function useNotifications(): NotificationsHookValue {
  return useRepositoryContext().notifications;
}

export function useUserProfile(id: string | null | undefined) {
  const ctx = useRepositoryContext();
  return id ? ctx.getUserById(id) : undefined;
}

export function useUsers(): UserProfile[] {
  return useRepositoryContext().users;
}

export function useRepositoryHydration(): boolean {
  return useRepositoryContext().isHydrated;
}

export function useRepositoryBundle(): RepositoryBundle {
  return useRepositoryContext().repos;
}
