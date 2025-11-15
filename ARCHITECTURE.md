# System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (Port 5173)                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  OvertimeRequestForm.jsx                                    │ │  │
│  │  │  • Form fields (email, type, date, hours, reason, etc.)    │ │  │
│  │  │  • Real-time validation (Zod)                               │ │  │
│  │  │  • Success/error messages                                   │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Zustand Store (useRequestStore)                            │ │  │
│  │  │  • submitRequest()                                          │ │  │
│  │  │  • fetchRequests()                                          │ │  │
│  │  │  • fetchStatistics()                                        │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP POST /api/requests
                                │ (JSON payload)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION SERVER                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │               Node.js Backend (Port 3000)                         │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Express Server                                             │ │  │
│  │  │  • CORS middleware                                          │ │  │
│  │  │  • Rate limiting (100 req/15min)                            │ │  │
│  │  │  • Helmet security headers                                  │ │  │
│  │  │  • Request logging (Morgan + Winston)                       │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Routes (requestRoutes.js)                                  │ │  │
│  │  │  • POST   /api/requests                                     │ │  │
│  │  │  • GET    /api/requests                                     │ │  │
│  │  │  • GET    /api/requests/:id                                 │ │  │
│  │  │  • GET    /api/requests/pending                             │ │  │
│  │  │  • GET    /api/requests/stats                               │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Middleware (validator.js)                                  │ │  │
│  │  │  • Joi schema validation                                    │ │  │
│  │  │  • Error handling                                           │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Controllers (requestController.js)                         │ │  │
│  │  │  • submitRequest()                                          │ │  │
│  │  │  • getAllRequests()                                         │ │  │
│  │  │  • getRequestById()                                         │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Services                                                   │ │  │
│  │  │  • n8nService.js → Calls n8n webhooks                       │ │  │
│  │  │  • requestService.js → Queries Supabase                     │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────┬─────────────────────────────┘
                │                           │
                │ HTTP POST                 │ Direct DB queries
                │ (Webhook)                 │ (Read operations)
                ▼                           ▼
┌───────────────────────────┐   ┌─────────────────────────────────────────┐
│    n8n WORKFLOWS          │   │         SUPABASE DATABASE               │
│    (Credentials Layer)    │   │                                         │
│  ┌─────────────────────┐  │   │  Table: Overtime-Requests               │
│  │ Workflow 1:         │  │   │  • id (primary key)                     │
│  │ Process Request     │  │   │  • frappe_employee_id                   │
│  │                     │  │   │  • payroll_date                         │
│  │ 1. Webhook Trigger  │──┼───┼─▶• hours, minutes                       │
│  │ 2. Check System     │  │   │  • reason                               │
│  │    Enabled (ERPNext)│  │   │  • projects_affected                    │
│  │ 3. Find Employee    │  │   │  • approved_by (nullable)               │
│  │    (ERPNext)        │  │   │  • reject_reason (nullable)             │
│  │ 4. Check Duplicate  │  │   │  • created_at                           │
│  │    (ERPNext)        │  │   └─────────────────────────────────────────┘
│  │ 5. Store Request────┼──┼───▶ INSERT INTO Overtime-Requests
│  │    (Supabase)       │  │
│  │ 6. Send Confirm     │  │
│  │    Email (Gmail)────┼──┼───▶ Gmail API
│  │ 7. Get Approvers    │  │
│  │    (ERPNext)        │  │
│  │ 8. Send Approval    │  │
│  │    Email (Gmail)────┼──┼───▶ Gmail API
│  │ 9. Respond Success  │  │
│  └─────────────────────┘  │
│                           │
│  ┌─────────────────────┐  │
│  │ Workflow 2:         │  │
│  │ Handle Approval     │  │
│  │                     │  │
│  │ 1. Webhook Trigger  │  │
│  │    (Email links)    │  │
│  │ 2. Get Request      │──┼───▶ Supabase SELECT
│  │    (Supabase)       │  │
│  │ 3. Update Status────┼──┼───▶ Supabase UPDATE
│  │    (Supabase)       │  │
│  │ 4. Create Add'l     │  │
│  │    Salary (ERPNext) │  │
│  │ 5. Send Notification│  │
│  │    Email (Gmail)────┼──┼───▶ Gmail API
│  └─────────────────────┘  │
└───────────────────────────┘
         │
         └──────────┐
                    ▼
        ┌────────────────────────┐
        │   EXTERNAL SERVICES    │
        │                        │
        │  ┌──────────────────┐  │
        │  │   ERPNext        │  │
        │  │  • Employee data │  │
        │  │  • Salary records│  │
        │  │  • Org hierarchy │  │
        │  └──────────────────┘  │
        │                        │
        │  ┌──────────────────┐  │
        │  │   Gmail API      │  │
        │  │  • Send emails   │  │
        │  │  • OAuth tokens  │  │
        │  └──────────────────┘  │
        └────────────────────────┘
```

## Data Flow

### 1. Submit Request Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Fill form
     ▼
┌─────────────────┐
│ React Form      │
│ • Validation    │
│ • Error display │
└────┬────────────┘
     │ 2. POST /api/requests
     │    {email, requestType, date, hours, ...}
     ▼
┌──────────────────┐
│ Backend API      │
│ • Joi validation │
│ • Rate limiting  │
└────┬─────────────┘
     │ 3. POST /webhook/process-ot-request
     │    {email, requestType, dateAffected, ...}
     ▼
┌──────────────────────────────┐
│ n8n Workflow                 │
│                              │
│ ┌─────────────────────────┐  │
│ │ 1. Check System Enabled │  │
│ │    (ERPNext API)        │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 2. Find Employee        │  │
│ │    (ERPNext API)        │  │
│ │    WHERE email = X      │  │
│ │    AND status = Active  │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 3. Check Duplicate      │  │
│ │    (ERPNext API)        │  │
│ │    WHERE employee = X   │  │
│ │    AND date = Y         │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 4. Store in DB          │  │
│ │    (Supabase INSERT)    │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 5. Send Confirmation    │  │
│ │    (Gmail API)          │  │
│ │    TO: employee         │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 6. Determine Approver   │  │
│ │    (ERPNext API)        │  │
│ │    Based on hierarchy   │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 7. Send Approval Email  │  │
│ │    (Gmail API)          │  │
│ │    TO: approver         │  │
│ │    WITH: Approve/Reject │  │
│ │          buttons        │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 8. Respond to Backend   │  │
│ │    {success: true,      │  │
│ │     requestId: 123}     │  │
│ └─────────────────────────┘  │
└──────────┬───────────────────┘
           │ 4. Response
           ▼
┌──────────────────┐
│ Backend API      │
│ • Log result     │
└────┬─────────────┘
     │ 5. Response
     │    {success: true, message: "..."}
     ▼
┌─────────────────┐
│ React Form      │
│ • Show success  │
│ • Clear form    │
└─────────────────┘
```

### 2. Approval Flow

```
┌──────────┐
│ Approver │
└────┬─────┘
     │ 1. Receive email
     │    [Approve] [Reject] buttons
     ▼
┌─────────────────┐
│ Click button    │
│ (Link in email) │
└────┬────────────┘
     │ 2. GET /webhook/approval?action=1&approver_id=X&id=Y
     ▼
┌──────────────────────────────┐
│ n8n Approval Workflow        │
│                              │
│ ┌─────────────────────────┐  │
│ │ 1. Get Request from DB  │  │
│ │    (Supabase SELECT)    │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 2. Check if Already     │  │
│ │    Processed            │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 3. Update Status        │  │
│ │    (Supabase UPDATE)    │  │
│ │    SET approved_by = X  │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 4. IF Approved:         │  │
│ │    Create Additional    │  │
│ │    Salary (ERPNext)     │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 5. Send Notification    │  │
│ │    (Gmail API)          │  │
│ │    TO: employee         │  │
│ │    "Request approved/   │  │
│ │     rejected"           │  │
│ └───────┬─────────────────┘  │
│         ▼                    │
│ ┌─────────────────────────┐  │
│ │ 6. Return HTML Page     │  │
│ │    "Success! Request    │  │
│ │     has been processed" │  │
│ └─────────────────────────┘  │
└──────────────────────────────┘
```

## Component Responsibilities

### Frontend (React)
- **Responsibility:** User interface and client-side validation
- **Technologies:** React, Vite, Tailwind CSS, shadcn/ui, Zustand
- **Does:**
  - Renders form with all fields
  - Validates input (Zod schema)
  - Shows validation errors in real-time
  - Manages UI state (Zustand)
  - Sends validated data to backend
  - Displays success/error messages
- **Does NOT:**
  - Directly interact with ERPNext
  - Send emails
  - Store data in database
  - Handle approvals

### Backend (Node.js)
- **Responsibility:** API orchestration and business logic
- **Technologies:** Express, Axios, Joi, Winston
- **Does:**
  - Exposes REST API endpoints
  - Validates incoming requests (Joi)
  - Logs all operations (Winston)
  - Calls n8n webhooks
  - Queries Supabase for read operations
  - Handles errors gracefully
  - Enforces rate limiting
  - Applies security headers
- **Does NOT:**
  - Store credentials (ERPNext, Gmail, Supabase)
  - Send emails directly
  - Query ERPNext directly
  - Handle approval logic

### n8n Workflows
- **Responsibility:** Integration with external services (credentials)
- **Technologies:** n8n workflow automation
- **Does:**
  - Stores and manages API credentials
  - Queries ERPNext (employee data, system config)
  - Sends emails via Gmail API
  - Writes to Supabase database
  - Handles approval/rejection logic
  - Creates Additional Salary records in ERPNext
  - Routes requests based on employee hierarchy
- **Does NOT:**
  - Validate form input (done by frontend/backend)
  - Provide user interface
  - Handle rate limiting

### Supabase
- **Responsibility:** Data persistence
- **Technologies:** PostgreSQL database
- **Does:**
  - Stores overtime/undertime requests
  - Tracks approval status
  - Maintains audit trail (created_at)
  - Provides query interface
- **Does NOT:**
  - Validate data (done by backend)
  - Send notifications
  - Handle business logic

### ERPNext
- **Responsibility:** Employee master data and payroll
- **Technologies:** ERPNext ERP system
- **Does:**
  - Stores employee information
  - Manages organizational hierarchy
  - Stores Additional Salary records
  - Tracks system configuration
- **Does NOT:**
  - Handle overtime request workflow
  - Send email notifications

## Security Layers

```
┌─────────────────────────────────────────────┐
│ Layer 1: Frontend Validation                │
│ • Zod schema validation                     │
│ • Input sanitization                        │
│ • Type checking                             │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ Layer 2: Network Security                   │
│ • CORS (restricted origins)                 │
│ • HTTPS (production)                        │
│ • Rate limiting (100 req/15min)             │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ Layer 3: Backend Validation                 │
│ • Joi schema validation                     │
│ • Helmet security headers                   │
│ • Error handling middleware                 │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ Layer 4: n8n Workflow Validation            │
│ • Employee verification (ERPNext)           │
│ • Duplicate checking                        │
│ • Authorization checks                      │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ Layer 5: Database Constraints               │
│ • Primary key constraints                   │
│ • Foreign key constraints                   │
│ • NOT NULL constraints                      │
│ • Unique constraints                        │
└─────────────────────────────────────────────┘
```

## Deployment Architecture

### Development
```
localhost:5173 (Frontend)
     │
     └──▶ localhost:3000 (Backend)
              │
              └──▶ n8n.roochedigital.com (Workflows)
                        │
                        ├──▶ ERPNext API
                        ├──▶ Gmail API
                        └──▶ Supabase API
```

### Production
```
overtime.roochedigital.com (Frontend - Vercel/Netlify)
     │
     └──▶ api.roochedigital.com (Backend - DigitalOcean/AWS)
              │
              └──▶ n8n.roochedigital.com (Workflows)
                        │
                        ├──▶ ERPNext API
                        ├──▶ Gmail API
                        └──▶ Supabase API
```

---

**Last Updated:** December 2024
