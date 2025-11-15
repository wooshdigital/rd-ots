import settingsService from '../services/settingsService.js';
import logger from '../utils/logger.js';

class SettingsController {
  /**
   * Get all settings
   * GET /api/settings
   */
  async getAllSettings(req, res, next) {
    try {
      const settings = await settingsService.getAllSettings();

      res.json({
        success: true,
        count: settings.length,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a setting by key
   * GET /api/settings/:key
   */
  async getSetting(req, res, next) {
    try {
      const { key } = req.params;
      const setting = await settingsService.getSetting(key);

      res.json({
        success: true,
        data: setting
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notification recipients
   * GET /api/settings/notification-recipients
   */
  async getNotificationRecipients(req, res, next) {
    try {
      const recipients = await settingsService.getNotificationRecipients();

      res.json({
        success: true,
        data: recipients
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification recipients
   * PUT /api/settings/notification-recipients
   */
  async updateNotificationRecipients(req, res, next) {
    try {
      const recipients = req.body;

      logger.info('Updating notification recipients', { recipients });

      const setting = await settingsService.updateNotificationRecipients(recipients);

      res.json({
        success: true,
        message: 'Notification recipients updated successfully',
        data: setting
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update or create a setting
   * PUT /api/settings/:key
   */
  async upsertSetting(req, res, next) {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      if (!value) {
        return res.status(400).json({
          success: false,
          message: 'value is required'
        });
      }

      const setting = await settingsService.upsertSetting(key, value, description);

      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: setting
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a setting
   * DELETE /api/settings/:key
   */
  async deleteSetting(req, res, next) {
    try {
      const { key } = req.params;

      await settingsService.deleteSetting(key);

      res.json({
        success: true,
        message: 'Setting deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SettingsController();
