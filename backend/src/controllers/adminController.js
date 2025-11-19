import activityLogService from '../services/activityLogService.js';
import schedulerService from '../services/schedulerService.js';
import logger from '../utils/logger.js';

/**
 * Admin Controller
 * Handles admin-only endpoints for activity logs and system management
 */
class AdminController {
  /**
   * Get activity logs
   * GET /api/admin/activity-logs
   */
  async getActivityLogs(req, res, next) {
    try {
      const { activityType, status, limit, offset } = req.query;

      const filters = {
        activityType: activityType || null,
        status: status || null,
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0
      };

      const activities = await activityLogService.getRecentActivities(filters);

      res.json({
        success: true,
        count: activities.length,
        data: activities,
        filters
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity log statistics
   * GET /api/admin/activity-logs/stats
   */
  async getActivityStats(req, res, next) {
    try {
      const stats = await activityLogService.getStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheduler status
   * GET /api/admin/scheduler/status
   */
  async getSchedulerStatus(req, res, next) {
    try {
      const status = schedulerService.getJobsStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger daily reminder (for testing)
   * POST /api/admin/scheduler/trigger-daily-reminder
   */
  async triggerDailyReminder(req, res, next) {
    try {
      const user = req.user; // From verifySession middleware

      logger.info('Manually triggering daily reminder', {
        triggeredBy: user.email,
        role: user.role
      });

      // Trigger the daily reminder asynchronously
      schedulerService.triggerDailyReminder().catch(err => {
        logger.error('Manual daily reminder trigger failed', {
          error: err.message,
          triggeredBy: user.email
        });
      });

      res.json({
        success: true,
        message: 'Daily reminder triggered successfully. Check activity logs for results.',
        triggeredBy: user.email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
