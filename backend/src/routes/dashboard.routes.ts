import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { scannerService } from '../services/scanner.service';
import { validateQuery } from '../middlewares/validation.middleware';
import { dashboardQuerySchema } from '../validators/dashboard.validator';

const router = Router();

// Lấy danh sách kết quả Dashboard (Người dùng mạng LAN xem không cần đăng nhập)
router.get('/', validateQuery(dashboardQuerySchema), (req, res, next) => {
  dashboardController.getDashboardData(req, res, next);
});

// Nút Refresh thủ công
router.post('/refresh', (req, res, next) => {
  dashboardController.triggerRefresh(req, res, next);
});

// Xuất Excel
router.get('/export', validateQuery(dashboardQuerySchema), (req, res, next) => {
  dashboardController.exportExcel(req, res, next);
});

router.get('/scan-status', (_req, res) => {
  res.json(scannerService.getStatus());
});

export default router;
