/**
 * Admin Authentication Routes
 * Handles admin registration, login, and session management
 */
import express from 'express';
import AdminAuthService from '../services/admin-auth-service.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();
const adminAuthService = new AdminAuthService();

/**
 * POST /api/v1/admin/auth/register
 * Register a new admin (only allowed if no admin exists)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    const admin = await adminAuthService.register(username, password);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        id: admin.id,
        username: admin.username,
        created_at: admin.created_at,
      },
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    
    if (error.message.includes('already exists') || 
        error.message.includes('disabled') ||
        error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/auth/login
 * Login admin user
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await adminAuthService.login(username, password, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        admin: result.admin,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    
    if (error.message.includes('Invalid') || error.message.includes('disabled')) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/auth/logout
 * Logout admin user
 */
router.post('/logout', isAdmin, async (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');

    if (sessionToken) {
      await adminAuthService.logout(sessionToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/auth/status
 * Check if admin system is initialized and get current session status
 */
router.get('/status', async (req, res) => {
  try {
    const hasAdmins = await adminAuthService.hasAdmins();
    
    // Check session if token provided
    let sessionValid = false;
    let currentAdmin = null;
    
    const sessionToken = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');
    if (sessionToken) {
      const session = await adminAuthService.verifySession(sessionToken);
      if (session) {
        sessionValid = true;
        currentAdmin = {
          id: session.adminId,
          username: session.username,
        };
      }
    }

    res.json({
      success: true,
      data: {
        hasAdmins,
        requiresSetup: !hasAdmins,
        sessionValid,
        currentAdmin,
      },
    });
  } catch (error) {
    console.error('Admin status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/auth/change-password
 * Change admin password
 */
router.post('/change-password', isAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    await adminAuthService.changePassword(req.adminId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.message.includes('incorrect') || error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
