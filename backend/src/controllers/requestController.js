import n8nService from '../services/n8nService.js';
import requestService from '../services/requestService.js';
import notificationRoutingService from '../services/notificationRoutingService.js';
import dbAdapter from '../config/database.js';
import logger from '../utils/logger.js';
import { getEmailTemplate } from '../templates/emailTemplates.js';

class RequestController {
  /**
   * Submit a new overtime/undertime request
   * POST /api/requests
   */
  async submitRequest(req, res, next) {
    try {
      const requestData = req.body;

      logger.info('Submitting new request', {
        email: requestData.email,
        type: requestData.requestType
      });

      // Step 1: Validate employee via ERPNext (through n8n)
      const employee = await n8nService.validateEmployee(requestData.email);

      if (!employee || !employee.frappe_employee_id) {
        return res.status(400).json({
          success: false,
          message: 'Employee not found or invalid email address'
        });
      }

      // Step 2: Check for duplicates (already done on frontend, but double-check)
      const duplicateCheck = await requestService.checkDuplicate(
        employee.frappe_employee_id,
        requestData.dateAffected
      );

      if (duplicateCheck.hasDuplicate) {
        logger.warn('Duplicate request detected', {
          employeeId: employee.frappe_employee_id,
          date: requestData.dateAffected
        });
        // Allow duplicate but log it
      }

      // Step 3: Store in database directly
      const newRequest = await dbAdapter.insertRequest({
        frappe_employee_id: employee.frappe_employee_id,
        payroll_date: requestData.dateAffected,
        hours: parseFloat(requestData.numberOfHours),
        minutes: parseInt(requestData.minutes),
        reason: requestData.reason,
        projects_affected: requestData.projectTaskAssociated
      });

      // Step 4: Send immediate notifications using dynamic routing
      // Get all recipients (HR staff + Approvers based on hierarchy)
      const allRecipients = await notificationRoutingService.getAllRecipients(employee);

      // Send confirmation to employee
      const { subject: employeeSubject, message: employeeMessage } = getEmailTemplate('request_submitted', {
        employeeName: employee.employee_name || 'Employee',
        requestType: requestData.requestType,
        dateAffected: requestData.dateAffected,
        numberOfHours: requestData.numberOfHours,
        minutes: requestData.minutes,
        reason: requestData.reason,
        projectTaskAssociated: requestData.projectTaskAssociated
      });

      n8nService.sendNotification(
        [requestData.email],
        employeeSubject,
        employeeMessage,
        {
          ...requestData,
          employeeId: employee.frappe_employee_id,
          employeeName: employee.employee_name,
          requestId: newRequest.id
        }
      ).catch(err => {
        logger.error('Failed to send employee confirmation email', { error: err.message });
      });

      // Send admin notification to HR staff + Approvers
      if (allRecipients.length > 0) {
        const { subject: adminSubject, message: adminMessage } = getEmailTemplate('admin_notification', {
          employeeName: employee.employee_name || requestData.email,
          employeeId: employee.frappe_employee_id,
          requestType: requestData.requestType,
          dateAffected: requestData.dateAffected,
          numberOfHours: requestData.numberOfHours,
          minutes: requestData.minutes,
          reason: requestData.reason,
          projectTaskAssociated: requestData.projectTaskAssociated,
          requestId: newRequest.id
        });

        n8nService.sendNotification(
          allRecipients,
          adminSubject,
          adminMessage,
          {
            ...requestData,
            employeeId: employee.frappe_employee_id,
            employeeName: employee.employee_name,
            requestId: newRequest.id
          }
        ).catch(err => {
          logger.error('Failed to send admin notification emails', { error: err.message });
        });
      } else {
        logger.warn('No notification recipients found (no HR staff or approvers)', {
          employeeId: employee.frappe_employee_id
        });
      }

      res.status(201).json({
        success: true,
        message: 'Request submitted successfully. Admins have been notified.',
        data: {
          id: newRequest.id,
          employeeId: employee.frappe_employee_id,
          employeeName: employee.employee_name,
          status: 'pending'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all requests with optional filtering
   * GET /api/requests
   */
  async getAllRequests(req, res, next) {
    try {
      const filters = {
        email: req.query.email,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      const requests = await requestService.getAllRequests(filters);

      res.json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single request by ID
   * GET /api/requests/:id
   */
  async getRequestById(req, res, next) {
    try {
      const { id } = req.params;
      const request = await requestService.getRequestById(id);

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get requests by employee
   * GET /api/requests/employee/:employeeId
   */
  async getRequestsByEmployee(req, res, next) {
    try {
      const { employeeId } = req.params;
      const requests = await requestService.getRequestsByEmployee(employeeId);

      res.json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending requests (with role-based filtering)
   * GET /api/requests/pending
   */
  async getPendingRequests(req, res, next) {
    try {
      const user = req.user; // Set by verifySession middleware
      let requests = await requestService.getPendingRequests();

      // Apply role-based filtering
      if (user.role === 'Owner' || user.role === 'HR') {
        // Owner and HR can see ALL pending requests
        // No filtering needed
      } else if (user.role === 'Project Coordinator' || user.erpnext_employee_id) {
        // Project Coordinators and other supervisors can only see requests from their direct reports
        // Filter requests where the employee reports to this user
        const erpnextService = await import('../services/erpnextService.js');
        const directReports = await erpnextService.default.getDirectReports(user.erpnext_employee_id);
        const directReportIds = directReports.map(emp => emp.employee_id);

        requests = requests.filter(request =>
          directReportIds.includes(request.frappe_employee_id)
        );
      } else {
        // Regular employees cannot access pending requests
        requests = [];
      }

      res.json({
        success: true,
        count: requests.length,
        data: requests,
        userRole: user.role // Include role for debugging
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get statistics
   * GET /api/requests/stats
   */
  async getStatistics(req, res, next) {
    try {
      const { employeeId } = req.query;
      const stats = await requestService.getStatistics(employeeId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Webhook endpoint for n8n to notify about approval/rejection
   * POST /api/requests/webhook/status-update
   */
  async handleStatusUpdate(req, res, next) {
    try {
      const { requestId, status, approvedBy, rejectReason } = req.body;

      logger.info('Received status update from n8n', {
        requestId,
        status
      });

      res.json({
        success: true,
        message: 'Status update received'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check for duplicate requests
   * GET /api/requests/check-duplicate
   */
  async checkDuplicate(req, res, next) {
    try {
      const { email, payrollDate } = req.query;

      if (!email || !payrollDate) {
        return res.status(400).json({
          success: false,
          message: 'email and payrollDate are required'
        });
      }

      // Validate employee to get frappe_employee_id
      const employee = await n8nService.validateEmployee(email);

      if (!employee || !employee.frappe_employee_id) {
        return res.status(400).json({
          success: false,
          message: 'Employee not found or invalid email address'
        });
      }

      const result = await requestService.checkDuplicate(employee.frappe_employee_id, payrollDate);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a request
   * POST /api/requests/:id/approve
   */
  async approveRequest(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user; // Get from session
      const approvedBy = user.email; // Use logged-in user's email

      logger.info('Approving request', { id, approvedBy, approverRole: user.role });

      // Step 1: Update request status in database
      const request = await requestService.approveRequest(id, approvedBy);

      // Step 2: Create Additional Salary in ERPNext
      try {
        await n8nService.createAdditionalSalary(request);
        logger.info('Additional Salary created in ERPNext', { requestId: id });
      } catch (erpError) {
        logger.error('Failed to create Additional Salary in ERPNext', {
          error: erpError.message,
          requestId: id
        });
        // Continue even if ERPNext creation fails - can be done manually
      }

      // Step 3: Send approval notification to employee (immediate, non-blocking)
      const subject = `Your ${request.hours >= 0 ? 'Overtime' : 'Undertime'} Request Has Been Approved`;
      const message = `
        <!DOCTYPE html>
        <html>
        <body>
          <p>Good news!</p>
          <p>Your request has been approved by ${approvedBy}.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Request Details:</strong>
            <ul>
              <li><strong>Date:</strong> ${new Date(request.payroll_date).toLocaleDateString()}</li>
              <li><strong>Hours:</strong> ${Math.abs(request.hours)}.${request.minutes || 0}</li>
              <li><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Approved</span></li>
            </ul>
          </div>
          <p>The approved hours will be reflected in your next payroll.</p>
          <p>Thanks,<br><em>Rooche Digital Automations</em></p>
        </body>
        </html>
      `;

      // Get employee email to send notification
      try {
        const employeeDetails = await n8nService.getEmployeeDetails(request.frappe_employee_id);
        if (employeeDetails?.company_email) {
          n8nService.sendNotification(
            [employeeDetails.company_email],
            subject,
            message,
            request
          ).catch(err => {
            logger.error('Failed to send approval notification', { error: err.message });
          });
        }
      } catch (emailError) {
        logger.error('Failed to get employee email for notification', {
          error: emailError.message
        });
      }

      res.json({
        success: true,
        message: 'Request approved successfully. Additional Salary will be created in ERPNext.',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject a request
   * POST /api/requests/:id/reject
   */
  async rejectRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = req.user; // Get from session
      const rejectedBy = user.email; // Use logged-in user's email

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'reason is required'
        });
      }

      logger.info('Rejecting request', { id, rejectedBy, rejectorRole: user.role });

      // Update request status in database
      const request = await requestService.rejectRequest(id, rejectedBy, reason);

      // Send rejection notification to employee (immediate, non-blocking)
      const subject = `Your ${request.hours >= 0 ? 'Overtime' : 'Undertime'} Request Has Been Rejected`;
      const message = `
        <!DOCTYPE html>
        <html>
        <body>
          <p>Hi there,</p>
          <p>Unfortunately, your request has been rejected by ${rejectedBy}.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Request Details:</strong>
            <ul>
              <li><strong>Date:</strong> ${new Date(request.payroll_date).toLocaleDateString()}</li>
              <li><strong>Hours:</strong> ${Math.abs(request.hours)}.${request.minutes || 0}</li>
              <li><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">Rejected</span></li>
              <li><strong>Reason for rejection:</strong> ${reason}</li>
            </ul>
          </div>
          <p>If you have any questions, please contact your supervisor or HR.</p>
          <p>Thanks,<br><em>Rooche Digital Automations</em></p>
        </body>
        </html>
      `;

      // Get employee email to send notification
      try {
        const employeeDetails = await n8nService.getEmployeeDetails(request.frappe_employee_id);
        if (employeeDetails?.company_email) {
          n8nService.sendNotification(
            [employeeDetails.company_email],
            subject,
            message,
            request
          ).catch(err => {
            logger.error('Failed to send rejection notification', { error: err.message });
          });
        }
      } catch (emailError) {
        logger.error('Failed to get employee email for notification', {
          error: emailError.message
        });
      }

      res.json({
        success: true,
        message: 'Request rejected successfully',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RequestController();
