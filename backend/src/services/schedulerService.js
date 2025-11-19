import cron from 'node-cron';
import requestService from './requestService.js';
import n8nService from './n8nService.js';
import activityLogService from './activityLogService.js';
import logger from '../utils/logger.js';

/**
 * Scheduler Service for running cron jobs
 * Handles daily reminders and other scheduled tasks
 */
class SchedulerService {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Initialize all scheduled jobs
   */
  async initialize() {
    logger.info('Initializing scheduler service...');

    try {
      // Daily reminder job: Every workday at 8:00 AM Philippines time (Asia/Manila)
      // Cron format: minute hour day month day-of-week
      // 0 8 * * 1-5 = At 8:00 AM, Monday through Friday
      this.scheduleDailyReminder();

      logger.info('Scheduler service initialized successfully', {
        jobCount: this.jobs.size
      });
    } catch (error) {
      logger.error('Failed to initialize scheduler service', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Schedule daily reminder for pending OT/UT requests
   * Runs at 8:00 AM Philippines time, Monday to Friday
   */
  scheduleDailyReminder() {
    // Cron schedule: 0 8 * * 1-5 (At 8:00 AM, Monday through Friday)
    // Timezone: Asia/Manila (Philippines Time - UTC+8)
    const schedule = '0 8 * * 1-5';
    const timezone = 'Asia/Manila';

    const job = cron.schedule(
      schedule,
      async () => {
        await this.sendDailyReminder();
      },
      {
        scheduled: true,
        timezone: timezone
      }
    );

    this.jobs.set('daily_reminder', job);

    logger.info('Daily reminder job scheduled', {
      schedule,
      timezone,
      description: 'Runs at 8:00 AM Philippines time on workdays (Mon-Fri)'
    });
  }

  /**
   * Send daily reminder to all approvers about pending requests
   */
  async sendDailyReminder() {
    const jobStartTime = new Date();
    logger.info('Starting daily reminder cron job', {
      timestamp: jobStartTime.toISOString()
    });

    try {
      // Step 1: Get all pending requests
      const pendingRequests = await requestService.getPendingRequests();

      if (pendingRequests.length === 0) {
        logger.info('No pending requests found for daily reminder');
        await activityLogService.logCronJobSuccess('daily_reminder', {
          pendingCount: 0,
          message: 'No pending requests to remind about'
        });
        return;
      }

      logger.info('Found pending requests for daily reminder', {
        count: pendingRequests.length
      });

      // Step 2: Get all unique approvers
      const approvers = await this.getAllApprovers();

      if (approvers.length === 0) {
        logger.warn('No approvers found for daily reminder');
        await activityLogService.logCronJobSuccess('daily_reminder', {
          pendingCount: pendingRequests.length,
          approverCount: 0,
          message: 'No approvers found to send reminders'
        });
        return;
      }

      logger.info('Found approvers for daily reminder', {
        approverCount: approvers.length,
        approvers
      });

      // Step 3: Format email content
      const subject = `Daily Reminder: ${pendingRequests.length} Pending OT/UT Request(s) Awaiting Approval`;
      const message = this.formatDailyReminderEmail(pendingRequests);

      // Step 4: Send email to all approvers
      try {
        await n8nService.sendNotification(
          approvers,
          subject,
          message,
          {
            notificationType: 'daily_reminder',
            pendingCount: pendingRequests.length,
            timestamp: new Date().toISOString()
          }
        );

        logger.info('Daily reminder sent successfully', {
          approvers,
          approverCount: approvers.length,
          pendingCount: pendingRequests.length,
          duration: `${new Date() - jobStartTime}ms`
        });

        // Step 5: Log successful execution
        await activityLogService.logDailyReminder(
          approvers,
          pendingRequests.length,
          true
        );
      } catch (emailError) {
        logger.error('Failed to send daily reminder emails', {
          error: emailError.message,
          approvers,
          pendingCount: pendingRequests.length
        });

        // Log failed execution
        await activityLogService.logDailyReminder(
          approvers,
          pendingRequests.length,
          false
        );

        // Also log the cron job failure
        await activityLogService.logCronJobFailure(
          'daily_reminder',
          emailError,
          {
            approverCount: approvers.length,
            pendingCount: pendingRequests.length
          }
        );
      }
    } catch (error) {
      logger.error('Daily reminder cron job failed', {
        error: error.message,
        stack: error.stack,
        duration: `${new Date() - jobStartTime}ms`
      });

      // Log cron job failure
      await activityLogService.logCronJobFailure('daily_reminder', error);
    }
  }

  /**
   * Get all approvers who should receive daily reminders
   * Includes: HR staff, Owner, Project Coordinators
   * @returns {Promise<Array<string>>} Array of unique approver emails
   */
  async getAllApprovers() {
    try {
      // Get HR staff emails via n8n
      const hrStaff = await n8nService.getHRStaff();

      // Get all Project Coordinators
      const projectCoordinators = await n8nService.getApproversByDesignation('Project Coordinator');

      // Get Lead Project Coordinators
      const leadCoordinators = await n8nService.getApproversByDesignation('Lead Project Coordinator');

      // Combine all approvers and remove duplicates
      const allApprovers = [
        ...hrStaff,
        ...projectCoordinators,
        ...leadCoordinators
      ];

      const uniqueApprovers = [...new Set(allApprovers)];

      logger.info('Retrieved all approvers', {
        hrCount: hrStaff.length,
        pcCount: projectCoordinators.length,
        leadPcCount: leadCoordinators.length,
        totalUnique: uniqueApprovers.length
      });

      return uniqueApprovers;
    } catch (error) {
      logger.error('Failed to get all approvers', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format the daily reminder email HTML
   * @param {Array} pendingRequests - List of pending requests
   * @returns {string} HTML email content
   */
  formatDailyReminderEmail(pendingRequests) {
    const requestRows = pendingRequests.map(request => {
      const date = new Date(request.payroll_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const hours = Math.abs(request.hours);
      const minutes = request.minutes || 0;
      const type = request.hours >= 0 ? 'OT' : 'UT';

      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px 8px;">${request.id}</td>
          <td style="padding: 12px 8px;">${request.employee_name || request.frappe_employee_id}</td>
          <td style="padding: 12px 8px;">${type}</td>
          <td style="padding: 12px 8px;">${date}</td>
          <td style="padding: 12px 8px;">${hours}h ${minutes}m</td>
          <td style="padding: 12px 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${request.reason}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f8f9fa; padding: 20px; }
          .table-container { background-color: white; border-radius: 5px; overflow: hidden; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #6c757d; color: white; padding: 12px 8px; text-align: left; font-weight: 600; }
          td { padding: 12px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Daily Reminder: Pending OT/UT Requests</h1>
          </div>
          <div class="content">
            <p>Good morning!</p>
            <p>You have <strong>${pendingRequests.length}</strong> pending overtime/undertime request(s) awaiting your review and approval.</p>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${requestRows}
                </tbody>
              </table>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" class="button">
                Review Pending Requests
              </a>
            </p>

            <p style="color: #6c757d; font-size: 14px;">
              <strong>Note:</strong> This is an automated daily reminder sent every workday at 8:00 AM Philippines time.
              Please review and process pending requests promptly to ensure timely payroll processing.
            </p>
          </div>
          <div class="footer">
            <p>Rooche Digital OTS - Overtime Tracking System</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Manually trigger daily reminder (for testing)
   */
  async triggerDailyReminder() {
    logger.info('Manually triggering daily reminder...');
    await this.sendDailyReminder();
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    logger.info('Stopping all scheduled jobs...');
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: true
      };
    });
    return status;
  }
}

export default new SchedulerService();
