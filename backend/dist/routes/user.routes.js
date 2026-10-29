"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const user_validator_1 = require("../validators/user.validator");
const router = (0, express_1.Router)();
// All user management routes require 'manage_users' permission
router.use((0, permission_middleware_1.requirePermission)('manage_users'));
router.get('/', user_controller_1.userController.getAll);
router.get('/:id', user_controller_1.userController.getById);
router.post('/', (0, validation_middleware_1.validateBody)(user_validator_1.createUserSchema), user_controller_1.userController.create);
router.put('/:id', (0, validation_middleware_1.validateBody)(user_validator_1.updateUserSchema), user_controller_1.userController.update);
router.patch('/:id/toggle-active', user_controller_1.userController.toggleActive);
exports.default = router;
