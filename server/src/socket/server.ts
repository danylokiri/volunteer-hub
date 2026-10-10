// Attaches a ws.Server to an existing http.Server so REST and
// WebSocket share the same port (4000 in dev).

import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { registerClient } from './broadcast';

export function attachWebSocket(http: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: http });
  wss.on('connection', (ws) => {
    registerClient(ws);
    ws.send(
      JSON.stringify({
        type: 'system.welcome',
        payload: { ts: new Date().toISOString() },
      }),
    );
  });
  return wss;
}
