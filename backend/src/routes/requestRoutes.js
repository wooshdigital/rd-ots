import express from 'express';
import requestController from '../controllers/requestController.js';
import { validate, schemas } from '../middleware/validator.js';
import { verifySession, canApprove } from '../middleware/auth.js';

const router = express.Router();

// Submit new overtime/undertime request (authenticated)
router.post(
  '/',
  verifySession,
  validate(schemas.overtimeRequest),
  requestController.submitRequest
);

// Get all requests (with optional filters) - authenticated
router.get('/', verifySession, requestController.getAllRequests);

// Get statistics - authenticated
router.get('/stats', verifySession, requestController.getStatistics);

// Get pending requests - authenticated, requires approval permission
router.get('/pending', verifySession, canApprove, requestController.getPendingRequests);

// Check for duplicate requests - authenticated
router.get('/check-duplicate', verifySession, requestController.checkDuplicate);

// Get request by ID - authenticated
router.get('/:id', verifySession, requestController.getRequestById);

// Get requests by employee - authenticated
router.get('/employee/:employeeId', verifySession, requestController.getRequestsByEmployee);

// Approve request - authenticated, requires approval permission
router.post('/:id/approve', verifySession, canApprove, requestController.approveRequest);

// Reject request - authenticated, requires approval permission
router.post('/:id/reject', verifySession, canApprove, requestController.rejectRequest);

// Webhook for n8n status updates
router.post('/webhook/status-update', requestController.handleStatusUpdate);

export default router;
