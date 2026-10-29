"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateUserMiddleware = populateUserMiddleware;
exports.requireAuth = requireAuth;
const user_service_1 = require("../services/user.service");
function populateUserMiddleware(req, _res, next) {
    const userId = req.session?.userId;
    if (!userId) {
        req.user = undefined;
        return next();
    }
    try {
        const user = user_service_1.userService.getById(userId);
        if (!user || !user.is_active) {
            req.session.destroy(() => { });
            req.user = undefined;
            return next();
        }
        req.user = user;
    }
    catch {
        req.user = undefined;
    }
    next();
}
function requireAuth(req, res, next) {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Vui lòng đăng nhập để thực hiện chức năng này',
            },
        });
        return;
    }
    next();
}
