import express from 'express';
import requestRoutes from './requestRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/requests', requestRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'RD Overtime System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      requests: '/api/requests',
      settings: '/api/settings',
      admin: '/api/admin',
      health: '/health'
    }
  });
});

export default router;
