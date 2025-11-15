/**
 * Email Notification Test Script
 *
 * Usage:
 *   node test-email.js <template_name> <recipient_email>
 *
 * Examples:
 *   node test-email.js test_email neil@rooche.digital
 *   node test-email.js request_approved neil@rooche.digital
 */

import axios from 'axios';
import { getEmailTemplate } from './src/templates/emailTemplates.js';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_SEND_NOTIFICATION || 'https://n8n.roochedigital.com/webhook/send-notification';

// Get command line arguments
const templateName = process.argv[2] || 'test_email';
const recipientEmail = process.argv[3] || 'neil@rooche.digital';

// Sample data for different templates
const sampleData = {
  test_email: {
    recipientEmail,
    timestamp: new Date().toISOString()
  },

  request_submitted: {
    employeeName: 'Neil Adrian Balolong',
    requestType: 'Overtime',
    dateAffected: '2025-11-15',
    numberOfHours: 2,
    minutes: 30,
    reason: 'Working on urgent project deployment that needed completion before deadline',
    projectTaskAssociated: 'RD-OTS System Refactoring'
  },

  admin_notification: {
    employeeName: 'Neil Adrian Balolong',
    employeeId: 'HR-EMP-00103',
    requestType: 'Overtime',
    dateAffected: '2025-11-15',
    numberOfHours: 2,
    minutes: 30,
    reason: 'Working on urgent project deployment that needed completion before deadline',
    projectTaskAssociated: 'RD-OTS System Refactoring',
    requestId: 42
  },

  request_approved: {
    employeeName: 'Neil Adrian Balolong',
    approvedBy: 'admin@roochedigital.com',
    dateAffected: '2025-11-15',
    hours: 2.5,
    minutes: 30,
    requestType: 'Overtime'
  },

  request_rejected: {
    employeeName: 'Neil Adrian Balolong',
    rejectedBy: 'admin@roochedigital.com',
    dateAffected: '2025-11-15',
    hours: 2.5,
    minutes: 30,
    reason: 'Insufficient project justification. Please provide more details about the tasks that required overtime.',
    requestType: 'Overtime'
  },

  employee_not_found: {
    email: recipientEmail
  }
};

async function sendTestEmail() {
  try {
    console.log('='.repeat(60));
    console.log('📧 RD-OTS Email Notification Test');
    console.log('='.repeat(60));
    console.log();
    console.log(`Template:  ${templateName}`);
    console.log(`Recipient: ${recipientEmail}`);
    console.log(`Webhook:   ${N8N_WEBHOOK_URL}`);
    console.log();

    // Get template data
    const data = sampleData[templateName];
    if (!data) {
      console.error(`❌ Error: Template '${templateName}' not found`);
      console.log();
      console.log('Available templates:');
      Object.keys(sampleData).forEach(name => console.log(`  - ${name}`));
      process.exit(1);
    }

    // Generate email from template
    const { subject, message } = getEmailTemplate(templateName, data);

    console.log('📝 Email Details:');
    console.log(`Subject: ${subject}`);
    console.log();

    // Send request to n8n webhook
    console.log('🚀 Sending email via n8n webhook...');
    const response = await axios.post(N8N_WEBHOOK_URL, {
      to: recipientEmail,
      subject,
      message,
      requestData: {
        test: true,
        template: templateName,
        ...data
      }
    });

    console.log();
    console.log('✅ Success! Email sent successfully');
    console.log();
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log();
    console.log('='.repeat(60));
    console.log('💡 Check your inbox:', recipientEmail);
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ Error sending email:');
    console.error();

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    console.error();
    process.exit(1);
  }
}

// Run the test
sendTestEmail();
