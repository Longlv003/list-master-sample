"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const masterSample_controller_1 = require("../controllers/masterSample.controller");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const masterSample_validator_1 = require("../validators/masterSample.validator");
const masterAudit_middleware_1 = require("../middlewares/masterAudit.middleware");
const router = (0, express_1.Router)();
// Xem danh sách Master Sample
router.get('/', (0, validation_middleware_1.validateQuery)(masterSample_validator_1.masterQuerySchema), (req, res, next) => {
    masterSample_controller_1.masterSampleController.getList(req, res, next);
});
// Xem danh sách bản ghi đã xóa mềm (để Restore)
router.get('/deleted', (0, permission_middleware_1.requirePermission)('restore'), (req, res, next) => {
    masterSample_controller_1.masterSampleController.getDeleted(req, res, next);
});
// Thêm mới Master Sample
router.post('/', (0, permission_middleware_1.requirePermission)('add'), (0, validation_middleware_1.validateBody)(masterSample_validator_1.createMasterSchema), (0, masterAudit_middleware_1.auditMasterMutation)('master.create'), (req, res, next) => {
    masterSample_controller_1.masterSampleController.create(req, res, next);
});
// Sửa Master Sample
router.put('/:id', (0, permission_middleware_1.requirePermission)('update'), (0, validation_middleware_1.validateBody)(masterSample_validator_1.updateMasterSchema), (0, masterAudit_middleware_1.auditMasterMutation)('master.update'), (req, res, next) => {
    masterSample_controller_1.masterSampleController.update(req, res, next);
});
// Xóa mềm Master Sample
router.delete('/', (0, permission_middleware_1.requirePermission)('delete'), (0, validation_middleware_1.validateBody)(masterSample_validator_1.masterIdsSchema), (0, masterAudit_middleware_1.auditMasterMutation)('master.delete'), (req, res, next) => {
    masterSample_controller_1.masterSampleController.delete(req, res, next);
});
// Khôi phục Master Sample
router.post('/restore', (0, permission_middleware_1.requirePermission)('restore'), (0, validation_middleware_1.validateBody)(masterSample_validator_1.masterIdsSchema), (0, masterAudit_middleware_1.auditMasterMutation)('master.restore'), (req, res, next) => {
    masterSample_controller_1.masterSampleController.restore(req, res, next);
});
// Xuất file Excel
router.get('/export', (0, validation_middleware_1.validateQuery)(masterSample_validator_1.masterQuerySchema), (req, res, next) => {
    masterSample_controller_1.masterSampleController.exportExcel(req, res, next);
});
exports.default = router;
