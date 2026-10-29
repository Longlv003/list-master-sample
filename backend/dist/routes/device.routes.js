"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const device_controller_1 = require("../controllers/device.controller");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const device_validator_1 = require("../validators/device.validator");
const router = (0, express_1.Router)();
// Device management routes require 'manage_users'
router.use((0, permission_middleware_1.requirePermission)('manage_users'));
router.get('/', device_controller_1.deviceController.getAll);
router.post('/', (0, validation_middleware_1.validateBody)(device_validator_1.createDeviceSchema), device_controller_1.deviceController.create);
router.get('/export', device_controller_1.deviceController.exportJson);
router.post('/import', device_controller_1.deviceController.importJson);
router.put('/:id', (0, validation_middleware_1.validateBody)(device_validator_1.updateDeviceSchema), device_controller_1.deviceController.update);
router.patch('/:id/toggle-active', device_controller_1.deviceController.toggleActive);
exports.default = router;
