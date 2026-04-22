import { Router } from 'express';
import {
  bulkMarkAttendance,
  createAttendanceSession,
  getAttendanceSession,
  listAttendanceSessions,
  markAttendance,
  memberAttendanceHistory,
  resetAttendance
} from '../controllers/attendance.controller.js';
import { requireRole } from '../middleware/auth.js';
import { ROLE_GROUPS } from '../lib/roles.js';

const router = Router();

router.get('/sessions', listAttendanceSessions);
router.post('/sessions', requireRole(ROLE_GROUPS.attendanceEditors), createAttendanceSession);
router.get('/sessions/:id', getAttendanceSession);
router.post('/sessions/:id/records', requireRole(ROLE_GROUPS.attendanceEditors), markAttendance);
router.post('/sessions/:id/bulk', requireRole(ROLE_GROUPS.attendanceEditors), bulkMarkAttendance);
router.get('/member/:memberId', memberAttendanceHistory);
router.post('/reset', requireRole(ROLE_GROUPS.attendanceAdmins), resetAttendance);

export default router;
