"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditController = exports.AuditController = void 0;
const audit_service_1 = require("../services/audit.service");
const events_1 = require("events");
class AuditController {
    query = async (req, res, next) => {
        try {
            const result = await audit_service_1.auditService.query({
                page: req.query.page ? Number(req.query.page) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                action: req.query.action ? String(req.query.action) : undefined,
                actor_id: req.query.actor_id ? String(req.query.actor_id) : undefined,
                entity_type: req.query.entity_type ? String(req.query.entity_type) : undefined,
                entity_id: req.query.entity_id ? String(req.query.entity_id) : undefined,
                startDate: req.query.startDate ? String(req.query.startDate) : undefined,
                endDate: req.query.endDate ? String(req.query.endDate) : undefined,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    };
    exportLog = async (req, res, next) => {
        try {
            const entries = audit_service_1.auditService.entries({
                actor_id: req.query.actor_id ? String(req.query.actor_id) : undefined,
                entity_type: req.query.entity_type ? String(req.query.entity_type) : undefined,
                entity_id: req.query.entity_id ? String(req.query.entity_id) : undefined,
                action: req.query.action ? String(req.query.action) : undefined,
                startDate: req.query.startDate ? String(req.query.startDate) : undefined,
                endDate: req.query.endDate ? String(req.query.endDate) : undefined,
            });
            res.setHeader('Content-Type', 'application/x-ndjson');
            res.setHeader('Content-Disposition', `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.jsonl"`);
            for await (const entry of entries) {
                if (res.destroyed)
                    break;
                if (!res.write(JSON.stringify(entry) + '\n'))
                    await (0, events_1.once)(res, 'drain');
            }
            res.end();
        }
        catch (err) {
            next(err);
        }
    };
}
exports.AuditController = AuditController;
exports.auditController = new AuditController();
