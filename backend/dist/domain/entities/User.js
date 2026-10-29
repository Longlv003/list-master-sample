"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserAdmin = isUserAdmin;
function isUserAdmin(user) {
    return (user.perm_add === 1 &&
        user.perm_update === 1 &&
        user.perm_delete === 1 &&
        user.perm_restore === 1 &&
        user.perm_manage_users === 1 &&
        user.perm_view_audit_logs === 1);
}
