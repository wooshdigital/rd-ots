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
   * @param {string} employeeData.employee_id - Employee's ERPNext ID
   * @param {string} employeeData.employee_name - Employee's full name
   * @param {string} employeeData.designation - Employee's designation
   * @param {string} employeeData.reports_to - Employee ID of direct supervisor
   * @returns {Promise<Array<string>>} Array of approver email addresses
   */
  async getApprovers(employeeData) {
    try {
      const approvers = [];
      const { designation, reports_to, employee_name, employee_id } = employeeData;

      logger.info('Determining approvers for employee', {
        employee_id,
        employee_name,
        designation,
        reports_to
      });

      // HR email for owner-related cases – pulled from .env
      const ownerHrEmail = process.env.OWNER_HR_EMAIL?.trim() || 'hr@rooche.digital';

      // ─────────────────────────────────────────────────────
      // 1. OWNER CASE – highest priority
      //    - Employee ID is HR-EMP-00001
      //    - Name is "Rj Salazar Cristy"
      //    - Designation contains "owner" (just in case)
      //    - Anyone reporting directly to HR-EMP-00001 or "Rj Salazar Cristy"
      // ─────────────────────────────────────────────────────
      const isOwnerById = employee_id === 'HR-EMP-00001';
      const isOwnerByName = employee_name === 'Rj Salazar Cristy';
      const isOwnerDesignation = designation && designation.toLowerCase().includes('owner');
      const reportsToOwner = reports_to === 'HR-EMP-00001' || reports_to === 'Rj Salazar Cristy';

      if (isOwnerById || isOwnerByName || isOwnerDesignation || reportsToOwner) {
        logger.info('Owner or direct report of Owner → routing ONLY to hr@rooche.digital', {
          employee_id,
          employee_name,
          designation,
          reports_to,
          targetEmail: ownerHrEmail
        });

        return [ownerHrEmail]; // Early return – bypass all other rules
      }

      // ─────────────────────────────────────────────────────
      // 2. Normal routing (unchanged)
      // ─────────────────────────────────────────────────────
      if (designation?.includes('Project Coordinator')) {
        logger.info('Project Coordinator → notifying all Project Coordinators');
        const coords = await this.getApproversByDesignation('Project Coordinator');
        approvers.push(...coords);
      }
      else if (designation?.includes('Lead Generation')) {
        logger.info('Lead Generation → notifying all Lead Project Coordinators');
        const leads = await this.getApproversByDesignation('Lead Project Coordinator');
        approvers.push(...leads);
      }
      else if (reports_to) {
        // Default: direct supervisor
        logger.info('Default routing → direct supervisor');
        const supervisor = await n8nService.getEmployeeDetails(reports_to);
        if (supervisor?.company_email) {
          approvers.push(supervisor.company_email);
        }
      } else {
        logger.warn('No reports_to and no special designation found');
      }

      const uniqueApprovers = [...new Set(approvers)];
      logger.info('Final approvers', { count: uniqueApprovers.length, approvers: uniqueApprovers });
      return uniqueApprovers;

    } catch (error) {
      logger.error('Error in getApprovers', { error: error.message, employeeData });
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
