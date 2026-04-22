import { Router } from 'express';
import {
  addMemberNote,
  createMember,
  getMember,
  listLeaders,
  listMembers,
  listVisitors,
  registerVisitor,
  updateVisitorFollowUp,
  updateMember,
  uploadMemberDocument,
  uploadProfileImage
} from '../controllers/members.controller.js';
import { requireRole } from '../middleware/auth.js';
import { ROLE_GROUPS } from '../lib/roles.js';

const router = Router();

router.get('/', listMembers);
router.get('/leaders', listLeaders);
router.get('/visitors', listVisitors);
router.post('/visitors', requireRole(ROLE_GROUPS.peopleEditors), registerVisitor);
router.patch('/visitors/:id/follow-up', requireRole(ROLE_GROUPS.peopleEditors), updateVisitorFollowUp);
router.get('/:id', getMember);
router.post('/', requireRole(ROLE_GROUPS.peopleEditors), createMember);
router.patch('/:id', requireRole(ROLE_GROUPS.peopleEditors), updateMember);
router.post('/:id/profile-image', requireRole(ROLE_GROUPS.peopleEditors), uploadProfileImage);
router.post('/:id/documents', requireRole(ROLE_GROUPS.peopleEditors), uploadMemberDocument);
router.post('/:id/notes', requireRole(ROLE_GROUPS.peopleEditors), addMemberNote);

export default router;
