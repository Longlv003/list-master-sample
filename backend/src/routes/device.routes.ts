import { Router } from 'express';
import { deviceController } from '../controllers/device.controller';
import { requirePermission } from '../middlewares/permission.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { createDeviceSchema, updateDeviceSchema } from '../validators/device.validator';

const router = Router();

// Device management routes require 'manage_users'
router.use(requirePermission('manage_users'));

router.get('/', deviceController.getAll);
router.post('/', validateBody(createDeviceSchema), deviceController.create);
router.get('/export', deviceController.exportJson);
router.post('/import', deviceController.importJson);
router.put('/:id', validateBody(updateDeviceSchema), deviceController.update);
router.patch('/:id/toggle-active', deviceController.toggleActive);

export default router;
