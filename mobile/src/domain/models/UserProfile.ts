// Represents a user of the VolunteerHub app. A user can be both a
// requester (creating help requests) and a volunteer (responding to
// them); the rating/completedRequests fields aggregate their volunteer
// activity. Roles are mostly informational — the action matrix in
// permissions/getAvailableRequestActions.ts is the authoritative gate.

import { UserRole } from '../enums';
import { generateId, nowIso } from '../idGenerator';

export type UserProfile = {
  id: string;
  fullName: string;
  rating: number;
  completedRequests: number;
  isVerified: boolean;
  createdAt: string;
  avatarUrl?: string;
  email?: string;
  roles: UserRole[];
};

export type CreateUserProfileInput = {
  id?: string;
  fullName: string;
  rating?: number;
  completedRequests?: number;
  isVerified?: boolean;
  createdAt?: string;
  avatarUrl?: string;
  email?: string;
  roles?: UserRole[];
};

export function createUserProfile(input: CreateUserProfileInput): UserProfile {
  const roles = input.roles
    ? Array.from(new Set(input.roles))
    : ['requester' as UserRole, 'volunteer' as UserRole];
  return {
    id: input.id ?? generateId(),
    fullName: input.fullName,
    rating: input.rating ?? 0,
    completedRequests: input.completedRequests ?? 0,
    isVerified: input.isVerified ?? false,
    createdAt: input.createdAt ?? nowIso(),
    avatarUrl: input.avatarUrl,
    email: input.email,
    roles,
  };
}

export function hasRole(user: UserProfile | null | undefined, role: UserRole): boolean {
  return !!user && user.roles.includes(role);
}
