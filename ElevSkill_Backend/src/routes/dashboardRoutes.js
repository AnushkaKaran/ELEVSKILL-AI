import { Router } from 'express';
import { createActivityLog, getDashboard } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getDashboard);
router.post('/activity', createActivityLog);

export default router;
