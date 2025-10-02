/**
 * API Routes for identity recognition
 */
import express from 'express';
import IdentityService from '../services/identity-service.js';

const router = express.Router();
const identityService = new IdentityService();

/**
 * POST /api/v1/identify
 * Identify or create user based on client UUID and device fingerprint
 */
router.post('/identify', async (req, res) => {
  try {
    const { client_uuid, device_info } = req.body;

    // Validation
    if (!client_uuid || !device_info) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'client_uuid and device_info are required',
      });
    }

    // Perform identification
    const result = await identityService.identify(client_uuid, device_info);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Identify endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/users/:userId/device-history
 * Get device change history for a user
 */
router.get('/users/:userId/device-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const options = {
      page: req.query.page,
      perPage: req.query.per_page,
      changeType: req.query.change_type,
    };

    const result = await identityService.getDeviceHistory(userId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get device history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/users/:userId/statistics
 * Get user statistics
 */
router.get('/users/:userId/statistics', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await identityService.getUserStatistics(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/devices/compare
 * Compare two device profiles
 */
router.post('/devices/compare', async (req, res) => {
  try {
    const { session_id_1, session_id_2 } = req.body;

    if (!session_id_1 || !session_id_2) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'session_id_1 and session_id_2 are required',
      });
    }

    // Fetch both device profiles
    const { query } = await import('../utils/database.js');
    
    const device1Result = await query(
      'SELECT * FROM user_device_profiles WHERE device_session_id = $1',
      [session_id_1]
    );

    const device2Result = await query(
      'SELECT * FROM user_device_profiles WHERE device_session_id = $2',
      [session_id_2]
    );

    if (device1Result.rows.length === 0 || device2Result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device profile not found',
      });
    }

    const device1 = device1Result.rows[0];
    const device2 = device2Result.rows[0];

    // Calculate similarity
    const { FingerprintMatcher } = await import('../services/fingerprint-matcher.js');
    const matcher = new FingerprintMatcher();
    const similarity = matcher.calculateSimilarity(device1, device2);
    const changes = matcher.detectChanges(device1, device2);

    res.json({
      success: true,
      data: {
        device1: {
          session_id: device1.device_session_id,
          platform: device1.platform,
          user_agent: device1.user_agent,
          first_seen: device1.first_seen_at,
          last_seen: device1.last_seen_at,
        },
        device2: {
          session_id: device2.device_session_id,
          platform: device2.platform,
          user_agent: device2.user_agent,
          first_seen: device2.first_seen_at,
          last_seen: device2.last_seen_at,
        },
        similarity: similarity,
        changed_fields: changes,
      },
    });

  } catch (error) {
    console.error('Compare devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const { query } = await import('../utils/database.js');
    await query('SELECT 1');

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
