import dbAdapter from '../config/dbAdapter.js';
import logger from '../utils/logger.js';

/**
 * Service for logging system-wide activities
 * Used to track cron jobs, notifications, and other system events
 */
class ActivityLogService {
  /**
   * Activity types enum
   */
  static TYPES = {
    CRON_JOB: 'cron_job',
    NOTIFICATION_SENT: 'notification_sent',
    EMAIL_SENT: 'email_sent',
    SYSTEM_EVENT: 'system_event',
    DAILY_REMINDER: 'daily_reminder',
    REQUEST_SUBMITTED: 'request_submitted',
    REQUEST_APPROVED: 'request_approved',
    REQUEST_REJECTED: 'request_rejected'
  };

  /**
   * Status enum
   */
  static STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
    WARNING: 'warning',
    INFO: 'info'
  };

  /**
   * Log an activity
   * @param {string} activityType - Type of activity (use TYPES enum)
   * @param {string} description - Human-readable description
   * @param {Object} options - Additional options
   * @param {Object} options.details - Additional JSON details
   * @param {string} options.status - Status (use STATUS enum)
   * @param {string} options.performedBy - User email or system identifier
   * @param {number} options.requestId - Optional request ID reference
   * @returns {Promise<Object>} The created activity log entry
   */
  async log(activityType, description, options = {}) {
    try {
      const {
        details = null,
        status = ActivityLogService.STATUS.SUCCESS,
        performedBy = 'system',
        requestId = null
      } = options;

      const logEntry = {
        activity_type: activityType,
        description,
        details: details ? JSON.stringify(details) : null,
        status,
        performed_by: performedBy,
        request_id: requestId
      };

      const result = await dbAdapter.query(
        `INSERT INTO activity_log
         (activity_type, description, details, status, performed_by, request_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          logEntry.activity_type,
          logEntry.description,
          logEntry.details,
          logEntry.status,
          logEntry.performed_by,
          logEntry.request_id
        ]
      );

      logger.info('Activity logged', {
        type: activityType,
        status,
        description: description.substring(0, 100) // Log first 100 chars
      });

      return result.rows ? result.rows[0] : result.data[0];
    } catch (error) {
      logger.error('Failed to log activity', {
        error: error.message,
        activityType,
        description
      });
      // Don't throw - activity logging should not break the main flow
      return null;
    }
  }

  /**
   * Log a successful cron job execution
   * @param {string} jobName - Name of the cron job
   * @param {Object} details - Job execution details
   */
  async logCronJobSuccess(jobName, details = {}) {
    return this.log(
      ActivityLogService.TYPES.CRON_JOB,
      `Cron job "${jobName}" executed successfully`,
      {
        status: ActivityLogService.STATUS.SUCCESS,
        details,
        performedBy: 'system:cron'
      }
    );
  }

  /**
   * Log a failed cron job execution
   * @param {string} jobName - Name of the cron job
   * @param {Error} error - Error that occurred
   * @param {Object} details - Additional details
   */
  async logCronJobFailure(jobName, error, details = {}) {
    return this.log(
      ActivityLogService.TYPES.CRON_JOB,
      `Cron job "${jobName}" failed: ${error.message}`,
      {
        status: ActivityLogService.STATUS.FAILED,
        details: {
          ...details,
          error: error.message,
          stack: error.stack
        },
        performedBy: 'system:cron'
      }
    );
  }

  /**
   * Log a notification sent event
   * @param {Array<string>} recipients - List of recipient emails
   * @param {string} subject - Email subject
   * @param {Object} options - Additional options
   */
  async logNotificationSent(recipients, subject, options = {}) {
    const { requestId = null, notificationType = 'general', status = ActivityLogService.STATUS.SUCCESS } = options;

    return this.log(
      ActivityLogService.TYPES.NOTIFICATION_SENT,
      `Notification sent to ${recipients.length} recipient(s): "${subject}"`,
      {
        status,
        details: {
          recipients,
          recipientCount: recipients.length,
          subject,
          notificationType
        },
        performedBy: 'system:notification',
        requestId
      }
    );
  }

  /**
   * Log daily reminder sent
   * @param {Array<string>} approvers - List of approver emails
   * @param {number} pendingCount - Number of pending requests
   * @param {boolean} success - Whether the reminder was sent successfully
   */
  async logDailyReminder(approvers, pendingCount, success = true) {
    return this.log(
      ActivityLogService.TYPES.DAILY_REMINDER,
      `Daily reminder sent to ${approvers.length} approver(s) for ${pendingCount} pending request(s)`,
      {
        status: success ? ActivityLogService.STATUS.SUCCESS : ActivityLogService.STATUS.FAILED,
        details: {
          approvers,
          approverCount: approvers.length,
          pendingRequestCount: pendingCount
        },
        performedBy: 'system:daily-reminder'
      }
    );
  }

  /**
   * Log request submission notification
   * @param {string} employeeEmail - Employee who submitted
   * @param {Array<string>} approvers - Approvers notified
   * @param {number} requestId - Request ID
   */
  async logRequestSubmitted(employeeEmail, approvers, requestId) {
    return this.log(
      ActivityLogService.TYPES.REQUEST_SUBMITTED,
      `Request #${requestId} submitted by ${employeeEmail}, notified ${approvers.length} approver(s)`,
      {
        status: ActivityLogService.STATUS.INFO,
        details: {
          employee: employeeEmail,
          approvers,
          approverCount: approvers.length
        },
        performedBy: employeeEmail,
        requestId
      }
    );
  }

  /**
   * Get recent activity logs
   * @param {Object} filters - Filter options
   * @param {string} filters.activityType - Filter by activity type
   * @param {string} filters.status - Filter by status
   * @param {number} filters.limit - Number of records to return
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Array>} List of activity logs
   */
  async getRecentActivities(filters = {}) {
    try {
      const {
        activityType = null,
        status = null,
        limit = 100,
        offset = 0
      } = filters;

      let query = `SELECT * FROM activity_log WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (activityType) {
        query += ` AND activity_type = $${paramIndex}`;
        params.push(activityType);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await dbAdapter.query(query, params);
      return result.rows || result.data || [];
    } catch (error) {
      logger.error('Failed to get recent activities', { error: error.message });
      throw error;
    }
  }

  /**
   * Get activity statistics
   * @returns {Promise<Object>} Statistics about activities
   */
  async getStatistics() {
    try {
      const query = `
        SELECT
          activity_type,
          status,
          COUNT(*) as count
        FROM activity_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY activity_type, status
        ORDER BY activity_type, status
      `;

      const result = await dbAdapter.query(query);
      return result.rows || result.data || [];
    } catch (error) {
      logger.error('Failed to get activity statistics', { error: error.message });
      throw error;
    }
  }
}

export default new ActivityLogService();
