# VolunteerHub

A mobile app that connects people who need help with volunteers. A requester posts a request with a location, volunteers respond, and both sides get real-time notifications.

> Built as a course project. Authentication is intentionally simple (salted SHA-256 and a user-id session) and is **not** meant for production use.

## Features

- Create help requests and pick a location on the map
- Browse requests, view details and respond as a volunteer
- Real-time notifications over WebSocket
- Invitations and deep links
- Roles: requester, volunteer, admin (admin screen)
- Local app lock with biometrics, security settings
- Local storage on the device (SQLite)
- Unit and UI tests on both client and server

## Tech stack

| Part | Stack |
|---|---|
| `mobile` | Expo, React Native, TypeScript, React Navigation, Drizzle ORM + expo-sqlite, expo-local-authentication, Jest |
| `server` | Node.js, Express, WebSocket (`ws`), TypeScript, Jest |

## Getting started

Requirements: Node.js 20+, and the Expo Go app or an Android/iOS emulator.

```bash
# Server
cd server
npm install
npm run seed      # load demo data
npm run dev       # REST + WebSocket

# Mobile (in another terminal)
cd mobile
npm install
npm start         # then press "a" for Android, or scan the QR code with Expo Go
```

Run the tests:

```bash
cd server && npm test
cd mobile && npm test
```

## Project structure

```
mobile/src/
  screens/     app screens
  domain/      models and seed data
  data/        local database layer
  realtime/    WebSocket client
  security/    app lock and biometrics
  deeplink/    deep link handling
  tests/       UI tests
server/src/
  routes/      auth, users, requests, notifications, health
  socket/      WebSocket server and broadcasting
  storage/     data storage and geo helpers
  seed/        demo data
```

All accounts and data in the repository are demo data.
