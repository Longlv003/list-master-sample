"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const image_controller_1 = require("../controllers/image.controller");
const router = (0, express_1.Router)();
// Lấy danh sách ảnh Auto và Manual của folder
router.get('/list', (req, res, next) => {
    image_controller_1.imageController.getFolderImages(req, res, next);
});
// Stream ảnh an toàn chống path traversal
router.get('/view', (req, res, next) => {
    image_controller_1.imageController.viewImage(req, res, next);
});
exports.default = router;
