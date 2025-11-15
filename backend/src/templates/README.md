# Email Templates

This directory contains all email notification templates for the RD-OTS system.

## Available Templates

### 1. **Request Submitted** (`request_submitted`)
Sent to the employee immediately after they submit a request.

**Data required:**
```javascript
{
  employeeName: string,
  requestType: string,        // "Overtime" or "Undertime"
  dateAffected: string,        // "YYYY-MM-DD"
  numberOfHours: number,
  minutes: number,
  reason: string,
  projectTaskAssociated: string
}
```

---

### 2. **Admin Notification** (`admin_notification`)
Sent to admins when a new request is submitted.

**Data required:**
```javascript
{
  employeeName: string,
  employeeId: string,          // "HR-EMP-00103"
  requestType: string,
  dateAffected: string,
  numberOfHours: number,
  minutes: number,
  reason: string,
  projectTaskAssociated: string,
  requestId: number
}
```

---

### 3. **Request Approved** (`request_approved`)
Sent to the employee when their request is approved.

**Data required:**
```javascript
{
  employeeName: string,
  approvedBy: string,          // Email or name of approver
  dateAffected: string,
  hours: number,
  minutes: number,
  requestType: string
}
```

---

### 4. **Request Rejected** (`request_rejected`)
Sent to the employee when their request is rejected.

**Data required:**
```javascript
{
  employeeName: string,
  rejectedBy: string,
  dateAffected: string,
  hours: number,
  minutes: number,
  reason: string,              // Rejection reason
  requestType: string
}
```

---

### 5. **Employee Not Found** (`employee_not_found`)
Sent when someone submits a request but their email is not in ERPNext.

**Data required:**
```javascript
{
  email: string
}
```

---

### 6. **Test Email** (`test_email`)
For testing the email notification system.

**Data required:**
```javascript
{
  recipientEmail: string,
  timestamp: string           // Optional, defaults to now
}
```

---

## Usage

### In Controller Code

```javascript
import { getEmailTemplate } from '../templates/emailTemplates.js';
import n8nService from '../services/n8nService.js';

// Example: Send approval email
const templateData = {
  employeeName: 'Neil Adrian Balolong',
  approvedBy: 'admin@roochedigital.com',
  dateAffected: request.payroll_date,
  hours: request.hours,
  minutes: request.minutes,
  requestType: request.hours >= 0 ? 'Overtime' : 'Undertime'
};

const { subject, message } = getEmailTemplate('request_approved', templateData);

await n8nService.sendNotification(
  [employeeEmail],
  subject,
  message,
  request
);
```

### Direct Import

```javascript
import { requestApprovedTemplate } from '../templates/emailTemplates.js';

const { subject, message } = requestApprovedTemplate({
  employeeName: 'Neil',
  approvedBy: 'Admin',
  dateAffected: '2025-11-15',
  hours: 2.5,
  minutes: 30,
  requestType: 'Overtime'
});
```

---

## Testing Templates

Use the test script to send test emails:

```bash
# Test the test email template
node backend/test-email.js test_email neil@rooche.digital

# Test approval email
node backend/test-email.js request_approved neil@rooche.digital

# Test rejection email
node backend/test-email.js request_rejected neil@rooche.digital

# Test request submitted confirmation
node backend/test-email.js request_submitted neil@rooche.digital

# Test admin notification
node backend/test-email.js admin_notification neil@rooche.digital
```

---

## Email Design Guidelines

All templates follow these design principles:

### **1. Mobile-Responsive**
- Max width: 600px
- Inline CSS (better email client compatibility)
- Font: Arial, sans-serif

### **2. Color Scheme**
- **Primary:** #007bff (Blue) - Informational
- **Success:** #28a745 (Green) - Approved
- **Danger:** #dc3545 (Red) - Rejected
- **Warning:** #ffc107 (Yellow) - Pending
- **Info:** #17a2b8 (Cyan) - Tips/Notes

### **3. Structure**
Each email contains:
1. **Header Section** - Colored box with status
2. **Main Content** - Key information
3. **Details Box** - Gray background with request details
4. **Call-to-Action / Info Box** - Colored border for important notes
5. **Footer** - Signature

### **4. Icons**
- ✅ Approval
- ❌ Rejection
- ⚠️ Warning
- 🔔 Notification
- ✓ Success indicator

---

## Customization

To modify email templates:

1. Edit `/backend/src/templates/emailTemplates.js`
2. Update the relevant template function
3. Test using `test-email.js` script
4. Restart backend server

**Note:** Changes take effect immediately (no database migration needed).

---

## Future Enhancements

Planned improvements:

- [ ] Store templates in database for admin customization
- [ ] Support for multiple languages
- [ ] Email preview in admin dashboard
- [ ] Template variables documentation in UI
- [ ] A/B testing for email effectiveness
- [ ] Analytics (open rate, click rate)

---

## Troubleshooting

### Email not styled correctly
Some email clients (Outlook, Gmail) strip CSS. All styles are inline to maximize compatibility.

### Links not working
Ensure URLs are absolute (include https://)

### Images not loading
Host images on CDN or use base64 encoding for small images

---

**Last Updated:** January 2025
**Version:** 1.0
