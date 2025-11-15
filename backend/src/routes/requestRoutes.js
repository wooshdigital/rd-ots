import express from 'express';
import requestController from '../controllers/requestController.js';
import { validate, schemas } from '../middleware/validator.js';

const router = express.Router();

// Submit new overtime/undertime request
router.post(
  '/',
  validate(schemas.overtimeRequest),
  requestController.submitRequest
);

// Get all requests (with optional filters)
router.get('/', requestController.getAllRequests);

// Get statistics
router.get('/stats', requestController.getStatistics);

// Get pending requests
router.get('/pending', requestController.getPendingRequests);

// Check for duplicate requests
router.get('/check-duplicate', requestController.checkDuplicate);

// Get request by ID
router.get('/:id', requestController.getRequestById);

// Get requests by employee
router.get('/employee/:employeeId', requestController.getRequestsByEmployee);

// Approve request
router.post('/:id/approve', requestController.approveRequest);

// Reject request
router.post('/:id/reject', requestController.rejectRequest);

// Webhook for n8n status updates
router.post('/webhook/status-update', requestController.handleStatusUpdate);

export default router;
