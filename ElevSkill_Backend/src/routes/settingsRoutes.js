import { Router } from 'express';
import { getSettings, resetUserData, updateSettings } from '../controllers/settingsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { updateSettingsValidator } from '../validators/userValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', updateSettingsValidator, validateRequest, updateSettings);
router.patch('/', updateSettingsValidator, validateRequest, updateSettings);
router.post('/reset', resetUserData);

export default router;
