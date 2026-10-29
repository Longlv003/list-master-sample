import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requirePermission } from '../middlewares/permission.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();

// All user management routes require 'manage_users' permission
router.use(requirePermission('manage_users'));

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', validateBody(createUserSchema), userController.create);
router.put('/:id', validateBody(updateUserSchema), userController.update);
router.patch('/:id/toggle-active', userController.toggleActive);

export default router;
