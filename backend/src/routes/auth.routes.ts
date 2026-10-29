import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { loginSchema } from '../validators/auth.validator';
import { requireAuth } from '../middlewares/auth.middleware';
import { loginRateLimit } from '../middlewares/loginRate.middleware';

const router = Router();

router.post('/login', loginRateLimit, validateBody(loginSchema), authController.login);
router.post('/change-password', requireAuth, loginRateLimit, authController.changePassword);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', authController.me);

export default router;
