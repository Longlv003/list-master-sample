import { Request, Response, NextFunction } from 'express';
import { masterSampleService } from '../services/masterSample.service';
import ExcelJS from 'exceljs';

export class MasterSampleController {
  async getList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, item, lot, barcodeId, status, page, limit } = req.query;

      const result = masterSampleService.getList({
        search: search as string,
        item: item as string,
        lot: lot as string,
        barcodeId: barcodeId as string,
        status: status as any,
        includeDeleted: false,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getDeleted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = masterSampleService.getDeletedList();
      res.json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sampleCode, item, lot, barcodeId, quantity, layer, programName, manufactureDate, expiryDate } = req.body;
      const username = (req as any).user?.username || 'anonymous';

      const created = await masterSampleService.create({
        sampleCode,
        item,
        lot,
        barcodeId,
        quantity,
        layer,
        programName,
        manufactureDate,
        expiryDate,
        username,
      });

      res.status(201).json({
        success: true,
        message: 'Thêm Master Sample thành công',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { sampleCode, item, lot, barcodeId, quantity, layer, programName, manufactureDate, expiryDate } = req.body;
      const username = (req as any).user?.username || 'anonymous';

      const updated = await masterSampleService.update(id, {
        sampleCode,
        item,
        lot,
        barcodeId,
        quantity,
        layer,
        programName,
        manufactureDate,
        expiryDate,
        username,
      });

      res.json({
        success: true,
        message: 'Cập nhật Master Sample thành công',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids } = req.body;
      const idList = Array.isArray(ids) ? ids : [ids];
      const username = (req as any).user?.username || 'anonymous';

      const count = await masterSampleService.softDelete(idList, username);

      res.json({
        success: true,
        message: `Đã xóa mềm ${count} bản ghi`,
        count,
      });
    } catch (err) {
      next(err);
    }
  }

  async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids } = req.body;
      const idList = Array.isArray(ids) ? ids : [ids];

      const count = await masterSampleService.restore(idList, req.user!.username);

      res.json({
        success: true,
        message: `Đã khôi phục ${count} bản ghi`,
        count,
      });
    } catch (err) {
      next(err);
    }
  }

  async exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, item, lot, barcodeId, status } = req.query;

      const result = masterSampleService.getList({
        search: search as string,
        item: item as string,
        lot: lot as string,
        barcodeId: barcodeId as string,
        status: status as any,
        includeDeleted: false,
        page: 1,
        limit: 100000,
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Danh sách Master Sample');

      sheet.columns = [
        { header: 'Mã mẫu', key: 'sampleCode', width: 18 },
        { header: 'Item', key: 'item', width: 20 },
        { header: 'Lot', key: 'lot', width: 20 },
        { header: 'Barcode', key: 'barcodeId', width: 20 },
        { header: 'Số lượng', key: 'quantity', width: 12 },
        { header: 'Layer', key: 'layer', width: 10 },
        { header: 'Tên chương trình', key: 'programName', width: 30 },
        { header: 'Ngày làm', key: 'manufactureDate', width: 15 },
        { header: 'Ngày hết hạn', key: 'expiryDate', width: 15 },
        { header: 'Trạng thái', key: 'statusText', width: 15 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F497D' },
      };

      const sanitizeText = (val: string | null | undefined): string => {
        if (!val) return '';
        const str = String(val);
        if (/^[=+\-@]/.test(str)) {
          return `'${str}`;
        }
        return str;
      };

      for (const it of result.items) {
        let statusText = 'Còn hạn';
        if (it.status === 'unknown') statusText = 'Chưa xác định hạn dùng';
        if (it.status === 'expired') statusText = 'Đã hết hạn';
        else if (it.status === 'expiring') statusText = `Sắp hết hạn (${it.daysRemaining} ngày)`;

        const row = sheet.addRow({
          sampleCode: sanitizeText(it.sampleCode),
          item: sanitizeText(it.item),
          lot: sanitizeText(it.lot),
          barcodeId: sanitizeText(it.barcodeId),
          quantity: it.quantity ?? 1,
          layer: it.layer || '',
          programName: sanitizeText(it.programName),
          manufactureDate: it.manufactureDate,
          expiryDate: it.expiryDate,
          statusText,
        });

        row.getCell('item').numFmt = '@';
        row.getCell('lot').numFmt = '@';
        row.getCell('barcodeId').numFmt = '@';
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="master_sample_list_${Date.now()}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  }
}

export const masterSampleController = new MasterSampleController();
