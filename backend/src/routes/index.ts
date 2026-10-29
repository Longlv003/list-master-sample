import { Router } from 'express';
import authRoutes from './auth.routes';
import sampleRoutes from './sample.routes';
import userRoutes from './user.routes';
import deviceRoutes from './device.routes';
import auditRoutes from './audit.routes';

import dashboardRoutes from './dashboard.routes';
import imageRoutes from './image.routes';
import masterSampleRoutes from './masterSample.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/images', imageRoutes);
router.use('/master-samples', masterSampleRoutes);
router.use('/samples', sampleRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/audit', auditRoutes);

export default router;
