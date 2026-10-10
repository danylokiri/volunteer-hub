import { Router } from 'express';
import { loadDb } from '../storage/db';

export function notificationsRouter(): Router {
  const router = Router();

  router.get('/notifications', async (req, res) => {
    const db = await loadDb();
    const userId = req.query.userId;
    // For the demo we don't filter per user (the seed shares notifications);
    // we still echo userId back in the payload to demonstrate the contract.
    const notifications = db.notifications.map((n) => ({
      ...n,
      payload: { ...n.payload, userId: userId ?? null },
    }));
    res.json(notifications);
  });

  return router;
}
