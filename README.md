# RD - Overtime System

Modern web application for managing overtime and undertime requests at Rooche Digital. Built with React frontend and Node.js backend, integrating with ERPNext via n8n workflows.

## 🏗️ Architecture

```
┌──────────────────┐
│  React Frontend  │  ← Form submission UI
│  (Port 5173)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Node.js Backend │  ← Business logic & orchestration
│  (Port 3000)     │
└────────┬─────────┘
         │
         ├──────────────────┬─────────────────┐
         │                  │                 │
         ▼                  ▼                 ▼
┌──────────────┐    ┌──────────────┐  ┌──────────────┐
│   Database   │    │     n8n      │  │   ERPNext    │
│  PostgreSQL  │    │   Workflows  │  │   + Gmail    │
│  or Supabase │    │              │  │              │
└──────────────┘    └──────────────┘  └──────────────┘
```

## ✨ Features

- 📝 **Modern Form Interface** - React + shadcn/ui components with TypeScript
- ⚡ **Real-time Validation** - Zod schema validation with react-hook-form
- 🎯 **State Management** - Zustand for predictable state
- 📧 **Email Notifications** - Automated via n8n + Gmail
- 👥 **Intelligent Routing** - Hierarchy-based approval routing (ERPNext)
- 📊 **Request Tracking** - View status and history
- 🔒 **Secure** - Rate limiting, CORS, Helmet security headers
- 🗄️ **Flexible Database** - Supports both PostgreSQL and Supabase
- 📝 **Audit Trail** - Automatic logging of all changes
- ⚙️ **Settings Management** - Configurable notification recipients

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- PostgreSQL database OR Supabase account
- n8n instance (for Gmail/ERPNext integration)
- ERPNext instance (for employee data)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```env
# Server
PORT=3000
NODE_ENV=development

# n8n Webhooks
N8N_BASE_URL=https://n8n.roochedigital.com
N8N_USE_ERPNEXT_SERVICE=true
N8N_WEBHOOK_ERPNEXT_SERVICE=/webhook/erpnext-service
N8N_WEBHOOK_SEND_NOTIFICATION=/webhook/send-notification

# Database Choice: postgresql OR supabase
DB_TYPE=postgresql

# PostgreSQL (if DB_TYPE=postgresql)
DATABASE_URL=postgresql://user:password@localhost:5432/rd_ots

# Supabase (if DB_TYPE=supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Set Up Database

**Option A: PostgreSQL**

```bash
cd backend/database/scripts
./run_migrations.sh
```

**Option B: Supabase**

Run the migration files in your Supabase SQL editor:
1. `backend/database/migrations/001_create_overtime_requests_table.sql`
2. `backend/database/migrations/002_create_audit_log_table.sql`
3. `backend/database/migrations/003_create_views.sql`
4. `backend/database/migrations/004_create_settings_table.sql`

### 4. Set Up n8n Workflows

Import the provided workflow files into your n8n instance:

**1. ERPNext Service Workflow** (`n8n-erpnext-service-workflow-new.json`):
- Webhook path: `/webhook/erpnext-service`
- Handles all ERPNext operations (employee validation, approver lookup, salary creation)
- Update ERPNext credentials in the workflow nodes

**2. Gmail Notification Workflow** (`n8n-gmail-workflow-new.json`):
- Webhook path: `/webhook/send-notification`
- Sends email notifications via Gmail
- Update Gmail OAuth credentials in the workflow node

**Steps:**
1. In n8n, go to **Workflows** → **Import from File**
2. Import `n8n-erpnext-service-workflow-new.json`
3. Import `n8n-gmail-workflow-new.json`
4. For each workflow:
   - Click on ERPNext nodes and reconnect your ERPNext credentials
   - Click on Gmail node and reconnect your Gmail OAuth credentials
   - Activate the workflow

### 5. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/health

## 📚 API Documentation

### Submit Overtime/Undertime Request

```http
POST /api/requests
Content-Type: application/json

{
  "email": "employee@rooche.digital",
  "requestType": "Overtime",
  "dateAffected": "2024-12-31",
  "numberOfHours": 2,
  "minutes": 30,
  "reason": "Project deadline work",
  "projectTaskAssociated": "client-project-channel"
}
```

### Get All Requests

```http
GET /api/requests?status=pending&dateFrom=2024-01-01&dateTo=2024-12-31
```

### Approve Request

```http
POST /api/requests/:id/approve
Content-Type: application/json

{
  "approvedBy": "HR-EMP-00001"
}
```

### Reject Request

```http
POST /api/requests/:id/reject
Content-Type: application/json

{
  "rejectedBy": "HR-EMP-00001",
  "reason": "Insufficient justification"
}
```

### Additional Endpoints

- `GET /api/requests/:id` - Get request by ID
- `GET /api/requests/pending` - Get pending requests
- `GET /api/requests/employee/:employeeId` - Get employee requests
- `GET /api/requests/stats` - Get statistics
- `GET /api/requests/check-duplicate` - Check for duplicates
- `GET /api/settings` - Get all settings
- `PUT /api/settings/:key` - Update setting

## 🗂️ Project Structure

```
rd-ots/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # PostgreSQL/Supabase adapter
│   │   │   ├── supabase.js          # Supabase client
│   │   │   └── env.js               # Environment config
│   │   ├── controllers/
│   │   │   ├── requestController.js # Request handlers
│   │   │   └── settingsController.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js      # Error handling
│   │   │   └── validator.js         # Joi validation
│   │   ├── routes/
│   │   │   ├── index.js             # Route aggregator
│   │   │   ├── requestRoutes.js
│   │   │   └── settingsRoutes.js
│   │   ├── services/
│   │   │   ├── n8nService.js        # n8n integration
│   │   │   ├── requestService.js    # Business logic
│   │   │   ├── notificationRoutingService.js
│   │   │   └── settingsService.js
│   │   ├── templates/
│   │   │   └── emailTemplates.js    # Email templates
│   │   ├── utils/
│   │   │   └── logger.js            # Winston logger
│   │   └── server.js                # Express app
│   ├── database/
│   │   ├── migrations/              # Database migrations
│   │   └── scripts/                 # Migration scripts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── OvertimeRequestForm.tsx
│   │   │   ├── ConfirmationModal.tsx
│   │   │   ├── DuplicateWarningDialog.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── pages/
│   │   │   └── AdminDashboard.tsx   # Admin interface
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios instance
│   │   │   └── utils.ts
│   │   ├── store/
│   │   │   └── useRequestStore.ts   # Zustand store
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── package.json
│
├── n8n-erpnext-service-workflow-new.json  # ERPNext integration
├── n8n-gmail-workflow-new.json            # Email notifications
├── ARCHITECTURE.md                        # Architecture docs
└── README.md
```

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Starts Vite dev server
```

### Build for Production

```bash
# Backend (no build needed, it's Node.js)
cd backend
npm start

# Frontend
cd frontend
npm run build      # Creates optimized build in dist/
npm run preview    # Preview production build
```

## 📖 User Workflow

1. **Employee** fills out the form on the React frontend
2. **Frontend** validates input and sends to backend
3. **Backend** processes request:
   - Validates employee via n8n → ERPNext
   - Checks for duplicate requests
   - Stores request in database
4. **n8n** sends notifications:
   - Confirmation email to employee (via Gmail)
   - Admin notification to HR staff + approvers
5. **Approver** clicks approve/reject
6. **System** processes decision:
   - Updates database
   - Creates Additional Salary in ERPNext (if approved)
   - Sends outcome notification to employee

## 🚨 Troubleshooting

### "Connection refused" to backend

- Check backend is running: `npm run dev` in `backend/`
- Verify port 3000 is not in use
- Check firewall settings

### "Failed to submit request"

- Check backend logs in `backend/logs/`
- Verify n8n webhook URLs are correct
- Test n8n workflows are activated
- Check ERPNext and Gmail credentials in n8n

### Form validation errors

- Check browser console for detailed error messages
- Verify all required fields are filled
- Ensure hours (1-8) and minutes (0, 15, 30, 45) are valid
- Check date is not in the future

### Employee not found

- Verify email exists in ERPNext
- Check employee status is "Active"
- Ensure `company_email` field is populated in ERPNext

### Emails not sending

- Check n8n execution logs
- Verify Gmail OAuth credentials in n8n
- Check Gmail API quotas in Google Cloud Console

### Database connection issues

- **PostgreSQL:** Check DATABASE_URL format and credentials
- **Supabase:** Verify SUPABASE_URL and SUPABASE_KEY
- Check DB_TYPE environment variable matches your setup

## 🔐 Security

- **Rate Limiting:** 100 requests per 15 minutes per IP
- **CORS:** Restricted to configured origins
- **Helmet:** Security headers enabled
- **Input Validation:** Joi schema validation on all inputs
- **XSS Protection:** React automatically escapes values
- **SQL Injection:** Parameterized queries via database adapter
- **Audit Trail:** All changes logged in audit_log table

## 📝 Environment Variables

### Backend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Backend server port | No | `3000` |
| `NODE_ENV` | Environment | No | `development` |
| `N8N_BASE_URL` | n8n instance URL | Yes | - |
| `N8N_USE_ERPNEXT_SERVICE` | Use unified ERPNext service | No | `true` |
| `N8N_WEBHOOK_ERPNEXT_SERVICE` | ERPNext service webhook | Yes* | - |
| `N8N_WEBHOOK_SEND_NOTIFICATION` | Notification webhook | Yes | - |
| `DB_TYPE` | Database type | Yes | `postgresql` |
| `DATABASE_URL` | PostgreSQL connection | If `DB_TYPE=postgresql` | - |
| `SUPABASE_URL` | Supabase project URL | If `DB_TYPE=supabase` | - |
| `SUPABASE_KEY` | Supabase anon key | If `DB_TYPE=supabase` | - |
| `CORS_ORIGIN` | Allowed CORS origins | Yes | - |

*Required when `N8N_USE_ERPNEXT_SERVICE=true`

### Frontend

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

## 🎯 Key Features Explained

### Duplicate Detection

The system checks for duplicate requests before submission:
- Queries database for existing request (same employee + same date)
- Shows warning dialog with existing request details
- Allows user to proceed anyway or cancel

### Intelligent Approval Routing

Approvers are determined based on employee hierarchy:
- If employee reports to HR-EMP-00001: Routes to that HR manager
- If designation contains "Project Coordinator": Routes to all Project Coordinators
- If designation contains "Lead Generation": Routes to Lead Project Coordinators
- Default: Routes to direct supervisor (reports_to field)
- HR staff always receive notifications

### Flexible Database Support

Choose between PostgreSQL or Supabase:
- Set `DB_TYPE=postgresql` for local/self-hosted PostgreSQL
- Set `DB_TYPE=supabase` for managed Supabase
- All database operations abstracted through unified adapter

### Email Templates

Four email templates with professional HTML formatting:
- **Request Submitted:** Confirmation to employee
- **Admin Notification:** Alert to HR/approvers with action buttons
- **Approval Notification:** Confirmation of approval
- **Rejection Notification:** Rejection details and next steps

## 📄 Database Schema

### overtime_requests

Primary table for storing requests:

```sql
id                    SERIAL PRIMARY KEY
frappe_employee_id    VARCHAR(50) NOT NULL
payroll_date          DATE NOT NULL
hours                 NUMERIC(3,1)  -- 0-8 hours
minutes               INTEGER       -- 0, 15, 30, or 45
reason                TEXT NOT NULL
projects_affected     TEXT NOT NULL
approved_by           VARCHAR(50)   -- NULL if pending
reject_reason         TEXT          -- NULL if not rejected
created_at            TIMESTAMP WITH TIME ZONE
updated_at            TIMESTAMP WITH TIME ZONE
```

**Indexes:** employee, payroll_date, approved_by, created_at, unique constraint per employee per day

### audit_log

Automatic audit trail of all changes:

```sql
id              SERIAL PRIMARY KEY
request_id      INTEGER FK → overtime_requests
action          VARCHAR(50)  -- created/approved/rejected/updated
performed_by    VARCHAR(50)
old_values      JSONB
new_values      JSONB
created_at      TIMESTAMP WITH TIME ZONE
```

**Trigger:** `log_overtime_request_changes` automatically logs all INSERT/UPDATE operations

### settings

System configuration storage:

```sql
id              SERIAL PRIMARY KEY
key             VARCHAR(100) UNIQUE
value           JSONB
description     TEXT
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Proprietary - Rooche Digital © 2024

## 🆘 Support

For issues and questions:
- **Technical Issues:** Check logs in `backend/logs/`
- **n8n Workflows:** Verify credentials and activation status
- **ERPNext:** Contact your ERPNext administrator
- **Database:** Check `DB_TYPE` and connection credentials

---

**Built with ❤️ by Rooche Digital Team**
