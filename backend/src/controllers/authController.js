import { pool } from '../config/database.js';
import oauthService from '../services/oauthService.js';
import erpnextService from '../services/erpnextService.js';

class AuthController {
  /**
   * Initiate Google OAuth login
   */
  async googleLogin(req, res) {
    try {
      const authUrl = oauthService.getAuthorizationUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Google login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate Google login'
      });
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async googleCallback(req, res) {
    try {
      const { code } = req.query;

      if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
      }

      // Verify Google token and get user info
      const googleUser = await oauthService.verifyGoogleToken(code);

      // Debug: Log what Google returns
      console.log('[OAuth Debug] Google user data:', JSON.stringify(googleUser, null, 2));

      // Check domain access
      if (!oauthService.checkDomainAccess(googleUser.email)) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized_domain`);
      }

      // Check CET access - critical security check
      const hasCetAccess = await oauthService.checkCetAccess(googleUser.email);
      if (!hasCetAccess) {
        console.log(`[CET] Access denied for user: ${googleUser.email}`);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied&message=${encodeURIComponent('You do not have permission to access this application. Please contact your administrator to request access.')}`);
      }

      console.log(`[CET] Access granted for user: ${googleUser.email}`);

      // Check if user exists
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [googleUser.email]
      );

      let user;
      let isNewUser = false;

      if (userResult.rows.length === 0) {
        // New user - fetch ERPNext data
        const erpnextData = await erpnextService.getEmployeeByEmail(googleUser.email);

        // Determine role based on ERPNext data
        let role = 'Employee'; // Default role

        if (erpnextData) {
          const isOwner = await erpnextService.isCompanyOwner(erpnextData.employee_id);
          const designationLower = erpnextData.designation ? erpnextData.designation.toLowerCase() : '';

          if (isOwner) {
            role = 'Owner';
          } else if (designationLower.includes('human resource') ||
                     designationLower.includes('hr ') ||
                     designationLower.startsWith('hr') ||
                     designationLower === 'hr') {
            role = 'HR';
          } else if (designationLower.includes('coordinator') ||
                     designationLower.includes('manager')) {
            role = 'Project Coordinator';
          }
        }

        // Create new user
        const insertResult = await pool.query(`
          INSERT INTO users (
            email,
            full_name,
            google_id,
            profile_picture,
            role,
            erpnext_employee_id,
            designation,
            reports_to,
            last_login
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *
        `, [
          googleUser.email,
          googleUser.full_name,
          googleUser.google_id,
          googleUser.profile_picture,
          role,
          erpnextData?.employee_id || null,
          erpnextData?.designation || null,
          erpnextData?.reports_to || null
        ]);

        user = insertResult.rows[0];
        isNewUser = true;
      } else {
        // Existing user - fetch ERPNext data to update role and designation
        const erpnextData = await erpnextService.getEmployeeByEmail(googleUser.email);

        // Determine role based on ERPNext data
        let role = 'Employee'; // Default role

        if (erpnextData) {
          const isOwner = await erpnextService.isCompanyOwner(erpnextData.employee_id);
          const designationLower = erpnextData.designation ? erpnextData.designation.toLowerCase() : '';

          if (isOwner) {
            role = 'Owner';
          } else if (designationLower.includes('human resource') ||
                     designationLower.includes('hr ') ||
                     designationLower.startsWith('hr') ||
                     designationLower === 'hr') {
            role = 'HR';
          } else if (designationLower.includes('coordinator') ||
                     designationLower.includes('manager')) {
            role = 'Project Coordinator';
          }
        }

        // Update user with profile picture, last login, role, and ERPNext data
        const updateResult = await pool.query(`
          UPDATE users
          SET profile_picture = $1,
              last_login = NOW(),
              role = $2,
              erpnext_employee_id = $3,
              designation = $4,
              reports_to = $5
          WHERE email = $6
          RETURNING *
        `, [
          googleUser.profile_picture,
          role,
          erpnextData?.employee_id || null,
          erpnextData?.designation || null,
          erpnextData?.reports_to || null,
          googleUser.email
        ]);

        user = updateResult.rows[0];
      }

      // Generate session token
      const sessionToken = oauthService.generateSessionToken();
      const expiresAt = oauthService.getSessionExpiration();

      // Create session
      await pool.query(`
        INSERT INTO sessions (session_token, email, expires_at)
        VALUES ($1, $2, $3)
      `, [sessionToken, user.email, expiresAt]);

      // Redirect to frontend with session token
      const redirectUrl = new URL(process.env.FRONTEND_URL);
      redirectUrl.searchParams.append('session_token', sessionToken);
      if (isNewUser) {
        redirectUrl.searchParams.append('new_user', 'true');
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(req, res) {
    try {
      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user info'
      });
    }
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(req, res) {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');

      if (sessionToken) {
        await pool.query(
          'UPDATE sessions SET is_active = false WHERE session_token = $1',
          [sessionToken]
        );
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to logout'
      });
    }
  }

  /**
   * Sync user data with ERPNext (manual refresh)
   */
  async syncWithERPNext(req, res) {
    try {
      const { email } = req.user;

      const erpnextData = await erpnextService.getEmployeeByEmail(email);

      if (!erpnextData) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found in ERPNext'
        });
      }

      // Update user with ERPNext data
      const updateResult = await pool.query(`
        UPDATE users
        SET erpnext_employee_id = $1,
            designation = $2,
            reports_to = $3,
            updated_at = NOW()
        WHERE email = $4
        RETURNING *
      `, [
        erpnextData.employee_id,
        erpnextData.designation,
        erpnextData.reports_to,
        email
      ]);

      res.json({
        success: true,
        user: updateResult.rows[0],
        message: 'User data synced with ERPNext'
      });
    } catch (error) {
      console.error('ERPNext sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync with ERPNext'
      });
    }
  }
}

export default new AuthController();
