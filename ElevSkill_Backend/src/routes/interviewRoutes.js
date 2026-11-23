import { Router } from 'express';
import {
  evaluateAnswer,
  interviewSummary,
  listInterviewHistory,
} from '../controllers/interviewController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.post('/evaluate', evaluateAnswer);
router.get('/history', listInterviewHistory);
router.get('/summary', interviewSummary);

export default router;
