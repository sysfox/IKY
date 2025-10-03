/**
 * Admin authentication and authorization middleware
 */
import { query } from '../utils/database.js';

/**
 * Check if user is admin
 */
export async function isAdmin(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required in X-User-ID header',
      });
    }

    // Check if user exists and is admin
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

    // User is admin, proceed
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
