// In-memory seed data used by Phase 1/2 stubs before the SQLite layer
// (Phase 3) and the backend-lite server (Phase 5) come online. The
// shape mirrors the server-side seed exactly so screens render the
// same data either way.
//
// Phase-12 sprint update: every request now carries human-location
// fields (city/district/address/locationTitle), and seeded users have
// roles[]. The new admin user is reserved for testing AdminScreen.

import { createHelpRequest, HelpRequest } from '../models/HelpRequest';
import {
  createNotificationEvent,
  NotificationEvent,
} from '../models/NotificationEvent';
import { createUserProfile, UserProfile } from '../models/UserProfile';
import {
  createVolunteerResponse,
  VolunteerResponse,
} from '../models/VolunteerResponse';
import { findDistrictById } from '../location/HumanLocation';

export const DEMO_USER_ID = 'demo-user-id';
export const DEMO_USER_FULL_NAME = 'Тестовий Користувач';
export const ADMIN_USER_ID = 'admin-user-id';

const POIDOL = findDistrictById('podil')!.centroid;
const PECHERSK = findDistrictById('pechersk')!.centroid;
const SHEVCHENKIVSKYI = findDistrictById('shevchenkivskyi')!.centroid;
const HOLOSIIVSKYI = findDistrictById('holosiivskyi')!.centroid;
const OBOLONSKYI = findDistrictById('obolonskyi')!.centroid;
const SOLOMIANSKYI = findDistrictById('solomianskyi')!.centroid;

export function buildSeedUsers(): UserProfile[] {
  return [
    createUserProfile({
      id: DEMO_USER_ID,
      fullName: DEMO_USER_FULL_NAME,
      rating: 4.6,
      completedRequests: 7,
      isVerified: false,
      createdAt: '2025-09-01T10:00:00.000Z',
      email: 'demo@volunteerhub.local',
      roles: ['requester', 'volunteer'],
    }),
    createUserProfile({
      id: 'olena-id',
      fullName: 'Олена Петренко',
      rating: 4.9,
      completedRequests: 24,
      isVerified: true,
      createdAt: '2024-01-12T08:30:00.000Z',
      email: 'olena@volunteerhub.local',
      roles: ['requester', 'volunteer'],
    }),
    createUserProfile({
      id: 'mykola-id',
      fullName: 'Микола Іваненко',
      rating: 4.2,
      completedRequests: 11,
      isVerified: false,
      createdAt: '2024-05-22T14:00:00.000Z',
      email: 'mykola@volunteerhub.local',
      roles: ['requester', 'volunteer'],
    }),
    createUserProfile({
      id: ADMIN_USER_ID,
      fullName: 'Адміністратор Платформи',
      rating: 5.0,
      completedRequests: 0,
      isVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      email: 'admin@volunteerhub.local',
      roles: ['requester', 'volunteer', 'admin'],
    }),
    createUserProfile({
      id: 'requester-account-id',
      fullName: 'Замовник Тестовий',
      rating: 4.5,
      completedRequests: 3,
      isVerified: false,
      createdAt: '2025-10-01T08:00:00.000Z',
      email: 'requester@volunteerhub.local',
      roles: ['requester', 'volunteer'],
    }),
    createUserProfile({
      id: 'volunteer-account-id',
      fullName: 'Волонтер Тестовий',
      rating: 4.7,
      completedRequests: 9,
      isVerified: false,
      createdAt: '2025-10-01T09:00:00.000Z',
      email: 'volunteer@volunteerhub.local',
      roles: ['requester', 'volunteer'],
    }),
  ];
}

export function buildSeedRequests(): HelpRequest[] {
  return [
    createHelpRequest({
      id: 'req-1',
      title: 'Вигуляти собаку',
      description:
        'Потрібна допомога вигуляти лабрадора 30 хвилин після обіду.',
      category: 'pets',
      status: 'open',
      latitude: POIDOL.latitude + 0.001,
      longitude: POIDOL.longitude + 0.002,
      city: 'Київ',
      district: 'Поділ',
      address: 'вул. Нижній Вал, 15',
      locationTitle: 'Київ, Поділ — вул. Нижній Вал',
      createdByUserId: 'olena-id',
      volunteerSlotsMode: 'unlimited',
      registrationStatus: 'open',
      createdAt: '2026-04-30T09:15:00.000Z',
      updatedAt: '2026-04-30T09:15:00.000Z',
      syncStatus: 'synced',
    }),
    createHelpRequest({
      id: 'req-2',
      title: 'Купити продукти',
      description:
        'Потрібна допомога принести базові продукти з найближчого магазину.',
      category: 'shopping',
      status: 'open',
      latitude: SHEVCHENKIVSKYI.latitude - 0.003,
      longitude: SHEVCHENKIVSKYI.longitude + 0.004,
      city: 'Київ',
      district: 'Шевченківський',
      address: 'вул. Володимирська, 60',
      locationTitle: 'Київ, Шевченківський — вул. Володимирська',
      createdByUserId: 'mykola-id',
      volunteerSlotsMode: 'limited',
      volunteerSlots: 1,
      registrationStatus: 'open',
      createdAt: '2026-04-30T10:00:00.000Z',
      updatedAt: '2026-04-30T10:00:00.000Z',
      syncStatus: 'synced',
    }),
    createHelpRequest({
      id: 'req-3',
      title: 'Допомога з ноутбуком',
      description: 'Не запускається Windows після оновлення.',
      category: 'tutoring',
      status: 'in_progress',
      latitude: PECHERSK.latitude + 0.008,
      longitude: PECHERSK.longitude - 0.002,
      city: 'Київ',
      district: 'Печерськ',
      address: 'вул. Інститутська, 8',
      locationTitle: 'Київ, Печерськ — вул. Інститутська',
      createdByUserId: DEMO_USER_ID,
      assignedVolunteerId: 'olena-id',
      acceptedVolunteerIds: ['olena-id'],
      volunteerSlotsMode: 'unlimited',
      registrationStatus: 'open',
      createdAt: '2026-04-29T12:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
      syncStatus: 'synced',
    }),
    createHelpRequest({
      id: 'req-4',
      title: 'Підвезти до лікарні',
      description:
        'Потрібно дістатися до Олександрівської лікарні до 14:00.',
      category: 'transport',
      status: 'open',
      latitude: SHEVCHENKIVSKYI.latitude + 0.012,
      longitude: SHEVCHENKIVSKYI.longitude + 0.011,
      city: 'Київ',
      district: 'Шевченківський',
      address: 'просп. Перемоги, 17 (Олександрівська лікарня)',
      locationTitle: 'Київ, Шевченківський — Олександрівська лікарня',
      createdByUserId: 'mykola-id',
      volunteerSlotsMode: 'limited',
      volunteerSlots: 1,
      registrationStatus: 'open',
      createdAt: '2026-04-30T11:20:00.000Z',
      updatedAt: '2026-04-30T11:20:00.000Z',
      syncStatus: 'synced',
    }),
    createHelpRequest({
      id: 'req-5',
      title: 'Принести ліки',
      description: 'Невелика аптечна закупівля.',
      category: 'medical',
      status: 'open',
      latitude: HOLOSIIVSKYI.latitude - 0.005,
      longitude: HOLOSIIVSKYI.longitude - 0.01,
      city: 'Київ',
      district: 'Голосіївський',
      address: 'вул. Васильківська, 30',
      locationTitle: 'Київ, Голосіївський — вул. Васильківська',
      createdByUserId: 'olena-id',
      volunteerSlotsMode: 'limited',
      volunteerSlots: 2,
      registrationStatus: 'open',
      createdAt: '2026-04-30T11:35:00.000Z',
      updatedAt: '2026-04-30T11:35:00.000Z',
      syncStatus: 'synced',
    }),
    createHelpRequest({
      id: 'req-6',
      title: 'Допомога з прибиранням',
      description: 'Невелика допомога з прибиранням після ремонту.',
      category: 'other',
      status: 'completed',
      latitude: OBOLONSKYI.latitude + 0.005,
      longitude: OBOLONSKYI.longitude + 0.005,
      city: 'Київ',
      district: 'Оболонський',
      address: 'просп. Героїв Сталінграда, 6',
      locationTitle: 'Київ, Оболонський — просп. Героїв Сталінграда',
      createdByUserId: DEMO_USER_ID,
      assignedVolunteerId: 'olena-id',
      acceptedVolunteerIds: ['olena-id'],
      volunteerSlotsMode: 'unlimited',
      registrationStatus: 'closed',
      createdAt: '2026-04-25T08:00:00.000Z',
      updatedAt: '2026-04-26T15:00:00.000Z',
      syncStatus: 'synced',
    }),
  ];
}

export function buildSeedResponses(): VolunteerResponse[] {
  return [
    createVolunteerResponse({
      id: 'res-1',
      requestId: 'req-1',
      volunteerId: DEMO_USER_ID,
      message: 'Можу вигуляти між 14:00 і 15:00.',
      contact: '+380501234567',
      status: 'pending',
      createdAt: '2026-04-30T09:30:00.000Z',
      syncStatus: 'synced',
    }),
    createVolunteerResponse({
      id: 'res-2',
      requestId: 'req-3',
      volunteerId: 'olena-id',
      message: 'Підключусь віддалено через AnyDesk.',
      status: 'accepted',
      createdAt: '2026-04-29T12:30:00.000Z',
      syncStatus: 'synced',
    }),
    createVolunteerResponse({
      id: 'res-3',
      requestId: 'req-2',
      volunteerId: DEMO_USER_ID,
      message: 'За годину можу занести продукти.',
      status: 'pending',
      createdAt: '2026-04-30T10:30:00.000Z',
      syncStatus: 'synced',
    }),
  ];
}

export function buildSeedNotifications(): NotificationEvent[] {
  return [
    createNotificationEvent({
      id: 'notif-1',
      type: 'response.created',
      payload: {
        requestId: 'req-1',
        volunteerId: DEMO_USER_ID,
        title: 'Вигуляти собаку',
      },
      title: 'Новий відгук на вашу заявку',
      message: 'Тестовий Користувач хоче допомогти',
      relatedRequestId: 'req-1',
      createdAt: '2026-04-30T09:30:01.000Z',
      read: false,
    }),
    createNotificationEvent({
      id: 'notif-2',
      type: 'request.status_changed',
      payload: {
        id: 'req-3',
        status: 'in_progress',
        title: 'Допомога з ноутбуком',
      },
      title: 'Статус заявки змінено',
      message: 'Допомога з ноутбуком · in_progress',
      relatedRequestId: 'req-3',
      createdAt: '2026-04-29T12:30:05.000Z',
      read: true,
    }),
  ];
}
