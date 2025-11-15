import express from 'express';
import settingsController from '../controllers/settingsController.js';

const router = express.Router();

// Get notification recipients
router.get('/notification-recipients', settingsController.getNotificationRecipients);

// Update notification recipients
router.put('/notification-recipients', settingsController.updateNotificationRecipients);

// Get all settings
router.get('/', settingsController.getAllSettings);

// Get setting by key
router.get('/:key', settingsController.getSetting);

// Update or create setting
router.put('/:key', settingsController.upsertSetting);

// Delete setting
router.delete('/:key', settingsController.deleteSetting);

export default router;
