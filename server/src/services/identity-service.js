/**
 * Identity recognition service
 * Handles user identification, device matching, and change tracking
 */
import { query, getClient } from '../utils/database.js';
import FingerprintMatcher from './fingerprint-matcher.js';
import crypto from 'crypto';

export class IdentityService {
  constructor() {
    this.matcher = new FingerprintMatcher();
  }

  /**
   * Main identification method
   */
  async identify(clientUUID, deviceInfo) {
    const startTime = Date.now();
    
    try {
      // Step 1: Try UUID-based identification
      const uuidMatch = await this._identifyByUUID(clientUUID);
      
      if (uuidMatch) {
        // Check for device changes
        const changeDetection = await this._detectDeviceChange(uuidMatch, deviceInfo);
        
        if (changeDetection.hasChanged) {
          // Create new device session
          const newSession = await this._createDeviceSession(
            uuidMatch.user_identity_id,
            clientUUID,
            deviceInfo
          );
          
          // Record change history
          await this._recordDeviceChange(
            uuidMatch.user_identity_id,
            newSession.device_session_id,
            uuidMatch.device_session_id,
            changeDetection
          );

          // Update user last seen
          await this._updateUserLastSeen(uuidMatch.user_identity_id);

          await this._logMatching(clientUUID, uuidMatch.user_identity_id, 'recognized', 'uuid_direct', 1.0, Date.now() - startTime, deviceInfo);

          return {
            user_id: uuidMatch.user_identity_id,
            session_id: newSession.device_session_id,
            status: 'recognized',
            confidence: 1.0,
            is_device_changed: true,
            change_type: changeDetection.changeType,
          };
        } else {
          // Update existing session
          await this._updateDeviceSession(uuidMatch.device_session_id, deviceInfo);
          await this._updateUserLastSeen(uuidMatch.user_identity_id);

          await this._logMatching(clientUUID, uuidMatch.user_identity_id, 'recognized', 'uuid_direct', 1.0, Date.now() - startTime, deviceInfo);

          return {
            user_id: uuidMatch.user_identity_id,
            session_id: uuidMatch.device_session_id,
            status: 'recognized',
            confidence: 1.0,
            is_device_changed: false,
          };
        }
      }

      // Step 2: Try device fingerprint matching
      const fingerprintMatch = await this._identifyByFingerprint(deviceInfo);
      
      if (fingerprintMatch) {
        // Identity recovered - UUID was lost but device matched
        const newSession = await this._createDeviceSession(
          fingerprintMatch.user_identity_id,
          clientUUID,
          deviceInfo
        );

        await this._recordDeviceChange(
          fingerprintMatch.user_identity_id,
          newSession.device_session_id,
          fingerprintMatch.device_session_id,
          {
            changeType: 'device_reset',
            changedFields: ['client_uuid'],
            confidence: fingerprintMatch.confidence,
          }
        );

        await this._updateUserLastSeen(fingerprintMatch.user_identity_id);

        await this._logMatching(clientUUID, fingerprintMatch.user_identity_id, 'recovered', 'fingerprint_match', fingerprintMatch.confidence, Date.now() - startTime, deviceInfo);

        return {
          user_id: fingerprintMatch.user_identity_id,
          session_id: newSession.device_session_id,
          status: 'recovered',
          confidence: fingerprintMatch.confidence,
          is_device_changed: true,
          change_type: 'device_reset',
        };
      }

      // Step 3: Create new user identity
      const newUser = await this._createNewUser(clientUUID, deviceInfo);

      await this._logMatching(clientUUID, newUser.user_identity_id, 'new', 'new_user', 1.0, Date.now() - startTime, deviceInfo);

      return {
        user_id: newUser.user_identity_id,
        session_id: newUser.device_session_id,
        status: 'new',
        confidence: 1.0,
        is_device_changed: false,
      };

    } catch (error) {
      console.error('Identity identification error:', error);
      
      await this._logMatching(clientUUID, null, 'failed', null, 0, Date.now() - startTime, deviceInfo);
      
      throw error;
    }
  }

  /**
   * Identify by client UUID
   */
  async _identifyByUUID(clientUUID) {
    const result = await query(
      `SELECT 
        udp.id,
        udp.user_identity_id,
        udp.device_session_id,
        udp.canvas_fingerprint,
        udp.audio_fingerprint,
        udp.webgl_fingerprint,
        udp.user_agent,
        udp.platform,
        udp.screen_width,
        udp.screen_height,
        udp.screen_color_depth,
        udp.screen_pixel_ratio,
        udp.hardware_concurrency,
        udp.device_memory,
        udp.fonts_list,
        udp.plugins_list,
        udp.ip_address,
        udp.country,
        udp.city,
        ui.user_identity_id as user_id
      FROM user_device_profiles udp
      JOIN user_identities ui ON udp.user_identity_id = ui.id
      WHERE udp.client_uuid = $1 AND udp.is_current = true
      ORDER BY udp.last_seen_at DESC
      LIMIT 1`,
      [clientUUID]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Identify by device fingerprint
   */
  async _identifyByFingerprint(deviceInfo) {
    const canvasHash = this._hashFingerprint(deviceInfo.canvas?.hash);
    const audioHash = this._hashFingerprint(deviceInfo.audio?.hash);

    // First try exact fingerprint match
    const exactMatch = await query(
      `SELECT 
        udp.id,
        udp.user_identity_id,
        udp.device_session_id,
        udp.canvas_fingerprint,
        udp.audio_fingerprint,
        udp.webgl_fingerprint,
        udp.user_agent,
        udp.platform,
        udp.screen_width,
        udp.screen_height,
        udp.screen_color_depth,
        udp.screen_pixel_ratio,
        udp.hardware_concurrency,
        udp.device_memory,
        udp.fonts_list,
        udp.plugins_list,
        udp.ip_address,
        ui.user_identity_id as user_id
      FROM user_device_profiles udp
      JOIN user_identities ui ON udp.user_identity_id = ui.id
      WHERE (udp.canvas_fingerprint = $1 OR udp.audio_fingerprint = $2)
        AND ui.is_active = true
      ORDER BY udp.last_seen_at DESC
      LIMIT 10`,
      [canvasHash, audioHash]
    );

    if (exactMatch.rows.length === 0) {
      return null;
    }

    // If multiple matches, use similarity scoring
    const targetDevice = this._deviceInfoToProfile(deviceInfo);
    const bestMatch = this.matcher.findBestMatch(targetDevice, exactMatch.rows);

    if (bestMatch) {
      return {
        ...bestMatch.device,
        confidence: bestMatch.similarity.totalScore,
      };
    }

    return null;
  }

  /**
   * Detect device changes
   */
  async _detectDeviceChange(currentDevice, newDeviceInfo) {
    const newDevice = this._deviceInfoToProfile(newDeviceInfo);
    
    const changeClassification = this.matcher.classifyChange(currentDevice, newDevice);
    const changedFields = this.matcher.detectChanges(currentDevice, newDevice);

    const hasChanged = changedFields.length > 0;

    return {
      hasChanged,
      changeType: changeClassification.type,
      changeCategory: changeClassification.category,
      changedFields,
      confidence: changeClassification.confidence,
    };
  }

  /**
   * Create new user identity
   */
  async _createNewUser(clientUUID, deviceInfo) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Create user identity
      const userResult = await client.query(
        `INSERT INTO user_identities (total_sessions, total_devices)
         VALUES (1, 1)
         RETURNING id, user_identity_id`
      );

      const userId = userResult.rows[0].id;
      const userIdentityId = userResult.rows[0].user_identity_id;

      // Create device profile
      const deviceProfile = this._deviceInfoToProfile(deviceInfo, clientUUID);
      const sessionResult = await client.query(
        `INSERT INTO user_device_profiles (
          user_identity_id, client_uuid,
          canvas_fingerprint, audio_fingerprint, webgl_fingerprint,
          user_agent, platform, language, timezone, timezone_offset,
          screen_width, screen_height, screen_color_depth, screen_pixel_ratio,
          hardware_concurrency, device_memory,
          fonts_list, plugins_list,
          ip_address, country, city,
          webgl_vendor, webgl_renderer,
          device_info_raw
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
        RETURNING id, device_session_id`,
        [
          userId,
          deviceProfile.client_uuid,
          deviceProfile.canvas_fingerprint,
          deviceProfile.audio_fingerprint,
          deviceProfile.webgl_fingerprint,
          deviceProfile.user_agent,
          deviceProfile.platform,
          deviceProfile.language,
          deviceProfile.timezone,
          deviceProfile.timezone_offset,
          deviceProfile.screen_width,
          deviceProfile.screen_height,
          deviceProfile.screen_color_depth,
          deviceProfile.screen_pixel_ratio,
          deviceProfile.hardware_concurrency,
          deviceProfile.device_memory,
          deviceProfile.fonts_list,
          deviceProfile.plugins_list,
          deviceProfile.ip_address,
          deviceProfile.country,
          deviceProfile.city,
          deviceProfile.webgl_vendor,
          deviceProfile.webgl_renderer,
          JSON.stringify(deviceInfo),
        ]
      );

      // Record initial device change
      const sessionId = sessionResult.rows[0].device_session_id;
      await client.query(
        `INSERT INTO device_change_history (
          user_identity_id, device_session_id, previous_session_id,
          change_type, change_category, changed_fields, change_summary,
          match_confidence, recovery_method
        ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          sessionId,
          'new_device',
          'initial_registration',
          [],
          'Initial user registration',
          1.0,
          'new_user',
        ]
      );

      await client.query('COMMIT');

      return {
        user_identity_id: userIdentityId,
        device_session_id: sessionId,
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create new device session for existing user
   */
  async _createDeviceSession(userId, clientUUID, deviceInfo) {
    const deviceProfile = this._deviceInfoToProfile(deviceInfo, clientUUID);

    // Mark all existing sessions as not current
    await query(
      `UPDATE user_device_profiles 
       SET is_current = false 
       WHERE user_identity_id = (SELECT id FROM user_identities WHERE user_identity_id = $1)`,
      [userId]
    );

    const result = await query(
      `INSERT INTO user_device_profiles (
        user_identity_id, client_uuid,
        canvas_fingerprint, audio_fingerprint, webgl_fingerprint,
        user_agent, platform, language, timezone, timezone_offset,
        screen_width, screen_height, screen_color_depth, screen_pixel_ratio,
        hardware_concurrency, device_memory,
        fonts_list, plugins_list,
        ip_address, country, city,
        webgl_vendor, webgl_renderer,
        device_info_raw, is_current
      ) VALUES (
        (SELECT id FROM user_identities WHERE user_identity_id = $1),
        $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, true
      )
      RETURNING device_session_id`,
      [
        userId,
        deviceProfile.client_uuid,
        deviceProfile.canvas_fingerprint,
        deviceProfile.audio_fingerprint,
        deviceProfile.webgl_fingerprint,
        deviceProfile.user_agent,
        deviceProfile.platform,
        deviceProfile.language,
        deviceProfile.timezone,
        deviceProfile.timezone_offset,
        deviceProfile.screen_width,
        deviceProfile.screen_height,
        deviceProfile.screen_color_depth,
        deviceProfile.screen_pixel_ratio,
        deviceProfile.hardware_concurrency,
        deviceProfile.device_memory,
        deviceProfile.fonts_list,
        deviceProfile.plugins_list,
        deviceProfile.ip_address,
        deviceProfile.country,
        deviceProfile.city,
        deviceProfile.webgl_vendor,
        deviceProfile.webgl_renderer,
        JSON.stringify(deviceInfo),
      ]
    );

    // Update user statistics
    await query(
      `UPDATE user_identities 
       SET total_sessions = total_sessions + 1,
           total_devices = (SELECT COUNT(DISTINCT device_session_id) FROM user_device_profiles WHERE user_identity_id = id)
       WHERE user_identity_id = $1`,
      [userId]
    );

    return {
      device_session_id: result.rows[0].device_session_id,
    };
  }

  /**
   * Update existing device session
   */
  async _updateDeviceSession(sessionId, deviceInfo) {
    await query(
      `UPDATE user_device_profiles 
       SET last_seen_at = CURRENT_TIMESTAMP,
           visit_count = visit_count + 1,
           device_info_raw = $2
       WHERE device_session_id = $1`,
      [sessionId, JSON.stringify(deviceInfo)]
    );
  }

  /**
   * Update user last seen timestamp
   */
  async _updateUserLastSeen(userId) {
    await query(
      `UPDATE user_identities 
       SET last_seen_at = CURRENT_TIMESTAMP 
       WHERE user_identity_id = $1`,
      [userId]
    );
  }

  /**
   * Record device change in history
   */
  async _recordDeviceChange(userId, newSessionId, oldSessionId, changeDetection) {
    await query(
      `INSERT INTO device_change_history (
        user_identity_id, device_session_id, previous_session_id,
        change_type, change_category, changed_fields, change_summary,
        match_confidence, recovery_method
      ) VALUES (
        (SELECT id FROM user_identities WHERE user_identity_id = $1),
        $2, $3, $4, $5, $6, $7, $8, $9
      )`,
      [
        userId,
        newSessionId,
        oldSessionId,
        changeDetection.changeType,
        changeDetection.changeCategory,
        changeDetection.changedFields,
        `Device ${changeDetection.changeType} detected: ${changeDetection.changeCategory}`,
        changeDetection.confidence,
        'device_change',
      ]
    );
  }

  /**
   * Log matching attempt
   */
  async _logMatching(clientUUID, userId, status, method, confidence, processingTime, deviceInfo) {
    const canvasHash = this._hashFingerprint(deviceInfo.canvas?.hash);
    const audioHash = this._hashFingerprint(deviceInfo.audio?.hash);

    await query(
      `INSERT INTO identity_matching_logs (
        client_uuid, user_identity_id, match_status, match_method,
        match_confidence, canvas_fingerprint, audio_fingerprint,
        processing_time_ms, user_agent, ip_address
      ) VALUES (
        $1, (SELECT id FROM user_identities WHERE user_identity_id = $2), $3, $4, $5, $6, $7, $8, $9, $10
      )`,
      [
        clientUUID,
        userId,
        status,
        method,
        confidence,
        canvasHash,
        audioHash,
        processingTime,
        deviceInfo.userAgent,
        null, // IP address would be extracted from request in real implementation
      ]
    );
  }

  /**
   * Convert device info to profile format
   */
  _deviceInfoToProfile(deviceInfo, clientUUID = null) {
    return {
      client_uuid: clientUUID,
      canvas_fingerprint: this._hashFingerprint(deviceInfo.canvas?.hash),
      audio_fingerprint: this._hashFingerprint(deviceInfo.audio?.hash),
      webgl_fingerprint: this._hashFingerprint(deviceInfo.webgl?.renderer),
      user_agent: deviceInfo.userAgent,
      platform: deviceInfo.platform,
      language: deviceInfo.language,
      timezone: deviceInfo.timezone,
      timezone_offset: deviceInfo.timezoneOffset,
      screen_width: deviceInfo.screen?.width,
      screen_height: deviceInfo.screen?.height,
      screen_color_depth: deviceInfo.screen?.colorDepth,
      screen_pixel_ratio: deviceInfo.screen?.pixelRatio,
      hardware_concurrency: deviceInfo.hardware?.hardwareConcurrency,
      device_memory: deviceInfo.hardware?.deviceMemory,
      fonts_list: deviceInfo.fonts?.fonts || [],
      plugins_list: deviceInfo.browser?.plugins?.map(p => p.name) || [],
      ip_address: null, // Would be set from request
      country: null,
      city: null,
      webgl_vendor: deviceInfo.webgl?.vendor,
      webgl_renderer: deviceInfo.webgl?.renderer,
    };
  }

  /**
   * Hash fingerprint for storage
   */
  _hashFingerprint(value) {
    if (!value) return null;
    return crypto.createHash('sha256').update(String(value)).digest('hex');
  }

  /**
   * Get device history for a user
   */
  async getDeviceHistory(userId, options = {}) {
    const page = parseInt(options.page || 1);
    const perPage = parseInt(options.perPage || 50);
    const offset = (page - 1) * perPage;

    let whereClause = 'WHERE ui.user_identity_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (options.changeType) {
      paramCount++;
      whereClause += ` AND dch.change_type = $${paramCount}`;
      params.push(options.changeType);
    }

    const result = await query(
      `SELECT 
        dch.id,
        dch.device_session_id,
        dch.previous_session_id,
        dch.change_type,
        dch.change_category,
        dch.changed_fields,
        dch.change_summary,
        dch.match_confidence,
        dch.detected_at,
        dch.previous_values,
        dch.new_values
      FROM device_change_history dch
      JOIN user_identities ui ON dch.user_identity_id = ui.id
      ${whereClause}
      ORDER BY dch.detected_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM device_change_history dch
       JOIN user_identities ui ON dch.user_identity_id = ui.id
       ${whereClause}`,
      params
    );

    return {
      data: result.rows,
      pagination: {
        page,
        perPage,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / perPage),
      },
    };
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId) {
    const result = await query(
      `SELECT * FROM v_user_statistics WHERE user_identity_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }
}

export default IdentityService;
