/**
 * Admin API Routes
 * Administrative endpoints for managing users, UUIDs, and system settings
 */
import express from 'express';
import { isAdmin } from '../middleware/admin.js';
import { query } from '../utils/database.js';
import IdentityService from '../services/identity-service.js';

const router = express.Router();
const identityService = new IdentityService();

/**
 * GET /api/v1/admin/uuids
 * List all client UUIDs with associated user information
 */
router.get('/uuids', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.per_page) || 50, 100);
    const offset = (page - 1) * perPage;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(DISTINCT client_uuid) as total FROM user_device_profiles',
    );
    const total = parseInt(countResult.rows[0].total);

    // Get UUIDs with user info
    const result = await query(
      `SELECT 
        udp.client_uuid,
        ui.user_identity_id,
        ui.role,
        ui.created_at,
        ui.last_seen_at,
        ui.is_active,
        COUNT(DISTINCT udp.device_session_id) as session_count,
        MAX(udp.last_seen_at) as last_device_seen,
        array_agg(DISTINCT udp.platform) as platforms,
        array_agg(DISTINCT udp.country) as countries
      FROM user_device_profiles udp
      JOIN user_identities ui ON udp.user_identity_id = ui.id
      GROUP BY udp.client_uuid, ui.user_identity_id, ui.role, ui.created_at, ui.last_seen_at, ui.is_active
      ORDER BY ui.created_at DESC
      LIMIT $1 OFFSET $2`,
      [perPage, offset],
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('List UUIDs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/uuids/:uuid
 * Get detailed information about a specific UUID
 */
router.get('/uuids/:uuid', isAdmin, async (req, res) => {
  try {
    const { uuid } = req.params;

    // Get UUID info
    const result = await query(
      `SELECT 
        udp.client_uuid,
        udp.device_session_id,
        ui.user_identity_id,
        ui.role,
        ui.created_at as user_created_at,
        ui.last_seen_at as user_last_seen_at,
        ui.total_sessions,
        ui.total_devices,
        ui.is_active,
        udp.platform,
        udp.user_agent,
        udp.language,
        udp.timezone,
        udp.country,
        udp.city,
        udp.ip_address,
        udp.first_seen_at,
        udp.last_seen_at,
        udp.visit_count,
        udp.is_current
      FROM user_device_profiles udp
      JOIN user_identities ui ON udp.user_identity_id = ui.id
      WHERE udp.client_uuid = $1
      ORDER BY udp.last_seen_at DESC`,
      [uuid],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'UUID not found',
      });
    }

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get UUID details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/admin/uuids/:uuid
 * Delete/ban a specific UUID
 */
router.delete('/uuids/:uuid', isAdmin, async (req, res) => {
  try {
    const { uuid } = req.params;

    // Delete all device profiles with this UUID
    const result = await query(
      'DELETE FROM user_device_profiles WHERE client_uuid = $1 RETURNING user_identity_id',
      [uuid],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'UUID not found',
      });
    }

    res.json({
      success: true,
      message: 'UUID deleted successfully',
      deleted_count: result.rows.length,
    });
  } catch (error) {
    console.error('Delete UUID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/v1/admin/users/:userId
 * Update user metadata or role
 */
router.patch('/users/:userId', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, is_active, metadata } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (metadata) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    values.push(userId);
    const result = await query(
      `UPDATE user_identities 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_identity_id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/users
 * List all users
 */
router.get('/users', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.per_page) || 50, 100);
    const offset = (page - 1) * perPage;

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM user_identities');
    const total = parseInt(countResult.rows[0].total);

    // Get users
    const result = await query(
      `SELECT * FROM v_user_statistics
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [perPage, offset],
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/users/:userId/profile
 * Generate comprehensive user profile
 */
router.get('/users/:userId/profile', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user basic info
    const userResult = await query(
      'SELECT * FROM user_identities WHERE user_identity_id = $1',
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Get device profiles
    const devicesResult = await query(
      `SELECT 
        device_session_id,
        client_uuid,
        platform,
        user_agent,
        language,
        timezone,
        country,
        city,
        ip_address,
        first_seen_at,
        last_seen_at,
        is_current,
        visit_count
      FROM user_device_profiles
      WHERE user_identity_id = $1
      ORDER BY last_seen_at DESC`,
      [user.id],
    );

    // Get device change history
    const changesResult = await query(
      `SELECT 
        change_type,
        change_category,
        change_summary,
        changed_fields,
        match_confidence,
        detected_at
      FROM device_change_history
      WHERE user_identity_id = $1
      ORDER BY detected_at DESC
      LIMIT 20`,
      [user.id],
    );

    // Get matching logs
    const logsResult = await query(
      `SELECT 
        match_status,
        match_method,
        match_confidence,
        processing_time_ms,
        attempted_at
      FROM identity_matching_logs
      WHERE user_identity_id = $1
      ORDER BY attempted_at DESC
      LIMIT 20`,
      [user.id],
    );

    // Get statistics
    const stats = await identityService.getUserStatistics(userId);

    // Build comprehensive profile
    const profile = {
      user: {
        user_identity_id: user.user_identity_id,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_seen_at: user.last_seen_at,
        is_active: user.is_active,
        total_sessions: user.total_sessions,
        total_devices: user.total_devices,
        metadata: user.metadata,
      },
      devices: devicesResult.rows,
      device_changes: changesResult.rows,
      matching_logs: logsResult.rows,
      statistics: stats,
      profile_summary: {
        total_devices: devicesResult.rows.length,
        active_devices: devicesResult.rows.filter(d => d.is_current).length,
        countries_visited: [...new Set(devicesResult.rows.map(d => d.country).filter(Boolean))],
        platforms_used: [...new Set(devicesResult.rows.map(d => d.platform).filter(Boolean))],
        total_changes: changesResult.rows.length,
        total_visits: devicesResult.rows.reduce((sum, d) => sum + (d.visit_count || 0), 0),
      },
    };

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/settings
 * Get system settings
 */
router.get('/settings', isAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM system_settings');

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/v1/admin/settings/:key
 * Update system setting
 */
router.patch('/settings/:key', isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required',
      });
    }

    const result = await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, JSON.stringify(value)],
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
