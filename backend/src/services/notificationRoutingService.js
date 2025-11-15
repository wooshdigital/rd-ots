import n8nService from './n8nService.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Service for determining notification recipients based on organizational hierarchy
 * Matches the logic from the original n8n workflow.json
 */
class NotificationRoutingService {
  /**
   * Get approvers for a given employee based on designation and reports_to hierarchy
   * @param {Object} employeeData - Employee data from ERPNext
   * @param {string} employeeData.designation - Employee's designation
   * @param {string} employeeData.reports_to - Employee ID of direct supervisor
   * @returns {Promise<Array<string>>} Array of approver email addresses
   */
  async getApprovers(employeeData) {
    try {
      const approvers = [];
      const { designation, reports_to } = employeeData;

      logger.info('Determining approvers for employee', {
        designation,
        reports_to
      });

      // Special case: If reports to specific HR manager (HR-EMP-00001)
      if (reports_to === 'HR-EMP-00001') {
        logger.info('Employee reports to HR-EMP-00001, fetching that manager');
        const hrManager = await n8nService.getEmployeeDetails(reports_to);
        if (hrManager?.company_email) {
          approvers.push(hrManager.company_email);
        }
        return approvers;
      }

      // Route based on designation
      if (designation?.includes('Project Coordinator')) {
        logger.info('Employee is Project Coordinator, fetching all Project Coordinators');
        const projectCoordinators = await this.getApproversByDesignation('Project Coordinator');
        approvers.push(...projectCoordinators);
      }
      else if (designation?.includes('Lead Generation')) {
        logger.info('Employee is Lead Generation, fetching Lead Project Coordinators');
        const leadCoordinators = await this.getApproversByDesignation('Lead Project Coordinator');
        approvers.push(...leadCoordinators);
      }
      else {
        // Default: Send to direct supervisor (reports_to)
        logger.info('Using default routing: direct supervisor from reports_to field');
        if (reports_to) {
          const supervisor = await n8nService.getEmployeeDetails(reports_to);
          if (supervisor?.company_email) {
            approvers.push(supervisor.company_email);
            logger.info('Direct supervisor found', {
              supervisorId: reports_to,
              email: supervisor.company_email
            });
          } else {
            logger.warn('Direct supervisor has no company_email', { supervisorId: reports_to });
          }
        } else {
          logger.warn('No reports_to field found for employee');
        }
      }

      // Remove duplicates
      const uniqueApprovers = [...new Set(approvers)];

      logger.info('Approvers determined', {
        count: uniqueApprovers.length,
        approvers: uniqueApprovers
      });

      return uniqueApprovers;
    } catch (error) {
      logger.error('Error determining approvers', {
        error: error.message,
        employeeData
      });
      // Don't throw - return empty array to allow other notifications to proceed
      return [];
    }
  }

  /**
   * Get all active HR staff email addresses
   * @returns {Promise<Array<string>>} Array of HR staff email addresses
   */
  async getHRStaff() {
    try {
      logger.info('Fetching all active HR staff');
      const hrStaff = await n8nService.getHRStaff();

      logger.info('HR staff retrieved', { count: hrStaff.length });
      return hrStaff;
    } catch (error) {
      logger.error('Error fetching HR staff', { error: error.message });
      // Don't throw - return empty array to allow other notifications to proceed
      return [];
    }
  }

  /**
   * Get approvers by designation pattern
   * @param {string} designationPattern - Designation to search for
   * @returns {Promise<Array<string>>} Array of email addresses
   */
  async getApproversByDesignation(designationPattern) {
    try {
      logger.info('Fetching approvers by designation', { designationPattern });
      const approvers = await n8nService.getApproversByDesignation(designationPattern);

      logger.info('Approvers by designation retrieved', {
        designationPattern,
        count: approvers.length
      });
      return approvers;
    } catch (error) {
      logger.error('Error fetching approvers by designation', {
        error: error.message,
        designationPattern
      });
      return [];
    }
  }

  /**
   * Get all notification recipients for a new request submission
   * Combines HR staff + Approvers (based on hierarchy)
   * @param {Object} employeeData - Employee data from ERPNext
   * @returns {Promise<Array<string>>} Array of all recipient email addresses
   */
  async getAllRecipients(employeeData) {
    try {
      logger.info('Getting all notification recipients for request submission');

      // Get both HR staff and approvers in parallel
      const [hrStaff, approvers] = await Promise.all([
        this.getHRStaff(),
        this.getApprovers(employeeData)
      ]);

      // Combine and deduplicate
      const allRecipients = [...new Set([...hrStaff, ...approvers])];

      logger.info('All recipients determined', {
        total: allRecipients.length,
        hrCount: hrStaff.length,
        approverCount: approvers.length,
        recipients: allRecipients
      });

      return allRecipients;
    } catch (error) {
      logger.error('Error getting all recipients', {
        error: error.message,
        employeeData
      });
      return [];
    }
  }
}

export default new NotificationRoutingService();
