import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getCurrentUser } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { loginValidator, registerValidator } from '../validators/authValidators.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AUTH_RATE_LIMITED',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

router.post('/register', authLimiter, registerValidator, validateRequest, register);
router.post('/login', authLimiter, loginValidator, validateRequest, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getCurrentUser);

export default router;
