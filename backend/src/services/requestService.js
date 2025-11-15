import dbAdapter from '../config/database.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class RequestService {
  /**
   * Get all overtime requests with optional filtering
   */
  async getAllRequests(filters = {}) {
    try {
      const data = await dbAdapter.getAllRequests(filters);
      return data;
    } catch (error) {
      logger.error('Error in getAllRequests', { error: error.message });
      throw new AppError('Failed to fetch requests', 500);
    }
  }

  /**
   * Get a single request by ID
   */
  async getRequestById(id) {
    try {
      const data = await dbAdapter.getRequestById(id);
      return data;
    } catch (error) {
      logger.error('Error in getRequestById', { error: error.message });
      if (error.message === 'Request not found') {
        throw new AppError('Request not found', 404);
      }
      throw new AppError('Failed to fetch request', 500);
    }
  }

  /**
   * Get requests by employee ID
   */
  async getRequestsByEmployee(employeeId) {
    try {
      const data = await dbAdapter.getRequestsByEmployee(employeeId);
      return data;
    } catch (error) {
      logger.error('Error in getRequestsByEmployee', { error: error.message });
      throw new AppError('Failed to fetch employee requests', 500);
    }
  }

  /**
   * Get pending requests (for approvers)
   */
  async getPendingRequests() {
    try {
      const data = await dbAdapter.getPendingRequests();
      return data;
    } catch (error) {
      logger.error('Error in getPendingRequests', { error: error.message });
      throw new AppError('Failed to fetch pending requests', 500);
    }
  }

  /**
   * Get request statistics
   */
  async getStatistics(employeeId = null) {
    try {
      const stats = await dbAdapter.getStatistics(employeeId);
      return stats;
    } catch (error) {
      logger.error('Error in getStatistics', { error: error.message });
      throw new AppError('Failed to fetch statistics', 500);
    }
  }

  /**
   * Check for duplicate requests
   */
  async checkDuplicate(employeeId, payrollDate) {
    try {
      logger.info('Checking for duplicates', { employeeId, payrollDate });
      const duplicates = await dbAdapter.checkDuplicate(employeeId, payrollDate);
      return {
        hasDuplicate: duplicates.length > 0,
        duplicates: duplicates
      };
    } catch (error) {
      logger.error('Error in checkDuplicate', {
        error: error.message,
        stack: error.stack,
        employeeId,
        payrollDate
      });
      throw new AppError('Failed to check for duplicates', 500);
    }
  }

  /**
   * Approve a request
   */
  async approveRequest(id, approvedBy) {
    try {
      const request = await dbAdapter.approveRequest(id, approvedBy);
      return request;
    } catch (error) {
      logger.error('Error in approveRequest', { error: error.message });
      throw new AppError('Failed to approve request', 500);
    }
  }

  /**
   * Reject a request
   */
  async rejectRequest(id, rejectedBy, reason) {
    try {
      const request = await dbAdapter.rejectRequest(id, rejectedBy, reason);
      return request;
    } catch (error) {
      logger.error('Error in rejectRequest', { error: error.message });
      throw new AppError('Failed to reject request', 500);
    }
  }
}

export default new RequestService();
