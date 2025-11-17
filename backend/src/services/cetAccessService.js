import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Service for checking user access via CET (Centralized Employee Tracker)
 */
class CetAccessService {
  constructor() {
    this.cetApiUrl = process.env.CET_BASE_URL;
    this.cetApiKey = process.env.CET_API_KEY; // CET master API key for authentication
    this.cetToolName = 'OTS'; // Must match the tool name registered in CET
  }

  /**
   * Check if a user has access to OTS via CET
   * @param {string} userEmail - The user's email address
   * @returns {Promise<boolean>} - true if user has access, false otherwise
   */
  async checkUserAccess(userEmail) {
    try {
      logger.info(`[CET] Checking access for user: ${userEmail}`);

      if (!this.cetApiUrl || !this.cetApiKey) {
        logger.warn('[CET] API configuration missing, denying access by default');
        return false;
      }

      // Use the check-access-simple endpoint
      const url = `${this.cetApiUrl}/api/v1/auth/check-access-simple/${encodeURIComponent(userEmail)}`;
      const params = {
        tool: this.cetToolName,
        api_key: this.cetApiKey,
      };

      logger.info(`[CET] Calling CET API: ${url}?tool=${params.tool}`);

      const response = await axios.get(url, {
        params,
        timeout: 5000, // 5 second timeout
      });

      logger.info(`[CET] Response: ${JSON.stringify(response.data)}`);

      if (response.data.has_access) {
        logger.info(`[CET] Access granted for user: ${userEmail}`);
        return true;
      }

      logger.warn(`[CET] Access denied for user: ${userEmail} - ${response.data.message}`);
      return false;

    } catch (error) {
      if (error.response?.status === 404) {
        // User not found in CET, deny access
        logger.warn(`[CET] User ${userEmail} not found in CET system`);
        return false;
      }

      if (error.code === 'ECONNABORTED') {
        logger.error(`[CET] Request timeout for user: ${userEmail}`);
      } else {
        logger.error(`[CET] API error: ${error.message}`);
      }

      // On error, deny access for security
      return false;
    }
  }

  /**
   * Get user's role information from CET
   * @param {string} userEmail - The user's email address
   * @returns {Promise<Object|null>} - User access data including roles, or null if no access
   */
  async getUserAccessInfo(userEmail) {
    try {
      logger.info(`[CET] Fetching access info for user: ${userEmail}`);

      if (!this.cetApiUrl || !this.cetApiKey) {
        logger.warn('[CET] API configuration missing');
        return null;
      }

      const url = `${this.cetApiUrl}/api/v1/auth/check-access-simple/${encodeURIComponent(userEmail)}`;
      const params = {
        tool: this.cetToolName,
        api_key: this.cetApiKey,
      };

      const response = await axios.get(url, {
        params,
        timeout: 5000,
      });

      if (response.data.has_access) {
        return response.data;
      }

      return null;

    } catch (error) {
      logger.error(`[CET] Error fetching user access info: ${error.message}`);
      return null;
    }
  }
}

export default new CetAccessService();
