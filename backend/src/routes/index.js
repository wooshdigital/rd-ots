import express from 'express';
import requestRoutes from './requestRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = express.Router();

// Mount routes
router.use('/requests', requestRoutes);
router.use('/settings', settingsRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'RD Overtime System API',
    version: '1.0.0',
    endpoints: {
      requests: '/api/requests',
      settings: '/api/settings',
      health: '/health'
    }
  });
});

export default router;
