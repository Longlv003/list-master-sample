"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("../controllers/audit.controller");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const router = (0, express_1.Router)();
// Audit log endpoints require 'view_audit_logs'
router.use((0, permission_middleware_1.requirePermission)('view_audit_logs'));
router.get('/', audit_controller_1.auditController.query);
router.get('/export', audit_controller_1.auditController.exportLog);
exports.default = router;
