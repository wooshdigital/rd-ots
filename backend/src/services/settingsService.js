import dbAdapter from '../config/database.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class SettingsService {
  /**
   * Get a setting by key
   */
  async getSetting(key) {
    try {
      const setting = await dbAdapter.getSetting(key);
      if (!setting) {
        throw new AppError(`Setting '${key}' not found`, 404);
      }
      return setting;
    } catch (error) {
      logger.error('Error in getSetting', { error: error.message });
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch setting', 500);
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    try {
      const settings = await dbAdapter.getAllSettings();
      return settings;
    } catch (error) {
      logger.error('Error in getAllSettings', { error: error.message });
      throw new AppError('Failed to fetch settings', 500);
    }
  }

  /**
   * Update or create a setting
   */
  async upsertSetting(key, value, description = null) {
    try {
      const setting = await dbAdapter.upsertSetting(key, value, description);
      return setting;
    } catch (error) {
      logger.error('Error in upsertSetting', { error: error.message });
      throw new AppError('Failed to update setting', 500);
    }
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key) {
    try {
      await dbAdapter.deleteSetting(key);
    } catch (error) {
      logger.error('Error in deleteSetting', { error: error.message });
      throw new AppError('Failed to delete setting', 500);
    }
  }
}

export default new SettingsService();
