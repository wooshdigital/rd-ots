/**
 * Email Templates for RD-OTS System
 * All email notifications are generated from these templates
 */

/**
 * Request Submitted - Confirmation email to employee
 */
export const requestSubmittedTemplate = (data) => {
  const { employeeName, requestType, dateAffected, numberOfHours, minutes, reason, projectTaskAssociated } = data;

  return {
    subject: `Confirmation: Your ${requestType} Request Has Been Received`,
    message: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Request Confirmation</h2>
          <p>Hey ${employeeName || 'there'},</p>
          <p>This is a quick confirmation that we have successfully received your ${requestType.toLowerCase()} request. It is now in the queue and pending review.</p>
        </div>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong style="color: #2c3e50;">Request Summary:</strong>
          <ul style="padding-left: 20px;">
            <li><strong>Request Type:</strong> ${requestType}</li>
            <li><strong>Duration:</strong> ${numberOfHours}h ${minutes}m</li>
            <li><strong>Date Affected:</strong> ${dateAffected}</li>
            <li><strong>Project/Task:</strong> ${projectTaskAssociated}</li>
            <li><strong>Current Status:</strong> <span style="color: #ff8c00; font-weight: bold;">Pending Approval</span></li>
          </ul>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Reason for request:</strong></p>
          <p style="margin: 10px 0 0 0;">${reason}</p>
        </div>

        <p>You don't need to take any action at this time. We will send you another email notification as soon as the status of your request is updated.</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
          Thanks,<br>
          <em>Rooche Digital Automations</em>
        </p>
      </body>
      </html>
    `
  };
};

/**
 * Request Submitted - Notification to admins
 */
export const adminNotificationTemplate = (data) => {
  const { employeeName, employeeId, requestType, dateAffected, numberOfHours, minutes, reason, projectTaskAssociated, requestId } = data;

  return {
    subject: `New ${requestType} Request - ${employeeName}`,
    message: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">🔔 New Request Submitted</h2>
          <p style="margin: 0;">A new ${requestType.toLowerCase()} request requires your review.</p>
        </div>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong style="color: #2c3e50;">Employee Details:</strong>
          <ul style="padding-left: 20px;">
            <li><strong>Name:</strong> ${employeeName}</li>
            <li><strong>Employee ID:</strong> ${employeeId}</li>
          </ul>
        </div>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong style="color: #2c3e50;">Request Details:</strong>
          <ul style="padding-left: 20px;">
            <li><strong>Request ID:</strong> #${requestId}</li>
            <li><strong>Type:</strong> ${requestType}</li>
            <li><strong>Duration:</strong> ${numberOfHours}h ${minutes}m</li>
            <li><strong>Date Affected:</strong> ${dateAffected}</li>
            <li><strong>Project/Task:</strong> ${projectTaskAssociated}</li>
          </ul>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0 0 0;">${reason}</p>
        </div>

        <div style="background-color: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <p style="margin: 10px 0 0 0;">Please review and approve/reject this request in the admin dashboard.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
          Thanks,<br>
          <em>Rooche Digital Automations</em>
        </p>
      </body>
      </html>
    `
  };
};

/**
 * Request Approved - Notification to employee
 */
export const requestApprovedTemplate = (data) => {
  const { employeeName, approvedBy, dateAffected, hours, minutes, requestType } = data;

  return {
    subject: `✅ Your ${requestType || 'Overtime'} Request Has Been Approved`,
    message: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin-top: 0;">✅ Request Approved!</h2>
          <p style="color: #155724; margin: 0;">Good news${employeeName ? `, ${employeeName}` : ''}!</p>
        </div>

        <p>Your ${(requestType || 'overtime').toLowerCase()} request has been approved by <strong>${approvedBy}</strong>.</p>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong style="color: #2c3e50;">Approved Request Details:</strong>
          <ul style="padding-left: 20px;">
            <li><strong>Date:</strong> ${new Date(dateAffected).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
            <li><strong>Hours:</strong> ${Math.abs(hours)}h ${minutes || 0}m</li>
            <li><strong>Approved By:</strong> ${approvedBy}</li>
            <li><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Approved</span></li>
          </ul>
        </div>

        <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>What happens next?</strong></p>
          <p style="margin: 10px 0 0 0;">The approved hours will be reflected in your next payroll cycle. No further action is required from you.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
          Thanks,<br>
          <em>Rooche Digital Automations</em>
        </p>
      </body>
      </html>
    `
  };
};

/**
 * Request Rejected - Notification to employee
 */
export const requestRejectedTemplate = (data) => {
  const { employeeName, rejectedBy, dateAffected, hours, minutes, reason, requestType } = data;

  return {
    subject: `❌ Your ${requestType || 'Overtime'} Request Has Been Rejected`,
    message: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin-top: 0;">Request Status Update</h2>
          <p style="color: #721c24; margin: 0;">Hi${employeeName ? ` ${employeeName}` : ' there'},</p>
        </div>

        <p>Unfortunately, your ${(requestType || 'overtime').toLowerCase()} request has been rejected by <strong>${rejectedBy}</strong>.</p>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong style="color: #2c3e50;">Request Details:</strong>
          <ul style="padding-left: 20px;">
            <li><strong>Date:</strong> ${new Date(dateAffected).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
            <li><strong>Hours:</strong> ${Math.abs(hours)}h ${minutes || 0}m</li>
            <li><strong>Rejected By:</strong> ${rejectedBy}</li>
            <li><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">✗ Rejected</span></li>
          </ul>
        </div>

        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Reason for rejection:</strong></p>
          <p style="margin: 10px 0 0 0; color: #721c24;">${reason}</p>
        </div>

        <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Need clarification?</strong></p>
          <p style="margin: 10px 0 0 0;">If you have any questions about this decision, please contact your supervisor or HR department.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
          Thanks,<br>
          <em>Rooche Digital Automations</em>
        </p>
      </body>
      </html>
    `
  };
};

/**
 * Employee Not Found - Notification to user
 */
export const employeeNotFoundTemplate = (data) => {
  const { email } = data;

  return {
    subject: 'Your Account is Not Recognized',
    message: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin-top: 0;">⚠️ Account Not Recognized</h2>
          <p style="color: #856404; margin: 0;">Hi there,</p>
        </div>

        <p>We received a request from your email address (<strong>${email}</strong>), but unfortunately, it is not registered in our system.</p>

        <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>What should you do?</strong></p>
          <ul style="padding-left: 20px; margin: 10px 0 0 0;">
            <li>Verify you are using your company email address</li>
            <li>Contact HR to ensure your email is registered in the system</li>
            <li>Check with your supervisor if you should have access</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
          Thanks,<br>
          <em>Rooche Digital Automations</em>
        </p>
      </body>
      </html>
    `
  };
};

/**
 * Test Email Template
 */
export const testEmailTemplate = (data) => {
  const { recipientEmail, timestamp } = data;

  return {
    subject: 'Test Notification - RD OTS System',
    message: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #0c5460; margin-top: 0;">🧪 Test Email</h2>
          <p style="color: #0c5460; margin: 0;">This is a test notification from the RD-OTS system.</p>
        </div>

        <p>Hi there,</p>
        <p>This is a test notification to verify that the email delivery system is working correctly.</p>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong style="color: #2c3e50;">Test Details:</strong>
          <ul style="padding-left: 20px;">
            <li><strong>System:</strong> RD-OTS (Refactored Architecture)</li>
            <li><strong>Recipient:</strong> ${recipientEmail}</li>
            <li><strong>Timestamp:</strong> ${timestamp || new Date().toISOString()}</li>
            <li><strong>Purpose:</strong> Email service verification</li>
            <li><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Testing</span></li>
          </ul>
        </div>

        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #155724;"><strong>✅ Success!</strong></p>
          <p style="margin: 10px 0 0 0; color: #155724;">If you received this email, the notification system is working perfectly!</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
          Thanks,<br>
          <em>Rooche Digital Automations</em>
        </p>
      </body>
      </html>
    `
  };
};

/**
 * Helper function to get template by name
 */
export const getEmailTemplate = (templateName, data) => {
  const templates = {
    'request_submitted': requestSubmittedTemplate,
    'admin_notification': adminNotificationTemplate,
    'request_approved': requestApprovedTemplate,
    'request_rejected': requestRejectedTemplate,
    'employee_not_found': employeeNotFoundTemplate,
    'test_email': testEmailTemplate
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  return template(data);
};

export default {
  requestSubmittedTemplate,
  adminNotificationTemplate,
  requestApprovedTemplate,
  requestRejectedTemplate,
  employeeNotFoundTemplate,
  testEmailTemplate,
  getEmailTemplate
};
