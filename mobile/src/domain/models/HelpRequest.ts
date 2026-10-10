// Represents a local help request (e.g. "потрібно вигуляти собаку").
// Created by one user and optionally accepted by one or more volunteers.
//
// Volunteer-capacity model (course-scope):
//  - volunteerSlotsMode = 'unlimited' (default) — creator may keep
//    accepting volunteers until they manually close registration.
//  - volunteerSlotsMode = 'limited' — creator declares volunteerSlots
//    up-front; once acceptedVolunteerIds.length === volunteerSlots, the
//    server flips registrationStatus to 'closed' and auto-declines any
//    remaining pending responses.
//
// syncStatus tracks the offline-first lifecycle: a freshly created
// request is "pending" until the API confirms it ("synced") or the
// network fails ("error"). Records that originate from the server are
// inserted with "synced" right away.

import {
  HelpCategory,
  RegistrationStatus,
  RequestStatus,
  SyncStatus,
  VolunteerSlotsMode,
} from '../enums';
import { generateId, nowIso } from '../idGenerator';

export type HelpRequest = {
  id: string;
  title: string;
  description: string;
  category: HelpCategory;
  status: RequestStatus;
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  address?: string;
  locationTitle?: string;
  createdByUserId: string;
  assignedVolunteerId?: string | null;
  acceptedVolunteerIds: string[];
  volunteerSlotsMode: VolunteerSlotsMode;
  volunteerSlots?: number;
  registrationStatus: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type CreateHelpRequestInput = {
  id?: string;
  title: string;
  description: string;
  category: HelpCategory;
  status?: RequestStatus;
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  address?: string;
  locationTitle?: string;
  createdByUserId: string;
  assignedVolunteerId?: string | null;
  acceptedVolunteerIds?: string[];
  volunteerSlotsMode?: VolunteerSlotsMode;
  volunteerSlots?: number;
  registrationStatus?: RegistrationStatus;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: SyncStatus;
};

export function createHelpRequest(
  input: CreateHelpRequestInput,
): HelpRequest {
  const now = nowIso();
  const slotsMode: VolunteerSlotsMode = input.volunteerSlotsMode ?? 'unlimited';
  const accepted = input.acceptedVolunteerIds
    ? Array.from(new Set(input.acceptedVolunteerIds))
    : [];
  // For 'limited' mode without an explicit count, fall back to 1 so the
  // shape is always self-consistent (test uses this default).
  const slots =
    slotsMode === 'limited'
      ? input.volunteerSlots ?? Math.max(1, accepted.length)
      : input.volunteerSlots;
  const registration: RegistrationStatus = (() => {
    if (input.registrationStatus) return input.registrationStatus;
    if (
      slotsMode === 'limited' &&
      typeof slots === 'number' &&
      accepted.length >= slots
    ) {
      return 'closed';
    }
    return 'open';
  })();

  return {
    id: input.id ?? generateId(),
    title: input.title,
    description: input.description,
    category: input.category,
    status: input.status ?? 'open',
    latitude: input.latitude,
    longitude: input.longitude,
    city: input.city,
    district: input.district,
    address: input.address,
    locationTitle: input.locationTitle,
    createdByUserId: input.createdByUserId,
    assignedVolunteerId:
      input.assignedVolunteerId ??
      (accepted.length > 0 ? accepted[0] : null),
    acceptedVolunteerIds: accepted,
    volunteerSlotsMode: slotsMode,
    volunteerSlots: slots,
    registrationStatus: registration,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    syncStatus: input.syncStatus ?? 'pending',
  };
}
