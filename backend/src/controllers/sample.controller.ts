import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { SampleRepository } from '../repositories/sample.repository';
import { sampleService } from '../services/sample.service';

export class SampleController {
  exportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repo = new SampleRepository();
      const query = { search: req.query.search ? String(req.query.search) : undefined, expiryStatus: req.query.expiryStatus as any,
        sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined, sortOrder: req.query.sortOrder === 'desc' ? 'desc' as const : 'asc' as const, limit: 100 };
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mẫu thử');
      sheet.columns = ['no','sample_code','quantity','item_code','layer','program_name','made_date','expiry_date','comment'].map(key => ({header: key, key, width: 22}));
      let page = 1;
      for (;;) {
        const result = repo.findMany({...query, page});
        result.items.forEach(item => sheet.addRow(item));
        if (page++ >= result.totalPages) break;
      }
      res.attachment('samples.xlsx');
      await workbook.xlsx.write(res); res.end();
    } catch (err) { next(err); }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const searchFields = req.query.searchFields
        ? Array.isArray(req.query.searchFields)
          ? (req.query.searchFields as string[])
          : [String(req.query.searchFields)]
        : undefined;

      const result = sampleService.getPaginated({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
        sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
        search: req.query.search ? String(req.query.search) : undefined,
        searchFields,
        expiryStatus: req.query.expiryStatus as any,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getDeleted = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = sampleService.getDeleted();
      res.status(200).json({
        success: true,
        data: { items: result },
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = sampleService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = {
        ip: req.deviceInfo?.ip || '127.0.0.1',
        deviceName: req.deviceInfo?.name || 'Unknown',
        actorName: req.user?.display_name,
      };

      const result = sampleService.create(req.body, req.user?.id, meta);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = {
        ip: req.deviceInfo?.ip || '127.0.0.1',
        deviceName: req.deviceInfo?.name || 'Unknown',
        actorName: req.user?.display_name,
      };

      const result = sampleService.update(req.params.id, req.body, req.user?.id, meta);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = {
        ip: req.deviceInfo?.ip || '127.0.0.1',
        deviceName: req.deviceInfo?.name || 'Unknown',
        actorName: req.user?.display_name,
      };

      sampleService.softDelete(req.params.id, req.user?.id, meta);

      res.status(200).json({
        success: true,
        data: { message: 'Đã xóa mềm mẫu thử thành công' },
      });
    } catch (err) {
      next(err);
    }
  };

  deleteBulk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = {
        ip: req.deviceInfo?.ip || '127.0.0.1',
        deviceName: req.deviceInfo?.name || 'Unknown',
        actorName: req.user?.display_name,
      };

      const count = sampleService.softDeleteBatch(req.body.ids, req.user?.id, meta);

      res.status(200).json({
        success: true,
        data: { message: `Đã xóa mềm ${count} mẫu thử thành công`, count },
      });
    } catch (err) {
      next(err);
    }
  };

  restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = {
        ip: req.deviceInfo?.ip || '127.0.0.1',
        deviceName: req.deviceInfo?.name || 'Unknown',
        actorName: req.user?.display_name,
      };

      const result = sampleService.restore(req.params.id, req.user?.id, meta);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const sampleController = new SampleController();
