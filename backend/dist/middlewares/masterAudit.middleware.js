"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMasterMutation = auditMasterMutation;
const masterSample_repository_1 = require("../repositories/masterSample.repository");
const audit_service_1 = require("../services/audit.service");
function auditMasterMutation(action) {
    return (req, res, next) => {
        const before = new Map(masterSample_repository_1.masterSampleRepository.getAll(true).map(item => [item.id, item]));
        const send = res.json.bind(res);
        res.json = ((body) => {
            if (res.statusCode < 400) {
                const created = body?.data?.id;
                const targets = new Set(req.params.id ? [req.params.id] : Array.isArray(req.body.ids) ? req.body.ids : created ? [created] : []);
                for (const item of masterSample_repository_1.masterSampleRepository.getAll(true).filter(item => targets.has(item.id))) {
                    const old = before.get(item.id);
                    if (JSON.stringify(old) === JSON.stringify(item))
                        continue;
                    audit_service_1.auditService.log({ action, actor_id: req.user?.id, actor_name: req.user?.display_name,
                        ip: req.deviceInfo?.ip || req.ip || '', device_name: req.deviceInfo?.name,
                        entity_type: 'master_sample', entity_id: item.id,
                        old_value: old ? { ...old } : null, new_value: { ...item }, result: 'success' });
                }
            }
            return send(body);
        });
        next();
    };
}
