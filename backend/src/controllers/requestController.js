import n8nService from '../services/n8nService.js';
import requestService from '../services/requestService.js';
import notificationRoutingService from '../services/notificationRoutingService.js';
import activityLogService from '../services/activityLogService.js';
import dbAdapter from '../config/database.js';
import logger from '../utils/logger.js';
import { getEmailTemplate } from '../templates/emailTemplates.js';
import { io } from '../server.js';

/**
 * Helper: Check if user can approve a specific request
 * Based on ERPNext reports_to hierarchy + HR delegation
 */
function canUserApproveRequest(user, request, directReportIds, ownerDirectReportIds = []) {
  // Cannot approve own request
  if (request.frappe_employee_id === user.erpnext_employee_id) {
    return false;
  }

  // Cannot approve already processed requests
  if (request.approved_by || request.reject_reason) {
    return false;
  }

  // Check if request is from a direct report
  if (directReportIds.includes(request.frappe_employee_id)) {
    return true;
  }

  // HR can also approve Owner's direct reports (delegation)
  if (user.role === 'HR' && ownerDirectReportIds.includes(request.frappe_employee_id)) {
    return true;
  }

  return false;
}

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
        employee_name: employee.employee_name,
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
        ).then(() => {
          // Log successful notification to activity log
          activityLogService.logRequestSubmitted(
            requestData.email,
            allRecipients,
            newRequest.id
          ).catch(err => {
            logger.error('Failed to log request submission activity', { error: err.message });
          });
        }).catch(err => {
          logger.error('Failed to send admin notification emails', { error: err.message });
          // Log failed notification
          activityLogService.logNotificationSent(
            allRecipients,
            adminSubject,
            {
              requestId: newRequest.id,
              notificationType: 'request_submission',
              status: activityLogService.STATUS.FAILED
            }
          ).catch(logErr => {
            logger.error('Failed to log notification failure', { error: logErr.message });
          });
        });
      } else {
        logger.warn('No notification recipients found (no HR staff or approvers)', {
          employeeId: employee.frappe_employee_id
        });
      }

      // Emit real-time notification to admins via WebSocket
      io.to('admins').emit('new-request', {
        id: newRequest.id,
        frappe_employee_id: employee.frappe_employee_id,
        employee_name: employee.employee_name,
        payroll_date: requestData.dateAffected,
        hours: parseFloat(requestData.numberOfHours),
        minutes: parseInt(requestData.minutes),
        reason: requestData.reason,
        projects_affected: requestData.projectTaskAssociated,
        request_type: requestData.requestType,
        created_at: new Date().toISOString()
      });

      logger.info('Real-time notification sent to admins', { requestId: newRequest.id });

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
   * SECURITY: Non-admin users can only see their own requests
   */
  async getAllRequests(req, res, next) {
    try {
      const user = req.user; // Set by verifySession middleware
      const filters = {
        employeeId: req.query.employeeId,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      // Fetch all requests matching basic filters
      let requests = await requestService.getAllRequests(filters);

      // Get direct reports for approval permission checking
      let directReportIds = [];
      let ownerDirectReportIds = [];

      if (user.erpnext_employee_id) {
        const erpnextService = await import('../services/erpnextService.js');

        // Get user's own direct reports
        const directReports = await erpnextService.default.getDirectReports(user.erpnext_employee_id);
        directReportIds = directReports.map(emp => emp.employee_id);

        // If user is HR, also get Owner's direct reports (delegation)
        // HR acts as delegate for the company owner (RJ - HR-EMP-00001)
        if (user.role === 'HR') {
          try {
            // RJ's employee ID from ERPNext
            const ownerEmployeeId = 'HR-EMP-00001';
            const ownerReports = await erpnextService.default.getDirectReports(ownerEmployeeId);
            ownerDirectReportIds = ownerReports.map(emp => emp.employee_id);
            logger.info('HR delegation: fetched Owner direct reports', {
              count: ownerDirectReportIds.length,
              ownerEmployeeId
            });
          } catch (error) {
            logger.warn('Failed to fetch Owner direct reports for HR delegation', { error: error.message });
          }
        }
      }

      // SECURITY: Enforce role-based access control for VIEWING requests
      // Owner, HR, and Project Coordinators can see ALL requests
      if (user.role === 'Owner' || user.role === 'HR' || user.role === 'Project Coordinator') {
        // No filtering - they can view all requests
        // Add approval permission flag to each request
        requests = requests.map(request => ({
          ...request,
          can_approve: canUserApproveRequest(user, request, directReportIds, ownerDirectReportIds)
        }));
      } else {
        // Regular employees can only see their own requests + requests from their direct reports
        // Filter to show only user's own requests and direct reports' requests
        requests = requests
          .filter(request =>
            request.frappe_employee_id === user.erpnext_employee_id || // Own requests
            directReportIds.includes(request.frappe_employee_id) // Direct reports' requests
          )
          .map(request => ({
            ...request,
            can_approve: canUserApproveRequest(user, request, directReportIds, ownerDirectReportIds)
          }));
      }

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
   * SECURITY: Non-admin users can only see their own requests
   */
  async getRequestById(req, res, next) {
    try {
      const user = req.user;
      const { id } = req.params;
      const request = await requestService.getRequestById(id);

      // SECURITY: Check if user has permission to view this request
      // Owner, HR, and Project Coordinators can view any request
      if (user.role === 'Owner' || user.role === 'HR' || user.role === 'Project Coordinator') {
        // No check needed - they have access to view all requests
      } else {
        // Regular employees: check if this is user's own request or from their direct report
        const erpnextService = await import('../services/erpnextService.js');
        const directReports = await erpnextService.default.getDirectReports(user.erpnext_employee_id);
        const directReportIds = directReports.map(emp => emp.employee_id);

        const canView = request.frappe_employee_id === user.erpnext_employee_id ||
                        directReportIds.includes(request.frappe_employee_id);

        if (!canView) {
          return res.status(403).json({
            success: false,
            error: 'Access denied. You can only view your own requests or those from your direct reports.'
          });
        }
      }

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
   * SECURITY: Non-admin users can only see their own requests
   */
  async getRequestsByEmployee(req, res, next) {
    try {
      const user = req.user;
      const { employeeId } = req.params;

      // SECURITY: Check if user has permission to view these requests
      const isAdmin = user.role === 'Owner' || user.role === 'HR' || user.role === 'Project Coordinator';

      if (!isAdmin && user.erpnext_employee_id !== employeeId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only view your own requests.'
        });
      }

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

      // SECURITY: Verify user has permission to approve this request
      const request = await requestService.getRequestById(id);

      // Owner and HR can approve any request
      if (user.role !== 'Owner' && user.role !== 'HR') {
        // Check if request is from a direct report
        const erpnextService = await import('../services/erpnextService.js');
        const directReports = await erpnextService.default.getDirectReports(user.erpnext_employee_id);
        const directReportIds = directReports.map(emp => emp.employee_id);

        if (!directReportIds.includes(request.frappe_employee_id)) {
          logger.warn('Unauthorized approval attempt', {
            userId: user.email,
            userRole: user.role,
            requestId: id,
            requestEmployeeId: request.frappe_employee_id
          });
          return res.status(403).json({
            success: false,
            error: 'Access denied. You can only approve requests from your direct reports.'
          });
        }
      }

      // Step 1: Update request status in database
      const updatedRequest = await requestService.approveRequest(id, approvedBy);

      // Step 2: Create Additional Salary in ERPNext
      let erpNextError = null;
      try {
        await n8nService.createAdditionalSalary(request);
        logger.info('Additional Salary created in ERPNext', { requestId: id });
      } catch (erpError) {
        erpNextError = erpError.message;
        logger.error('Failed to create Additional Salary in ERPNext', {
          error: erpError.message,
          requestId: id,
          employeeId: request.frappe_employee_id
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
          ).then(() => {
            // Log approval notification sent
            activityLogService.logNotificationSent(
              [employeeDetails.company_email],
              subject,
              {
                requestId: id,
                notificationType: 'approval',
                status: activityLogService.STATUS.SUCCESS
              }
            ).catch(err => {
              logger.error('Failed to log approval notification', { error: err.message });
            });
          }).catch(err => {
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
        message: erpNextError
          ? `Request approved successfully. Note: ${erpNextError}. The Additional Salary must be created manually in ERPNext.`
          : 'Request approved successfully. Additional Salary has been created in ERPNext.',
        data: request,
        ...(erpNextError && {
          warning: 'Additional Salary creation failed in ERPNext',
          erpNextError
        })
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

      // SECURITY: Verify user has permission to reject this request
      const request = await requestService.getRequestById(id);

      // Owner and HR can reject any request
      if (user.role !== 'Owner' && user.role !== 'HR') {
        // Check if request is from a direct report
        const erpnextService = await import('../services/erpnextService.js');
        const directReports = await erpnextService.default.getDirectReports(user.erpnext_employee_id);
        const directReportIds = directReports.map(emp => emp.employee_id);

        if (!directReportIds.includes(request.frappe_employee_id)) {
          logger.warn('Unauthorized rejection attempt', {
            userId: user.email,
            userRole: user.role,
            requestId: id,
            requestEmployeeId: request.frappe_employee_id
          });
          return res.status(403).json({
            success: false,
            error: 'Access denied. You can only reject requests from your direct reports.'
          });
        }
      }

      // Update request status in database
      const updatedRequest = await requestService.rejectRequest(id, rejectedBy, reason);

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
          ).then(() => {
            // Log rejection notification sent
            activityLogService.logNotificationSent(
              [employeeDetails.company_email],
              subject,
              {
                requestId: id,
                notificationType: 'rejection',
                status: activityLogService.STATUS.SUCCESS
              }
            ).catch(err => {
              logger.error('Failed to log rejection notification', { error: err.message });
            });
          }).catch(err => {
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
