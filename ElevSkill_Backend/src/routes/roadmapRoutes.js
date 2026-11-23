import { Router } from 'express';
import {
  clearRoadmap,
  createSkill,
  generateRoadmap,
  getRoadmap,
  patchSkill,
  removeSkill,
  syncRecommendations,
} from '../controllers/roadmapController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getRoadmap);
router.post('/generate', generateRoadmap);
router.post('/skills', createSkill);
router.post('/skills/sync', syncRecommendations);
router.patch('/skills/:skillId', patchSkill);
router.delete('/skills/:skillId', removeSkill);
router.delete('/skills', clearRoadmap);

export default router;
