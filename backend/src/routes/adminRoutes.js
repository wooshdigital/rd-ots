import express from 'express';
import adminController from '../controllers/adminController.js';
import { verifySession, canApprove } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and approval permission
router.use(verifySession);
router.use(canApprove); // Only Owner, HR, and Project Coordinators can access

/**
 * Activity Logs Routes
 */

// GET /api/admin/activity-logs - Get activity logs with optional filters
router.get('/activity-logs', adminController.getActivityLogs);

// GET /api/admin/activity-logs/stats - Get activity log statistics
router.get('/activity-logs/stats', adminController.getActivityStats);

/**
 * Scheduler Routes
 */

// GET /api/admin/scheduler/status - Get scheduler status
router.get('/scheduler/status', adminController.getSchedulerStatus);

// POST /api/admin/scheduler/trigger-daily-reminder - Manually trigger daily reminder
router.post('/scheduler/trigger-daily-reminder', adminController.triggerDailyReminder);

export default router;
