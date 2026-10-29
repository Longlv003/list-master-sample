import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { requirePermission } from '../middlewares/permission.middleware';

const router = Router();

// Audit log endpoints require 'view_audit_logs'
router.use(requirePermission('view_audit_logs'));

router.get('/', auditController.query);
router.get('/export', auditController.exportLog);

export default router;
