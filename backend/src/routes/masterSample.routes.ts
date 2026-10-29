import { Router } from 'express';
import { masterSampleController } from '../controllers/masterSample.controller';
import { requirePermission } from '../middlewares/permission.middleware';
import { validateBody, validateQuery } from '../middlewares/validation.middleware';
import { createMasterSchema, updateMasterSchema, masterIdsSchema, masterQuerySchema } from '../validators/masterSample.validator';
import { auditMasterMutation } from '../middlewares/masterAudit.middleware';

const router = Router();

// Xem danh sách Master Sample
router.get('/', validateQuery(masterQuerySchema), (req, res, next) => {
  masterSampleController.getList(req, res, next);
});

// Xem danh sách bản ghi đã xóa mềm (để Restore)
router.get('/deleted', requirePermission('restore'), (req, res, next) => {
  masterSampleController.getDeleted(req, res, next);
});

// Thêm mới Master Sample
router.post('/', requirePermission('add'), validateBody(createMasterSchema), auditMasterMutation('master.create'), (req, res, next) => {
  masterSampleController.create(req, res, next);
});

// Sửa Master Sample
router.put('/:id', requirePermission('update'), validateBody(updateMasterSchema), auditMasterMutation('master.update'), (req, res, next) => {
  masterSampleController.update(req, res, next);
});

// Xóa mềm Master Sample
router.delete('/', requirePermission('delete'), validateBody(masterIdsSchema), auditMasterMutation('master.delete'), (req, res, next) => {
  masterSampleController.delete(req, res, next);
});

// Khôi phục Master Sample
router.post('/restore', requirePermission('restore'), validateBody(masterIdsSchema), auditMasterMutation('master.restore'), (req, res, next) => {
  masterSampleController.restore(req, res, next);
});

// Xuất file Excel
router.get('/export', validateQuery(masterQuerySchema), (req, res, next) => {
  masterSampleController.exportExcel(req, res, next);
});

export default router;
