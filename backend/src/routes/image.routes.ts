import { Router } from 'express';
import { imageController } from '../controllers/image.controller';

const router = Router();

// Lấy danh sách ảnh Auto và Manual của folder
router.get('/list', (req, res, next) => {
  imageController.getFolderImages(req, res, next);
});

// Stream ảnh an toàn chống path traversal
router.get('/view', (req, res, next) => {
  imageController.viewImage(req, res, next);
});

export default router;
