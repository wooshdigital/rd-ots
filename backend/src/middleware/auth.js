import { pool } from '../config/database.js';

/**
 * Verify session token and attach user to request
 */
export async function verifySession(req, res, next) {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    // Query session and user data
    const result = await pool.query(`
      SELECT
        s.session_token,
        s.email,
        s.expires_at,
        s.is_active,
        u.id,
        u.full_name,
        u.google_id,
        u.profile_picture,
        u.role,
        u.erpnext_employee_id,
        u.designation,
        u.reports_to,
        u.is_active as user_is_active
      FROM sessions s
      JOIN users u ON s.email = u.email
      WHERE s.session_token = $1
        AND s.is_active = true
        AND s.expires_at > NOW()
        AND u.is_active = true
    `, [sessionToken]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    // Attach user to request
    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      full_name: result.rows[0].full_name,
      google_id: result.rows[0].google_id,
      profile_picture: result.rows[0].profile_picture,
      role: result.rows[0].role,
      erpnext_employee_id: result.rows[0].erpnext_employee_id,
      designation: result.rows[0].designation,
      reports_to: result.rows[0].reports_to,
    };

    next();
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

/**
 * Require specific roles for access
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Check if user can approve requests (Owner, HR, Project Coordinator, or other supervisors)
 */
export function canApprove(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const approverRoles = ['Owner', 'HR', 'Project Coordinator'];

  // Allow if user has an approver role OR has direct reports (reports_to field populated in other employees)
  if (approverRoles.includes(req.user.role)) {
    next();
  } else {
    // Even if not in approver roles, might have people reporting to them
    // This will be checked in the controller when fetching requests
    next();
  }
}
