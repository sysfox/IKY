/**
 * Admin Authentication Service
 * Handles admin user registration, login, and session management
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../utils/database.js';

const SALT_ROUNDS = 10;
const SESSION_DURATION_HOURS = 24;

export class AdminAuthService {
  /**
   * Register a new admin user
   */
  async register(username, password) {
    // Check if any admin already exists
    const existingAdmins = await query(
      'SELECT COUNT(*) as count FROM admin_credentials',
    );

    if (existingAdmins.rows[0].count > 0) {
      throw new Error('Admin registration is disabled. An admin already exists.');
    }

    // Validate username
    if (!username || username.length < 3 || username.length > 50) {
      throw new Error('Username must be between 3 and 50 characters');
    }

    // Validate password
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if username already exists
    const existing = await query(
      'SELECT id FROM admin_credentials WHERE username = $1',
      [username],
    );

    if (existing.rows.length > 0) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert admin
    const result = await query(
      `INSERT INTO admin_credentials (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at, is_active`,
      [username, passwordHash],
    );

    return result.rows[0];
  }

  /**
   * Login admin user
   */
  async login(username, password, ipAddress = null, userAgent = null) {
    // Find admin by username
    const result = await query(
      'SELECT id, username, password_hash, is_active FROM admin_credentials WHERE username = $1',
      [username],
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid username or password');
    }

    const admin = result.rows[0];

    // Check if admin is active
    if (!admin.is_active) {
      throw new Error('Admin account is disabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    await query(
      'UPDATE admin_credentials SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id],
    );

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

    // Store session
    await query(
      `INSERT INTO admin_sessions (session_token, admin_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionToken, admin.id, expiresAt, ipAddress, userAgent],
    );

    // Clean up expired sessions
    await this.cleanupExpiredSessions();

    return {
      sessionToken,
      expiresAt,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    };
  }

  /**
   * Verify session token
   */
  async verifySession(sessionToken) {
    if (!sessionToken) {
      return null;
    }

    const result = await query(
      `SELECT 
        s.id as session_id,
        s.expires_at,
        a.id as admin_id,
        a.username,
        a.is_active
      FROM admin_sessions s
      JOIN admin_credentials a ON s.admin_id = a.id
      WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [sessionToken],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    // Check if admin is still active
    if (!session.is_active) {
      return null;
    }

    return {
      adminId: session.admin_id,
      username: session.username,
      sessionId: session.session_id,
    };
  }

  /**
   * Logout (invalidate session)
   */
  async logout(sessionToken) {
    await query(
      'DELETE FROM admin_sessions WHERE session_token = $1',
      [sessionToken],
    );
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    await query(
      'DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP',
    );
  }

  /**
   * Check if any admin exists
   */
  async hasAdmins() {
    const result = await query(
      'SELECT COUNT(*) as count FROM admin_credentials',
    );
    return result.rows[0].count > 0;
  }

  /**
   * Change password
   */
  async changePassword(adminId, currentPassword, newPassword) {
    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM admin_credentials WHERE id = $1',
      [adminId],
    );

    if (result.rows.length === 0) {
      throw new Error('Admin not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash,
    );

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await query(
      'UPDATE admin_credentials SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, adminId],
    );

    // Invalidate all sessions for this admin
    await query(
      'DELETE FROM admin_sessions WHERE admin_id = $1',
      [adminId],
    );
  }
}

export default AdminAuthService;
