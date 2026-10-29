import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import fs from 'fs';

export class ImageController {
  async getFolderImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.query;
      if (!recordId) {
        res.status(400).json({ success: false, message: 'Thiếu recordId' });
        return;
      }

      const images = await dashboardService.getFolderImages(recordId as string);
      res.json({
        success: true,
        data: images,
      });
    } catch (err) {
      next(err);
    }
  }

  async viewImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId, subDir, fileName } = req.query;
      if (!recordId || !fileName) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin ảnh' });
        return;
      }

      const filePath = await dashboardService.getImageFilePath(
        recordId as string,
        (subDir as string) || '',
        fileName as string
      );

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache');
      await new Promise<void>((resolve, reject) => res.sendFile(filePath, err => err ? reject(err) : resolve()));
    } catch (err) {
      next(err);
    }
  }
}

export const imageController = new ImageController();
