import express from 'express';
import authController from '../controllers/authController.js';
import { verifySession } from '../middleware/auth.js';

const router = express.Router();

// Google OAuth routes
router.get('/google/login', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);

// Authenticated routes (require session token)
router.get('/me', verifySession, authController.getCurrentUser);
router.post('/logout', verifySession, authController.logout);
router.post('/sync-erpnext', verifySession, authController.syncWithERPNext);

export default router;
