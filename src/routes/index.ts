import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import folderRoutes from './folderRoutes';
import folderAccessRoute from './folderAccessRoutes';
import fileRoute from './fileRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/folder', folderRoutes);
router.use('/permission', folderAccessRoute);
router.use('/file', fileRoute);
router.use('/admin', adminRoutes);

export default router;
