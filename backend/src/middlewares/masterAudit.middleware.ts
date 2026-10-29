import { Request, Response, NextFunction } from 'express';
import { masterSampleRepository } from '../repositories/masterSample.repository';
import { auditService } from '../services/audit.service';

export function auditMasterMutation(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const before = new Map(masterSampleRepository.getAll(true).map(item => [item.id, item]));
    const send = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode < 400) {
        const created = (body as {data?: {id?: string}})?.data?.id;
        const targets = new Set<string>(req.params.id ? [req.params.id] : Array.isArray(req.body.ids) ? req.body.ids : created ? [created] : []);
        for (const item of masterSampleRepository.getAll(true).filter(item => targets.has(item.id))) {
          const old = before.get(item.id);
          if (JSON.stringify(old) === JSON.stringify(item)) continue;
          auditService.log({ action, actor_id: req.user?.id, actor_name: req.user?.display_name,
            ip: req.deviceInfo?.ip || req.ip || '', device_name: req.deviceInfo?.name,
            entity_type: 'master_sample', entity_id: item.id,
            old_value: old ? { ...old } : null, new_value: { ...item }, result: 'success' });
        }
      }
      return send(body);
    }) as Response['json'];
    next();
  };
}
