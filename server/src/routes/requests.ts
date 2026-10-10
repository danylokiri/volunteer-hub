import { randomUUID } from 'crypto';
import { Router } from 'express';
import { broadcast } from '../socket/broadcast';
import { distanceKm } from '../storage/geo';
import { loadDb, scheduleFlush } from '../storage/db';
import {
  HelpRequest,
  RegistrationStatus,
  RequestStatus,
  VolunteerResponse,
  VolunteerSlotsMode,
} from '../types';

const VALID_STATUSES: RequestStatus[] = [
  'open',
  'in_progress',
  'completion_requested',
  'completed',
  'cancelled',
];

const VALID_SLOT_MODES: VolunteerSlotsMode[] = ['limited', 'unlimited'];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRequest(r: HelpRequest): HelpRequest {
  return {
    ...r,
    acceptedVolunteerIds: r.acceptedVolunteerIds ?? [],
    volunteerSlotsMode: r.volunteerSlotsMode ?? 'unlimited',
    registrationStatus: r.registrationStatus ?? 'open',
  };
}

function applyCapacityClose(r: HelpRequest): HelpRequest {
  if (
    r.volunteerSlotsMode === 'limited' &&
    typeof r.volunteerSlots === 'number' &&
    (r.acceptedVolunteerIds ?? []).length >= r.volunteerSlots
  ) {
    return { ...r, registrationStatus: 'closed' };
  }
  return r;
}

export function requestsRouter(): Router {
  const router = Router();

  router.get('/requests', async (req, res) => {
    const db = await loadDb();
    let result = db.requests;
    const { status, category, lat, lng, radius } = req.query;
    if (typeof status === 'string') {
      result = result.filter((r) => r.status === status);
    }
    if (typeof category === 'string') {
      result = result.filter((r) => r.category === category);
    }
    if (typeof lat === 'string' && typeof lng === 'string' && typeof radius === 'string') {
      const reference = { latitude: Number(lat), longitude: Number(lng) };
      const r = Number(radius);
      if (
        !Number.isNaN(reference.latitude) &&
        !Number.isNaN(reference.longitude) &&
        !Number.isNaN(r) &&
        r > 0
      ) {
        result = result.filter(
          (req) =>
            distanceKm(
              { latitude: req.latitude, longitude: req.longitude },
              reference,
            ) <= r,
        );
      }
    }
    res.json(result);
  });

  router.get('/requests/:id', async (req, res) => {
    const db = await loadDb();
    const found = db.requests.find((r) => r.id === req.params.id);
    if (!found) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
    }
    res.json(found);
  });

  router.post('/requests', async (req, res) => {
    const db = await loadDb();
    const body = req.body ?? {};
    const required = [
      'title',
      'description',
      'category',
      'latitude',
      'longitude',
      'createdByUserId',
    ];
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        return res.status(400).json({
          error: { code: 'VALIDATION', message: `Missing field: ${f}` },
        });
      }
    }

    const slotsMode: VolunteerSlotsMode = VALID_SLOT_MODES.includes(
      body.volunteerSlotsMode,
    )
      ? body.volunteerSlotsMode
      : 'unlimited';
    let volunteerSlots: number | undefined;
    if (slotsMode === 'limited') {
      const n = Number(body.volunteerSlots);
      if (!Number.isFinite(n) || n < 1) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION',
            message: 'volunteerSlots must be >=1 when mode is limited',
          },
        });
      }
      volunteerSlots = Math.floor(n);
    }

    const created: HelpRequest = {
      id: randomUUID(),
      title: String(body.title),
      description: String(body.description),
      category: body.category,
      status: 'open',
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      city: typeof body.city === 'string' ? body.city : undefined,
      district:
        typeof body.district === 'string' ? body.district : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      locationTitle:
        typeof body.locationTitle === 'string'
          ? body.locationTitle
          : undefined,
      createdByUserId: String(body.createdByUserId),
      assignedVolunteerId: null,
      acceptedVolunteerIds: [],
      volunteerSlotsMode: slotsMode,
      volunteerSlots,
      registrationStatus: 'open',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      syncStatus: 'synced',
    };
    db.requests.unshift(created);
    scheduleFlush();
    broadcast({ type: 'request.created', payload: created });
    res.status(201).json(created);
  });

  router.post('/requests/:id/responses', async (req, res) => {
    const db = await loadDb();
    const requestId = req.params.id;
    const idx = db.requests.findIndex((r) => r.id === requestId);
    if (idx === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Request not found' },
      });
    }
    const target = normalizeRequest(db.requests[idx]);
    if (target.registrationStatus !== 'open') {
      return res.status(409).json({
        error: {
          code: 'REGISTRATION_CLOSED',
          message: 'Volunteer registration is closed for this request',
        },
      });
    }
    const body = req.body ?? {};
    if (!body.volunteerId || !body.message) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: 'volunteerId and message are required',
        },
      });
    }
    const created: VolunteerResponse = {
      id: randomUUID(),
      requestId,
      volunteerId: String(body.volunteerId),
      message: String(body.message),
      contact:
        typeof body.contact === 'string' ? body.contact : undefined,
      comment:
        typeof body.comment === 'string' ? body.comment : undefined,
      status: 'pending',
      createdAt: nowIso(),
      syncStatus: 'synced',
    };
    db.responses.unshift(created);
    scheduleFlush();
    broadcast({ type: 'response.created', payload: created });
    res.status(201).json(created);
  });

  router.patch(
    '/requests/:id/responses/:responseId/accept',
    async (req, res) => {
      const db = await loadDb();
      const idx = db.requests.findIndex((r) => r.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Request not found' },
        });
      }
      const respIdx = db.responses.findIndex(
        (r) => r.id === req.params.responseId && r.requestId === req.params.id,
      );
      if (respIdx === -1) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Response not found' },
        });
      }
      const target = db.responses[respIdx];
      if (target.status !== 'pending') {
        return res.status(409).json({
          error: {
            code: 'INVALID_STATE',
            message: `Response is already ${target.status}`,
          },
        });
      }

      const accepted: VolunteerResponse = {
        ...target,
        status: 'accepted',
        syncStatus: 'synced',
      };
      db.responses[respIdx] = accepted;

      const requestRow = normalizeRequest(db.requests[idx]);
      const acceptedIds = Array.from(
        new Set([...requestRow.acceptedVolunteerIds!, target.volunteerId]),
      );
      let updatedRequest: HelpRequest = {
        ...requestRow,
        acceptedVolunteerIds: acceptedIds,
        assignedVolunteerId:
          requestRow.assignedVolunteerId ?? acceptedIds[0] ?? null,
        status:
          requestRow.status === 'open' ? 'in_progress' : requestRow.status,
        updatedAt: nowIso(),
        syncStatus: 'synced',
      };
      updatedRequest = applyCapacityClose(updatedRequest);

      // Auto-decline siblings only when capacity-fill closed registration.
      const siblingDeclines: VolunteerResponse[] = [];
      if (
        requestRow.volunteerSlotsMode === 'limited' &&
        updatedRequest.registrationStatus === 'closed'
      ) {
        for (let i = 0; i < db.responses.length; i += 1) {
          const r = db.responses[i];
          if (
            r.requestId === requestRow.id &&
            r.id !== accepted.id &&
            r.status === 'pending'
          ) {
            const declined: VolunteerResponse = {
              ...r,
              status: 'declined',
              declineReason: 'capacity_filled',
              syncStatus: 'synced',
            };
            db.responses[i] = declined;
            siblingDeclines.push(declined);
          }
        }
      }

      db.requests[idx] = updatedRequest;
      scheduleFlush();
      broadcast({ type: 'response.accepted', payload: accepted });
      broadcast({ type: 'request.updated', payload: updatedRequest });
      for (const sibling of siblingDeclines) {
        broadcast({ type: 'response.declined', payload: sibling });
      }
      if (
        requestRow.registrationStatus !== updatedRequest.registrationStatus
      ) {
        broadcast({
          type: 'request.registration_changed',
          payload: {
            id: updatedRequest.id,
            registrationStatus:
              updatedRequest.registrationStatus ?? 'open',
          },
        });
      }
      res.json({ response: accepted, request: updatedRequest });
    },
  );

  router.patch(
    '/requests/:id/responses/:responseId/decline',
    async (req, res) => {
      const db = await loadDb();
      const respIdx = db.responses.findIndex(
        (r) => r.id === req.params.responseId && r.requestId === req.params.id,
      );
      if (respIdx === -1) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Response not found' },
        });
      }
      const declined: VolunteerResponse = {
        ...db.responses[respIdx],
        status: 'declined',
        declineReason: 'manually_declined',
        syncStatus: 'synced',
      };
      db.responses[respIdx] = declined;
      scheduleFlush();
      broadcast({ type: 'response.declined', payload: declined });
      res.json(declined);
    },
  );

  router.patch(
    '/requests/:id/responses/:responseId/withdraw',
    async (req, res) => {
      const db = await loadDb();
      const respIdx = db.responses.findIndex(
        (r) => r.id === req.params.responseId && r.requestId === req.params.id,
      );
      if (respIdx === -1) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Response not found' },
        });
      }
      const target = db.responses[respIdx];
      if (target.volunteerId !== req.body?.volunteerId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the response owner can withdraw',
          },
        });
      }
      if (target.status !== 'pending') {
        return res.status(409).json({
          error: {
            code: 'INVALID_STATE',
            message: 'Only pending responses can be withdrawn',
          },
        });
      }
      const withdrawn: VolunteerResponse = {
        ...target,
        status: 'withdrawn',
        syncStatus: 'synced',
      };
      db.responses[respIdx] = withdrawn;
      scheduleFlush();
      // No broadcast type for withdraw — clients re-read by polling list.
      res.json(withdrawn);
    },
  );

  router.patch('/requests/:id/registration', async (req, res) => {
    const db = await loadDb();
    const idx = db.requests.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Request not found' },
      });
    }
    const body = req.body ?? {};
    const next: RegistrationStatus =
      body.status === 'open' || body.status === 'closed' ? body.status : 'open';
    const declinePending = body.declinePending !== false;

    const requestRow = normalizeRequest(db.requests[idx]);
    const updatedRequest: HelpRequest = {
      ...requestRow,
      registrationStatus: next,
      updatedAt: nowIso(),
      syncStatus: 'synced',
    };
    db.requests[idx] = updatedRequest;

    const siblingDeclines: VolunteerResponse[] = [];
    if (next === 'closed' && declinePending) {
      for (let i = 0; i < db.responses.length; i += 1) {
        const r = db.responses[i];
        if (r.requestId === requestRow.id && r.status === 'pending') {
          const declined: VolunteerResponse = {
            ...r,
            status: 'declined',
            declineReason: 'registration_closed',
            syncStatus: 'synced',
          };
          db.responses[i] = declined;
          siblingDeclines.push(declined);
        }
      }
    }

    scheduleFlush();
    broadcast({
      type: 'request.registration_changed',
      payload: { id: updatedRequest.id, registrationStatus: next },
    });
    for (const sibling of siblingDeclines) {
      broadcast({ type: 'response.declined', payload: sibling });
    }
    res.json({ request: updatedRequest, declined: siblingDeclines });
  });

  router.patch('/requests/:id/status', async (req, res) => {
    const db = await loadDb();
    const idx = db.requests.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Request not found' },
      });
    }
    const body = req.body ?? {};
    if (!VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'Invalid status' },
      });
    }
    const previous = db.requests[idx];
    const updated: HelpRequest = {
      ...previous,
      status: body.status,
      assignedVolunteerId:
        body.assignedVolunteerId ?? previous.assignedVolunteerId,
      updatedAt: nowIso(),
      syncStatus: 'synced',
    };
    db.requests[idx] = updated;
    scheduleFlush();
    broadcast({
      type: 'request.status_changed',
      payload: { id: updated.id, status: updated.status },
    });
    if (
      body.status === 'completion_requested' &&
      typeof body.requestedByVolunteerId === 'string'
    ) {
      broadcast({
        type: 'request.completion_requested',
        payload: {
          id: updated.id,
          requestedByVolunteerId: body.requestedByVolunteerId,
        },
      });
    }
    if (body.status === 'completed') {
      broadcast({ type: 'request.completed', payload: updated });
    }
    res.json(updated);
  });

  return router;
}
