/**
 * Admin authentication and authorization middleware
 */
import { query } from '../utils/database.js';
import AdminAuthService from '../services/admin-auth-service.js';

const adminAuthService = new AdminAuthService();

/**
 * Check if user is admin
 * Supports both session token and legacy X-User-ID header
 */
export async function isAdmin(req, res, next) {
  try {
    // Try session token first (new method)
    const sessionToken = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (sessionToken) {
      const session = await adminAuthService.verifySession(sessionToken);
      
      if (session) {
        // Valid session, proceed
        req.adminId = session.adminId;
        req.adminUsername = session.username;
        return next();
      }
    }

    // Fall back to legacy X-User-ID header (for backward compatibility)
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Use X-Session-Token header or X-User-ID header.',
      });
    }

    // Check if user exists and is admin (legacy method)
    const result = await query(
      'SELECT role FROM user_identities WHERE user_identity_id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }

    // User is admin, proceed (legacy)
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Check if registration is enabled
 */
export async function checkRegistrationEnabled(req, res, next) {
  try {
    const result = await query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['registration_enabled'],
    );

    if (result.rows.length === 0) {
      // If setting doesn't exist, allow registration (backward compatibility)
      return next();
    }

    const registrationEnabled = result.rows[0].setting_value;

    if (registrationEnabled === false || registrationEnabled === 'false') {
      return res.status(403).json({
        success: false,
        error: 'Registration disabled',
        message: 'New user registration is currently disabled',
      });
    }

    next();
  } catch (error) {
    console.error('Registration check middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

export default {
  isAdmin,
  checkRegistrationEnabled,
};
