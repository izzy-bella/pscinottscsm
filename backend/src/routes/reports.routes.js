import { Router } from 'express';
import { dashboardReport } from '../controllers/reports.controller.js';

const router = Router();

router.get('/dashboard', dashboardReport);

export default router;
