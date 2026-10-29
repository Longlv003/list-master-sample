import { Router } from 'express';
import { sampleController } from '../controllers/sample.controller';
import { requirePermission } from '../middlewares/permission.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import {
  createSampleSchema,
  updateSampleSchema,
  bulkDeleteSamplesSchema,
} from '../validators/sample.validator';

const router = Router();

// Public read endpoints (unauthenticated can view/search)
router.get('/', sampleController.getAll);
router.get('/deleted', requirePermission('restore'), sampleController.getDeleted);
router.get('/export', sampleController.exportExcel);
router.get('/:id', sampleController.getById);

// Protected write endpoints
router.post('/', requirePermission('add'), validateBody(createSampleSchema), sampleController.create);
router.put('/:id', requirePermission('update'), validateBody(updateSampleSchema), sampleController.update);
router.patch('/:id', requirePermission('update'), validateBody(updateSampleSchema), sampleController.update);
router.delete('/', requirePermission('delete'), validateBody(bulkDeleteSamplesSchema), sampleController.deleteBulk);
router.delete('/:id', requirePermission('delete'), sampleController.delete);
router.post('/:id/restore', requirePermission('restore'), sampleController.restore);

export default router;
