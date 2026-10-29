"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageController = exports.ImageController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
class ImageController {
    async getFolderImages(req, res, next) {
        try {
            const { recordId } = req.query;
            if (!recordId) {
                res.status(400).json({ success: false, message: 'Thiếu recordId' });
                return;
            }
            const images = await dashboard_service_1.dashboardService.getFolderImages(recordId);
            res.json({
                success: true,
                data: images,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async viewImage(req, res, next) {
        try {
            const { recordId, subDir, fileName } = req.query;
            if (!recordId || !fileName) {
                res.status(400).json({ success: false, message: 'Thiếu thông tin ảnh' });
                return;
            }
            const filePath = await dashboard_service_1.dashboardService.getImageFilePath(recordId, subDir || '', fileName);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'no-cache');
            await new Promise((resolve, reject) => res.sendFile(filePath, err => err ? reject(err) : resolve()));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ImageController = ImageController;
exports.imageController = new ImageController();
