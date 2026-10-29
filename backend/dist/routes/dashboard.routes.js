"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const scanner_service_1 = require("../services/scanner.service");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const dashboard_validator_1 = require("../validators/dashboard.validator");
const router = (0, express_1.Router)();
// Lấy danh sách kết quả Dashboard (Người dùng mạng LAN xem không cần đăng nhập)
router.get('/', (0, validation_middleware_1.validateQuery)(dashboard_validator_1.dashboardQuerySchema), (req, res, next) => {
    dashboard_controller_1.dashboardController.getDashboardData(req, res, next);
});
// Nút Refresh thủ công
router.post('/refresh', (req, res, next) => {
    dashboard_controller_1.dashboardController.triggerRefresh(req, res, next);
});
// Xuất Excel
router.get('/export', (0, validation_middleware_1.validateQuery)(dashboard_validator_1.dashboardQuerySchema), (req, res, next) => {
    dashboard_controller_1.dashboardController.exportExcel(req, res, next);
});
router.get('/scan-status', (_req, res) => {
    res.json(scanner_service_1.scannerService.getStatus());
});
exports.default = router;
