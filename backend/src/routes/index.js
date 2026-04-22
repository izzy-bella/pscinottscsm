import { Router } from 'express';
import authRoutes from './auth.routes.js';
import membersRoutes from './members.routes.js';
import householdsRoutes from './households.routes.js';
import attendanceRoutes from './attendance.routes.js';
import reportsRoutes from './reports.routes.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    service: 'church-cms-backend'
  });
});

router.use('/auth', authRoutes);
router.use('/members', requireAuth, membersRoutes);
router.use('/households', requireAuth, householdsRoutes);
router.use('/attendance', requireAuth, attendanceRoutes);
router.use('/reports', requireAuth, reportsRoutes);

export default router;
