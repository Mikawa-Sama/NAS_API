import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import folderRoutes from './folderRoutes';
import folderAccessRoute from './folderAccessRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/folder', folderRoutes);
router.use('/permission', folderAccessRoute);

export default router;