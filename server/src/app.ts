// App factory -- builds an Express instance ready to be either listened
// on (production) or wrapped in supertest (tests).

import express, { Express, NextFunction, Request, Response } from 'express';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { notificationsRouter } from './routes/notifications';
import { requestsRouter } from './routes/requests';
import { usersRouter } from './routes/users';

export function buildApp(): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Wide-open CORS for the dev demo; locked-down auth and CORS rules
  // would belong in a real deployment, which is out of course scope.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use('/api/v1', healthRouter());
  app.use('/api/v1', authRouter());
  app.use('/api/v1', requestsRouter());
  app.use('/api/v1', usersRouter());
  app.use('/api/v1', notificationsRouter());

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('unhandled error', err);
    res
      .status(500)
      .json({ error: { code: 'SERVER_ERROR', message: 'Internal error' } });
  });

  return app;
}
