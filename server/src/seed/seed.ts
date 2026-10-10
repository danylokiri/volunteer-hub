// Reset-and-seed script. Runs via `npm run seed` from server/. Mirrors
// mobile/src/domain/seed/mockData.ts (intentionally duplicated --
// server is independently runnable).
//
// Phase-12 sprint update: every request carries human-location fields,
// volunteer-capacity fields, and registrationStatus. Seeded users now
// have roles[] and email; an admin account is added.

import { promises as fs } from 'fs';
import path from 'path';
import { __seedAuthRecord } from '../routes/auth';
import { Database } from '../types';

const DB_FILE = path.resolve(__dirname, '../../data/db.json');

// Centroid offsets, copied from mobile's HumanLocation catalog so server
// and client agree on which lat/lng each district maps to.
const POIDOL = { latitude: 50.4616, longitude: 30.5147 };
const PECHERSK = { latitude: 50.4286, longitude: 30.5396 };
const SHEVCHENKIVSKYI = { latitude: 50.4501, longitude: 30.5085 };
const HOLOSIIVSKYI = { latitude: 50.3849, longitude: 30.4983 };
const OBOLONSKYI = { latitude: 50.5137, longitude: 30.4986 };

function offset(
  base: { latitude: number; longitude: number },
  dLat: number,
  dLng: number,
) {
  return {
    latitude: base.latitude + dLat,
    longitude: base.longitude + dLng,
  };
}

export function buildSeed(): Database {
  return {
    users: [
      {
        id: 'demo-user-id',
        fullName: 'Тестовий Користувач',
        rating: 4.6,
        completedRequests: 7,
        isVerified: false,
        createdAt: '2025-09-01T10:00:00.000Z',
        email: 'demo@volunteerhub.local',
        roles: ['requester', 'volunteer'],
      },
      {
        id: 'olena-id',
        fullName: 'Олена Петренко',
        rating: 4.9,
        completedRequests: 24,
        isVerified: true,
        createdAt: '2024-01-12T08:30:00.000Z',
        email: 'olena@volunteerhub.local',
        roles: ['requester', 'volunteer'],
      },
      {
        id: 'mykola-id',
        fullName: 'Микола Іваненко',
        rating: 4.2,
        completedRequests: 11,
        isVerified: false,
        createdAt: '2024-05-22T14:00:00.000Z',
        email: 'mykola@volunteerhub.local',
        roles: ['requester', 'volunteer'],
      },
      {
        id: 'admin-user-id',
        fullName: 'Адміністратор Платформи',
        rating: 5.0,
        completedRequests: 0,
        isVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        email: 'admin@volunteerhub.local',
        roles: ['requester', 'volunteer', 'admin'],
      },
      {
        id: 'requester-account-id',
        fullName: 'Замовник Тестовий',
        rating: 4.5,
        completedRequests: 3,
        isVerified: false,
        createdAt: '2025-10-01T08:00:00.000Z',
        email: 'requester@volunteerhub.local',
        roles: ['requester', 'volunteer'],
      },
      {
        id: 'volunteer-account-id',
        fullName: 'Волонтер Тестовий',
        rating: 4.7,
        completedRequests: 9,
        isVerified: false,
        createdAt: '2025-10-01T09:00:00.000Z',
        email: 'volunteer@volunteerhub.local',
        roles: ['requester', 'volunteer'],
      },
    ],
    requests: [
      {
        id: 'req-1',
        title: 'Вигуляти собаку',
        description:
          'Потрібна допомога вигуляти лабрадора 30 хвилин після обіду.',
        category: 'pets',
        status: 'open',
        ...offset(POIDOL, 0.001, 0.002),
        city: 'Київ',
        district: 'Поділ',
        address: 'вул. Нижній Вал, 15',
        locationTitle: 'Київ, Поділ — вул. Нижній Вал',
        createdByUserId: 'olena-id',
        assignedVolunteerId: null,
        acceptedVolunteerIds: [],
        volunteerSlotsMode: 'unlimited',
        registrationStatus: 'open',
        createdAt: '2026-04-30T09:15:00.000Z',
        updatedAt: '2026-04-30T09:15:00.000Z',
        syncStatus: 'synced',
      },
      {
        id: 'req-2',
        title: 'Купити продукти',
        description:
          'Потрібна допомога принести базові продукти з найближчого магазину.',
        category: 'shopping',
        status: 'open',
        ...offset(SHEVCHENKIVSKYI, -0.003, 0.004),
        city: 'Київ',
        district: 'Шевченківський',
        address: 'вул. Володимирська, 60',
        locationTitle: 'Київ, Шевченківський — вул. Володимирська',
        createdByUserId: 'mykola-id',
        assignedVolunteerId: null,
        acceptedVolunteerIds: [],
        volunteerSlotsMode: 'limited',
        volunteerSlots: 1,
        registrationStatus: 'open',
        createdAt: '2026-04-30T10:00:00.000Z',
        updatedAt: '2026-04-30T10:00:00.000Z',
        syncStatus: 'synced',
      },
      {
        id: 'req-3',
        title: 'Допомога з ноутбуком',
        description: 'Не запускається Windows після оновлення.',
        category: 'tutoring',
        status: 'in_progress',
        ...offset(PECHERSK, 0.008, -0.002),
        city: 'Київ',
        district: 'Печерськ',
        address: 'вул. Інститутська, 8',
        locationTitle: 'Київ, Печерськ — вул. Інститутська',
        createdByUserId: 'demo-user-id',
        assignedVolunteerId: 'olena-id',
        acceptedVolunteerIds: ['olena-id'],
        volunteerSlotsMode: 'unlimited',
        registrationStatus: 'open',
        createdAt: '2026-04-29T12:00:00.000Z',
        updatedAt: '2026-04-30T08:00:00.000Z',
        syncStatus: 'synced',
      },
      {
        id: 'req-4',
        title: 'Підвезти до лікарні',
        description: 'Потрібно дістатися до Олександрівської лікарні до 14:00.',
        category: 'transport',
        status: 'open',
        ...offset(SHEVCHENKIVSKYI, 0.012, 0.011),
        city: 'Київ',
        district: 'Шевченківський',
        address: 'просп. Перемоги, 17 (Олександрівська лікарня)',
        locationTitle: 'Київ, Шевченківський — Олександрівська лікарня',
        createdByUserId: 'mykola-id',
        assignedVolunteerId: null,
        acceptedVolunteerIds: [],
        volunteerSlotsMode: 'limited',
        volunteerSlots: 1,
        registrationStatus: 'open',
        createdAt: '2026-04-30T11:20:00.000Z',
        updatedAt: '2026-04-30T11:20:00.000Z',
        syncStatus: 'synced',
      },
      {
        id: 'req-5',
        title: 'Принести ліки',
        description: 'Невелика аптечна закупівля.',
        category: 'medical',
        status: 'open',
        ...offset(HOLOSIIVSKYI, -0.005, -0.01),
        city: 'Київ',
        district: 'Голосіївський',
        address: 'вул. Васильківська, 30',
        locationTitle: 'Київ, Голосіївський — вул. Васильківська',
        createdByUserId: 'olena-id',
        assignedVolunteerId: null,
        acceptedVolunteerIds: [],
        volunteerSlotsMode: 'limited',
        volunteerSlots: 2,
        registrationStatus: 'open',
        createdAt: '2026-04-30T11:35:00.000Z',
        updatedAt: '2026-04-30T11:35:00.000Z',
        syncStatus: 'synced',
      },
      {
        id: 'req-6',
        title: 'Допомога з прибиранням',
        description: 'Невелика допомога з прибиранням після ремонту.',
        category: 'other',
        status: 'completed',
        ...offset(OBOLONSKYI, 0.005, 0.005),
        city: 'Київ',
        district: 'Оболонський',
        address: 'просп. Героїв Сталінграда, 6',
        locationTitle: 'Київ, Оболонський — просп. Героїв Сталінграда',
        createdByUserId: 'demo-user-id',
        assignedVolunteerId: 'olena-id',
        acceptedVolunteerIds: ['olena-id'],
        volunteerSlotsMode: 'unlimited',
        registrationStatus: 'closed',
        createdAt: '2026-04-25T08:00:00.000Z',
        updatedAt: '2026-04-26T15:00:00.000Z',
        syncStatus: 'synced',
      },
    ],
    responses: [
      {
        id: 'res-1',
        requestId: 'req-1',
        volunteerId: 'demo-user-id',
        message: 'Можу вигуляти між 14:00 і 15:00.',
        contact: '+380501234567',
        status: 'pending',
        createdAt: '2026-04-30T09:30:00.000Z',
        syncStatus: 'synced',
      },
      {
        id: 'res-2',
        requestId: 'req-3',
        volunteerId: 'olena-id',
        message: 'Підключусь віддалено через AnyDesk.',
        status: 'accepted',
        createdAt: '2026-04-29T12:30:00.000Z',
        syncStatus: 'synced',
      },
      {
        id: 'res-3',
        requestId: 'req-2',
        volunteerId: 'demo-user-id',
        message: 'За годину можу занести продукти.',
        status: 'pending',
        createdAt: '2026-04-30T10:30:00.000Z',
        syncStatus: 'synced',
      },
    ],
    notifications: [],
    auths: [
      __seedAuthRecord('demo-user-id', 'demo@volunteerhub.local', 'demo1234'),
      __seedAuthRecord('olena-id', 'olena@volunteerhub.local', 'olena1234'),
      __seedAuthRecord('mykola-id', 'mykola@volunteerhub.local', 'mykola1234'),
      __seedAuthRecord('admin-user-id', 'admin@volunteerhub.local', 'admin1234'),
      __seedAuthRecord(
        'requester-account-id',
        'requester@volunteerhub.local',
        'requester1234',
      ),
      __seedAuthRecord(
        'volunteer-account-id',
        'volunteer@volunteerhub.local',
        'volunteer1234',
      ),
    ],
  };
}

async function main(): Promise<void> {
  const seed = buildSeed();
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`✔ Seeded ${DB_FILE}`);
}

if (require.main === module) {
  void main();
}
