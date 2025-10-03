/**
 * IKY Client Library
 * Main entry point for the client-side device fingerprinting and identification system
 */

export { UUIDManager } from './uuid.js';
export { DeviceFingerprint } from './fingerprint.js';
export { APIClient } from './api-client.js';

/**
 * HeyINY - Main class that integrates all components
 */
export class HeyINY {
  constructor(options = {}) {
    this.uuidManager = new (require('./uuid.js').UUIDManager)(options.uuid);
    this.fingerprint = new (require('./fingerprint.js').DeviceFingerprint)(options.fingerprint);
    this.apiClient = new (require('./api-client.js').APIClient)(options.api);
    
    this.autoIdentify = options.autoIdentify !== false;
    this.identifyOnLoad = options.identifyOnLoad !== false;
  }

  /**
   * Initialize the system
   */
  async init() {
    if (this.autoIdentify && this.identifyOnLoad) {
      return await this.identify();
    }
    return null;
  }

  /**
   * Perform user identification
   */
  async identify() {
    try {
      // Get or create UUID
      const clientUUID = await this.uuidManager.getOrCreateUUID();
      
      // Collect device fingerprint
      const deviceInfo = await this.fingerprint.collect();
      
      // Send to server for identification
      const result = await this.apiClient.identify(clientUUID, deviceInfo);
      
      return {
        ...result,
        clientUUID: clientUUID,
      };
    } catch (error) {
      console.error('Identification failed:', error);
      throw error;
    }
  }

  /**
   * Get the current client UUID
   */
  async getClientUUID() {
    return await this.uuidManager.getOrCreateUUID();
  }

  /**
   * Get current device fingerprint
   */
  async getFingerprint() {
    return await this.fingerprint.collect();
  }

  /**
   * Get compact fingerprint (hashed)
   */
  async getCompactFingerprint() {
    return await this.fingerprint.collectCompact();
  }

  /**
   * Reset the client UUID (generates a new one)
   */
  async resetUUID() {
    return await this.uuidManager.resetUUID();
  }

  /**
   * Delete UUID (GDPR compliance)
   */
  async deleteUUID() {
    return await this.uuidManager.deleteUUID();
  }

  /**
   * Get user device history
   */
  async getDeviceHistory(userId, options) {
    return await this.apiClient.getDeviceHistory(userId, options);
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId) {
    return await this.apiClient.getUserStatistics(userId);
  }

  /**
   * Compare two device profiles
   */
  async compareDevices(sessionId1, sessionId2) {
    return await this.apiClient.compareDevices(sessionId1, sessionId2);
  }
}

export default HeyINY;
