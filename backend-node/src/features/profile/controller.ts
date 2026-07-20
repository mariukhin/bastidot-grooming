import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import { USER_COLLECTION, type User } from '../../shared/user.ts';

function toProfileDTO(user: User) {
  return {
    id: user._id ? user._id.toHexString() : '',
    name: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber,
    photoUrl: user.photoUrl,
    isAdmin: user.isAdmin,
    isGroomer: user.isGroomer,
    isVip: user.isVip,
  };
}

export function createProfileRouter(db: Db): Router {
  const router = Router();

  // GET /protected/profile
  router.get('/profile', async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId || !ObjectId.isValid(userId)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await db
      .collection<User>(USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(toProfileDTO(user));
  });

  return router;
}
