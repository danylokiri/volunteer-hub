import { Router } from 'express';
import { loadDb } from '../storage/db';

export function usersRouter(): Router {
  const router = Router();

  router.get('/users/:id', async (req, res) => {
    const db = await loadDb();
    const found = db.users.find((u) => u.id === req.params.id);
    if (!found) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    res.json(found);
  });

  return router;
}
