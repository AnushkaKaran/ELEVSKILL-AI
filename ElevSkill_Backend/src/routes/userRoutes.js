import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { updateProfileValidator } from '../validators/userValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.put('/profile', updateProfileValidator, validateRequest, updateProfile);
router.patch('/profile', updateProfileValidator, validateRequest, updateProfile);

export default router;
