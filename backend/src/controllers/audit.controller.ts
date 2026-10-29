import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';
import { once } from 'events';

export class AuditController {
  query = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await auditService.query({
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
    } catch (err) {
      next(err);
    }
  };

  exportLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entries = auditService.entries({
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
        if (res.destroyed) break;
        if (!res.write(JSON.stringify(entry) + '\n')) await once(res, 'drain');
      }
      res.end();
    } catch (err) {
      next(err);
    }
  };
}

export const auditController = new AuditController();
