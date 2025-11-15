# RD - Overtime System

Modern web application for managing overtime and undertime requests at Rooche Digital. Replaces Google Forms with a custom React frontend while leveraging existing n8n workflows for integrations.

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
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────┐    ┌──────────────┐
│   Supabase   │    │     n8n      │  ← Handles credentials
│   Database   │    │   Workflows  │     (Gmail, ERPNext)
└──────────────┘    └──────────────┘
```

## ✨ Features

- 📝 **Modern Form Interface** - React + shadcn/ui components
- ⚡ **Real-time Validation** - Zod schema validation with react-hook-form
- 🎯 **State Management** - Zustand for predictable state
- 📧 **Email Notifications** - Automated via n8n + Gmail
- 👥 **Approval Routing** - Intelligent routing based on employee hierarchy (ERPNext)
- 📊 **Request Tracking** - View status and history via Supabase
- 🔒 **Secure** - Rate limiting, CORS, Helmet security headers

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Supabase account
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
N8N_WEBHOOK_PROCESS_REQUEST=/webhook/process-ot-request
N8N_WEBHOOK_APPROVAL=/webhook/5a661dcd-b7dc-421a-a6cf-252729c4e999

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Set Up Supabase Database

The table schema should already exist from your n8n workflow. Verify it has:

```sql
TABLE: Overtime-Requests
COLUMNS:
  - id (int, primary key, auto-increment)
  - frappe_employee_id (text)
  - payroll_date (date)
  - hours (numeric)
  - minutes (numeric)
  - reason (text)
  - projects_affected (text)
  - approved_by (text, nullable)
  - reject_reason (text, nullable)
  - created_at (timestamp)
```

### 4. Configure n8n Workflow

⚠️ **Important:** You need to create a new n8n workflow (or modify your existing one).

See [N8N_WORKFLOW_SETUP.md](./N8N_WORKFLOW_SETUP.md) for detailed instructions.

**Option 1 (Recommended): Modify Existing Workflow**
1. Replace "Google Sheets Trigger" with "Webhook Trigger"
2. Set webhook path: `/webhook/process-ot-request`
3. Update all field references (see mapping table in guide)
4. Add "Respond to Webhook" node at the end

**Option 2: Import New Workflow**
1. Import [n8n-workflow-new.json](./n8n-workflow-new.json)
2. Reconnect your credentials (Gmail, ERPNext, Supabase)
3. Activate the workflow

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
  "requestType": "Overtime",  // or "Undertime"
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

### Get Request by ID

```http
GET /api/requests/:id
```

### Get Pending Requests

```http
GET /api/requests/pending
```

### Get Statistics

```http
GET /api/requests/stats?employeeId=HR-EMP-00001
```

## 🗂️ Project Structure

```
rd-ots/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js          # Supabase client
│   │   ├── controllers/
│   │   │   └── requestController.js # Request handlers
│   │   ├── middleware/
│   │   │   ├── errorHandler.js      # Error handling
│   │   │   └── validator.js         # Joi validation
│   │   ├── routes/
│   │   │   ├── index.js             # Route aggregator
│   │   │   └── requestRoutes.js     # Request routes
│   │   ├── services/
│   │   │   ├── n8nService.js        # n8n integration
│   │   │   └── requestService.js    # Business logic
│   │   ├── utils/
│   │   │   └── logger.js            # Winston logger
│   │   └── server.js                # Express app
│   ├── logs/                        # Log files
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   │   ├── button.jsx
│   │   │   │   ├── input.jsx
│   │   │   │   ├── card.jsx
│   │   │   │   └── ...
│   │   │   └── OvertimeRequestForm.jsx
│   │   ├── lib/
│   │   │   ├── api.js               # Axios instance
│   │   │   └── utils.js             # Utility functions
│   │   ├── store/
│   │   │   └── useRequestStore.js   # Zustand store
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                # Tailwind styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── N8N_INTEGRATION.md               # n8n setup guide
└── README.md                        # This file
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
npm run build  # Creates optimized build in dist/
npm run preview  # Preview production build
```

## 🧪 Testing

### Test Backend API

```bash
# Health check
curl http://localhost:3000/health

# Submit request
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rooche.digital",
    "requestType": "Overtime",
    "dateAffected": "2024-12-31",
    "numberOfHours": 2,
    "minutes": 30,
    "reason": "Testing the system",
    "projectTaskAssociated": "test-channel"
  }'
```

### Test n8n Integration

```bash
# Directly test n8n webhook
curl -X POST https://n8n.roochedigital.com/webhook/process-ot-request \
  -H "Content-Type: application/json" \
  -d '{
    "Email Address": "test@rooche.digital",
    "Type of request": "Overtime",
    "Date Affected": "12/31/2024",
    "Number of hours": 2,
    "Minutes": 30,
    "Reason for Overtime / Undertime": "Testing",
    "Project/Task Associated": "test-channel",
    "Timestamp": "2024-12-31T10:00:00Z"
  }'
```

## 📖 User Workflow

1. **Employee** fills out the form on the React frontend
2. **Frontend** validates input and sends to backend
3. **Backend** processes and forwards to n8n webhook
4. **n8n** workflow:
   - Checks if Overtime System is enabled (ERPNext)
   - Looks up employee by email (ERPNext)
   - Validates employee exists and status
   - Checks for duplicate requests
   - Stores request in Supabase
   - Sends confirmation email to employee (Gmail)
   - Determines approver based on hierarchy
   - Sends approval request email to approver (Gmail)
5. **Approver** clicks approve/reject in email
6. **n8n** processes approval/rejection:
   - Updates Supabase record
   - Creates Additional Salary entry in ERPNext (if approved)
   - Sends notification email to employee (Gmail)

## 🚨 Troubleshooting

### "Connection refused" to backend

- Check backend is running: `npm run dev` in `backend/`
- Verify port 3000 is not in use
- Check firewall settings

### "Failed to submit request"

- Check backend logs in `backend/logs/`
- Verify n8n webhook URL is correct
- Test n8n webhook directly (see Testing section)

### Form validation errors

- Check browser console for detailed error messages
- Verify all required fields are filled
- Ensure date format is correct
- Check hours (1-8) and minutes (0, 15, 30, 45) are valid

### Employee not found

- Verify email exists in ERPNext
- Check employee status is "Active"
- Ensure `company_email` field is populated in ERPNext

### Emails not sending

- Check n8n execution logs
- Verify Gmail OAuth credentials in n8n
- Check Gmail API quotas in Google Cloud Console

## 🔐 Security

- **Rate Limiting:** 100 requests per 15 minutes per IP
- **CORS:** Restricted to configured origins
- **Helmet:** Security headers enabled
- **Input Validation:** Joi schema validation on all inputs
- **XSS Protection:** React automatically escapes values
- **SQL Injection:** Using Supabase client (parameterized queries)

## 📝 Environment Variables

### Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `N8N_BASE_URL` | n8n instance URL | `https://n8n.roochedigital.com` |
| `N8N_WEBHOOK_PROCESS_REQUEST` | Process request webhook path | `/webhook/process-ot-request` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJ...` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000/api` |

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
- **n8n Workflows:** See [N8N_INTEGRATION.md](./N8N_INTEGRATION.md)
- **ERPNext:** Contact your ERPNext administrator

---

**Built with ❤️ by Rooche Digital Team**
