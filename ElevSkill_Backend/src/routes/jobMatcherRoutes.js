import { Router } from 'express';
import { compareJobMatch, listJobMatchHistory } from '../controllers/jobMatcherController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.post('/compare', compareJobMatch);
router.post('/match', compareJobMatch);
router.get('/history', listJobMatchHistory);

export default router;
