"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sample_controller_1 = require("../controllers/sample.controller");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const sample_validator_1 = require("../validators/sample.validator");
const router = (0, express_1.Router)();
// Public read endpoints (unauthenticated can view/search)
router.get('/', sample_controller_1.sampleController.getAll);
router.get('/deleted', (0, permission_middleware_1.requirePermission)('restore'), sample_controller_1.sampleController.getDeleted);
router.get('/export', sample_controller_1.sampleController.exportExcel);
router.get('/:id', sample_controller_1.sampleController.getById);
// Protected write endpoints
router.post('/', (0, permission_middleware_1.requirePermission)('add'), (0, validation_middleware_1.validateBody)(sample_validator_1.createSampleSchema), sample_controller_1.sampleController.create);
router.put('/:id', (0, permission_middleware_1.requirePermission)('update'), (0, validation_middleware_1.validateBody)(sample_validator_1.updateSampleSchema), sample_controller_1.sampleController.update);
router.patch('/:id', (0, permission_middleware_1.requirePermission)('update'), (0, validation_middleware_1.validateBody)(sample_validator_1.updateSampleSchema), sample_controller_1.sampleController.update);
router.delete('/', (0, permission_middleware_1.requirePermission)('delete'), (0, validation_middleware_1.validateBody)(sample_validator_1.bulkDeleteSamplesSchema), sample_controller_1.sampleController.deleteBulk);
router.delete('/:id', (0, permission_middleware_1.requirePermission)('delete'), sample_controller_1.sampleController.delete);
router.post('/:id/restore', (0, permission_middleware_1.requirePermission)('restore'), sample_controller_1.sampleController.restore);
exports.default = router;
