/**
 * IKY API Client
 * Handles communication with the server-side identification API
 */

export class APIClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:3000';
    this.apiPrefix = options.apiPrefix || '/api/v1';
    this.timeout = options.timeout || 30000; // 30 seconds
  }

  /**
   * Send identification request to server
   */
  async identify(clientUUID, deviceInfo) {
    try {
      const response = await this._fetch('/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_uuid: clientUUID,
          device_info: deviceInfo,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Identification request failed:', error);
      throw error;
    }
  }

  /**
   * Get user device history
   */
  async getDeviceHistory(userId, options = {}) {
    try {
      const queryParams = new URLSearchParams({
        page: options.page || 1,
        per_page: options.perPage || 50,
        ...(options.changeType && { change_type: options.changeType }),
        ...(options.startDate && { start_date: options.startDate }),
        ...(options.endDate && { end_date: options.endDate }),
      });

      const response = await this._fetch(`/users/${userId}/device-history?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get device history failed:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId) {
    try {
      const response = await this._fetch(`/users/${userId}/statistics`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get user statistics failed:', error);
      throw error;
    }
  }

  /**
   * Compare two device profiles
   */
  async compareDevices(sessionId1, sessionId2) {
    try {
      const response = await this._fetch('/devices/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id_1: sessionId1,
          session_id_2: sessionId2,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Compare devices failed:', error);
      throw error;
    }
  }

  /**
   * Internal fetch wrapper with timeout and error handling
   */
  async _fetch(endpoint, options = {}) {
    const url = `${this.baseURL}${this.apiPrefix}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Set base URL for API requests
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * Set timeout for requests
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }
}

export default APIClient;
