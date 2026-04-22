import { Router } from 'express';
import {
  changeOwnPassword,
  listUsers,
  login,
  me,
  requestPasswordReset,
  registerUser,
  resetPasswordWithToken,
  updateUser
} from '../controllers/auth.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { ROLE_GROUPS } from '../lib/roles.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication requests. Please try again later.'
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.'
});

router.post('/login', authLimiter, login);
router.post('/request-password-reset', resetLimiter, requestPasswordReset);
router.post('/reset-password', resetLimiter, resetPasswordWithToken);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, authLimiter, changeOwnPassword);
router.get('/users', requireAuth, requireRole(ROLE_GROUPS.admins), listUsers);
router.post('/users', requireAuth, requireRole(ROLE_GROUPS.admins), registerUser);
router.patch('/users/:id', requireAuth, requireRole(ROLE_GROUPS.admins), updateUser);

export default router;
