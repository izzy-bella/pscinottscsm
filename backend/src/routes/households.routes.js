import { Router } from 'express';
import { listHouseholds } from '../controllers/households.controller.js';

const router = Router();

router.get('/', listHouseholds);

export default router;
