// Entry point: boots Express + WebSocket on port 4000 (or PORT env).

import http from 'http';
import { buildApp } from './app';
import { attachWebSocket } from './socket/server';
import { loadDb } from './storage/db';

const PORT = Number(process.env.PORT ?? 4000);

async function main(): Promise<void> {
  await loadDb();
  const app = buildApp();
  const server = http.createServer(app);
  attachWebSocket(server);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`✔ VolunteerHub server listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`  REST:      http://localhost:${PORT}/api/v1`);
    // eslint-disable-next-line no-console
    console.log(`  WebSocket: ws://localhost:${PORT}`);
  });
}

void main();
