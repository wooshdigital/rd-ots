import axios from 'axios';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class N8nService {
  constructor() {
    this.initialized = false;
    this.baseUrl = null;
    this.axiosInstance = null;
  }

  /**
   * Initialize the service (lazy initialization)
   * Called automatically on first use
   */
  _ensureInitialized() {
    if (this.initialized) {
      return;
    }

    this.baseUrl = process.env.N8N_BASE_URL;

    if (!this.baseUrl) {
      logger.error('N8N_BASE_URL is not configured in environment variables');
      throw new Error('N8N_BASE_URL must be configured');
    }

    // Remove trailing slash if present
    this.baseUrl = this.baseUrl.replace(/\/$/, '');

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.initialized = true;
    logger.info('N8nService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Process overtime/undertime request via n8n
   * This webhook will handle:
   * - Checking if Overtime System is enabled (ERPNext)
   * - Finding employee by email (ERPNext)
   * - Validating employee
   * - Checking for duplicates
   * - Storing in Supabase
   * - Sending confirmation emails (Gmail)
   * - Routing to approvers based on hierarchy
   */
  async processRequest(requestData) {
    this._ensureInitialized();

    try {
      logger.info('Sending request to n8n workflow', { email: requestData.email });

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_PROCESS_REQUEST,
        {
          'Email Address': requestData.email,
          'Type of request': requestData.requestType,
          'Date Affected': this.formatDate(requestData.dateAffected),
          'Number of hours': requestData.numberOfHours,
          'Minutes': requestData.minutes,
          'Reason for Overtime / Undertime': requestData.reason,
          'Project/Task Associated': requestData.projectTaskAssociated,
          'Timestamp': new Date().toISOString()
        }
      );

      logger.info('n8n workflow response received', {
        status: response.status,
        data: response.data
      });

      return {
        success: true,
        message: 'Request processed successfully',
        data: response.data
      };
    } catch (error) {
      logger.error('Error calling n8n workflow', {
        error: error.message,
        response: error.response?.data
      });

      throw new AppError(
        error.response?.data?.message || 'Failed to process request through workflow',
        error.response?.status || 500
      );
    }
  }

  /**
   * Handle approval/rejection webhook responses
   * This is called when approvers click approve/reject buttons in emails
   */
  async handleApprovalResponse(action, approverId, requestId) {
    this._ensureInitialized();

    try {
      logger.info('Processing approval action', { action, approverId, requestId });

      const response = await this.axiosInstance.get(
        `${process.env.N8N_WEBHOOK_APPROVAL}`,
        {
          params: {
            action,
            approver_id: approverId,
            id: requestId
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Error processing approval', {
        error: error.message,
        response: error.response?.data
      });

      throw new AppError(
        'Failed to process approval action',
        error.response?.status || 500
      );
    }
  }

  /**
   * Validate employee via ERPNext (through n8n)
   * Returns employee info if valid
   */
  async validateEmployee(email) {
    this._ensureInitialized();

    try {
      logger.info('Validating employee via ERPNext', { email });

      // Check if using unified ERPNext service or separate workflow
      const useERPNextService = process.env.N8N_USE_ERPNEXT_SERVICE === 'true';

      let webhookPath;
      let requestPayload;

      if (useERPNextService) {
        // Use unified ERPNext service with switch case
        webhookPath = process.env.N8N_WEBHOOK_ERPNEXT_SERVICE;
        if (!webhookPath) {
          throw new Error('N8N_WEBHOOK_ERPNEXT_SERVICE is not configured');
        }
        requestPayload = {
          operation: 'validate_employee',
          email
        };
        logger.info('Using unified ERPNext service', { webhookPath });
      } else {
        // Use simple dedicated workflow (default)
        webhookPath = process.env.N8N_WEBHOOK_VALIDATE_EMPLOYEE;
        if (!webhookPath) {
          throw new Error('N8N_WEBHOOK_VALIDATE_EMPLOYEE is not configured');
        }
        requestPayload = { email };
        logger.info('Using dedicated validate employee workflow', { webhookPath });
      }

      const fullUrl = `${this.baseUrl}${webhookPath}`;
      logger.info('Calling n8n webhook', { url: fullUrl, payload: requestPayload });

      const response = await this.axiosInstance.post(webhookPath, requestPayload);

      // Handle response format - n8n may return an array or object
      let employeeData = response.data;

      // If response is an array, take the first element
      if (Array.isArray(employeeData) && employeeData.length > 0) {
        employeeData = employeeData[0];
      }

      // Normalize the response to have consistent field names
      const normalizedData = {
        frappe_employee_id: employeeData.employee || employeeData.frappe_employee_id,
        employee_name: employeeData.employee_name,
        reports_to: employeeData.reports_to,
        designation: employeeData.designation,
        company_email: employeeData.company_email || email
      };

      logger.info('Employee validation successful', {
        email,
        employeeId: normalizedData.frappe_employee_id
      });

      return normalizedData;
    } catch (error) {
      // Enhanced error logging
      const errorDetails = {
        email,
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        baseURL: error.config?.baseURL
      };

      logger.error('Error validating employee', errorDetails);

      // Provide more specific error messages
      if (error.code === 'ECONNREFUSED') {
        throw new AppError(
          `Unable to connect to n8n service at ${this.baseUrl}. Please check if n8n is running.`,
          503
        );
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new AppError(
          'Request to n8n service timed out. Please try again.',
          504
        );
      }

      if (error.response?.status === 404) {
        throw new AppError(
          `n8n webhook endpoint not found. Please verify the webhook configuration.`,
          404
        );
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new AppError(
          'Authentication failed with n8n service. Please check webhook configuration.',
          error.response.status
        );
      }

      // Return the error from n8n if available
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          'Failed to validate employee';

      throw new AppError(
        errorMessage,
        error.response?.status || 500
      );
    }
  }

  /**
   * Get employee details via ERPNext (through n8n)
   * Only available when using unified ERPNext service
   */
  async getEmployeeDetails(employeeId) {
    this._ensureInitialized();

    try {
      logger.info('Getting employee details via ERPNext', { employeeId });

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_ERPNEXT_SERVICE || '/webhook/erpnext-service',
        {
          operation: 'get_employee_details',
          employee_id: employeeId
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error getting employee details', {
        error: error.message,
        response: error.response?.data
      });

      throw new AppError(
        error.response?.data?.message || 'Failed to get employee details',
        error.response?.status || 500
      );
    }
  }

  /**
   * Get approver for employee via ERPNext (through n8n)
   * Only available when using unified ERPNext service
   */
  async getApprover(employeeId) {
    this._ensureInitialized();

    try {
      logger.info('Getting approver via ERPNext', { employeeId });

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_ERPNEXT_SERVICE || '/webhook/erpnext-service',
        {
          operation: 'get_approver',
          employee_id: employeeId
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error getting approver', {
        error: error.message,
        response: error.response?.data
      });

      throw new AppError(
        error.response?.data?.message || 'Failed to get approver',
        error.response?.status || 500
      );
    }
  }

  /**
   * Create Additional Salary document in ERPNext
   * Called after request is approved
   */
  async createAdditionalSalary(requestData) {
    this._ensureInitialized();

    try {
      logger.info('Creating Additional Salary in ERPNext', {
        employeeId: requestData.frappe_employee_id,
        payrollDate: requestData.payroll_date
      });

      // Format notes to include all relevant information
      const notes = `Reason: ${requestData.reason}\n` +
                   `Projects: ${requestData.projects_affected}\n` +
                   `Approved by: ${requestData.approved_by}\n` +
                   `Requested on: ${new Date(requestData.created_at).toLocaleDateString()}`;

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_ERPNEXT_SERVICE || '/webhook/erpnext-service',
        {
          operation: 'create_additional_salary',
          employee_id: requestData.frappe_employee_id,
          payroll_date: requestData.payroll_date,
          salary_component: requestData.hours >= 0 ? 'Overtime' : 'Undertime',
          hours: Math.abs(parseFloat(requestData.hours)),
          notes
        }
      );

      logger.info('Additional Salary created successfully', {
        employeeId: requestData.frappe_employee_id,
        documentName: response.data?.name
      });

      return response.data;
    } catch (error) {
      logger.error('Error creating Additional Salary', {
        error: error.message,
        response: error.response?.data
      });

      throw new AppError(
        error.response?.data?.message || 'Failed to create Additional Salary in ERPNext',
        error.response?.status || 500
      );
    }
  }

  /**
   * Check if duplicate Additional Salary exists in ERPNext
   */
  async checkDuplicateSalary(employeeId, payrollDate, salaryComponent) {
    this._ensureInitialized();

    try {
      logger.info('Checking for duplicate Additional Salary in ERPNext', {
        employeeId,
        payrollDate,
        salaryComponent
      });

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_ERPNEXT_SERVICE || '/webhook/erpnext-service',
        {
          operation: 'check_duplicate_salary',
          employee_id: employeeId,
          payroll_date: payrollDate,
          salary_component: salaryComponent
        }
      );

      const hasDuplicate = response.data?.data && response.data.data.length > 0;

      return {
        hasDuplicate,
        existingRecords: response.data?.data || []
      };
    } catch (error) {
      logger.error('Error checking duplicate salary', {
        error: error.message,
        response: error.response?.data
      });

      // Don't throw - treat as no duplicate if check fails
      logger.warn('Duplicate check failed, assuming no duplicate');
      return { hasDuplicate: false, existingRecords: [] };
    }
  }

  /**
   * Send notification emails via n8n Gmail node
   */
  async sendNotification(recipients, subject, message, requestData) {
    this._ensureInitialized();

    try {
      logger.info('Sending notification emails', { recipients, subject });

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_SEND_NOTIFICATION || '/webhook/send-notification',
        {
          to: recipients.join(','),
          subject,
          message,
          requestData
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error sending notification', {
        error: error.message,
        response: error.response?.data
      });

      // Don't throw error here - notification failure shouldn't block request submission
      logger.warn('Notification failed but continuing with request submission');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active HR staff email addresses from ERPNext
   * Queries for employees with designation containing "Human Resources"
   */
  async getHRStaff() {
    this._ensureInitialized();

    try {
      logger.info('Getting all active HR staff from ERPNext');

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_ERPNEXT_SERVICE || '/webhook/erpnext-service',
        {
          operation: 'get_hr_staff'
        }
      );

      // Extract email addresses from response
      const hrStaff = response.data?.data || [];
      const emails = hrStaff
        .filter(employee => employee.company_email)
        .map(employee => employee.company_email);

      logger.info('HR staff retrieved', { count: emails.length });
      return emails;
    } catch (error) {
      logger.error('Error getting HR staff', {
        error: error.message,
        response: error.response?.data
      });

      throw new AppError(
        error.response?.data?.message || 'Failed to get HR staff from ERPNext',
        error.response?.status || 500
      );
    }
  }

  /**
   * Get approvers by designation pattern from ERPNext
   * @param {string} designationPattern - Designation to search for (e.g., "Project Coordinator")
   * @returns {Promise<Array<string>>} Array of email addresses
   */
  async getApproversByDesignation(designationPattern) {
    this._ensureInitialized();

    try {
      logger.info('Getting approvers by designation from ERPNext', { designationPattern });

      const response = await this.axiosInstance.post(
        process.env.N8N_WEBHOOK_ERPNEXT_SERVICE || '/webhook/erpnext-service',
        {
          operation: 'get_approvers_by_designation',
          designation: designationPattern
        }
      );

      // Extract email addresses from response
      const approvers = response.data?.data || [];
      const emails = approvers
        .filter(employee => employee.company_email)
        .map(employee => employee.company_email);

      logger.info('Approvers by designation retrieved', {
        designationPattern,
        count: emails.length
      });
      return emails;
    } catch (error) {
      logger.error('Error getting approvers by designation', {
        error: error.message,
        designationPattern,
        response: error.response?.data
      });

      throw new AppError(
        error.response?.data?.message || 'Failed to get approvers by designation from ERPNext',
        error.response?.status || 500
      );
    }
  }

  /**
   * Format date to MM/DD/YYYY format expected by n8n workflow
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
}

export default new N8nService();
