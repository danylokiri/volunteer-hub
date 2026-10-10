// Tiny broadcast utility. Anyone holding a reference to the singleton
// `clients` set (the WS server, the routes, the tests) can publish a
// typed event to all connected clients.

import { WebSocket } from 'ws';
import { SocketBroadcast } from '../types';

export const clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket): void {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
}

export function broadcast(event: SocketBroadcast): void {
  const payload = JSON.stringify(event);
  for (const ws of clients) {
    try {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    } catch {
      // ignore -- the next broadcast will skip this client when its
      // close handler fires.
    }
  }
}
