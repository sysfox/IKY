/**
 * Hey-INY Client UUID Manager
 * Manages persistent UUID across localStorage, IndexedDB, and Cookie fallbacks
 */

export class UUIDManager {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'hey_iny_client_uuid';
    this.cookieName = options.cookieName || 'hey_iny_uuid';
    this.cookieMaxAge = options.cookieMaxAge || 365 * 24 * 60 * 60; // 1 year in seconds
    this.dbName = options.dbName || 'HeyINYDB';
    this.dbStoreName = options.dbStoreName || 'uuid_store';
  }

  /**
   * Get or create a persistent UUID
   * Priority: localStorage -> IndexedDB -> Cookie -> Generate New
   */
  async getOrCreateUUID() {
    try {
      // Try localStorage first (fastest)
      let uuid = this._getFromLocalStorage();
      if (uuid) {
        await this._syncToAllStorage(uuid);
        return uuid;
      }

      // Try IndexedDB
      uuid = await this._getFromIndexedDB();
      if (uuid) {
        await this._syncToAllStorage(uuid);
        return uuid;
      }

      // Try Cookie
      uuid = this._getFromCookie();
      if (uuid) {
        await this._syncToAllStorage(uuid);
        return uuid;
      }

      // Generate new UUID
      uuid = this._generateUUID();
      await this._syncToAllStorage(uuid);
      return uuid;
    } catch (error) {
      console.error('Error in getOrCreateUUID:', error);
      // Fallback to generating a new UUID
      const uuid = this._generateUUID();
      try {
        await this._syncToAllStorage(uuid);
      } catch (syncError) {
        console.error('Error syncing UUID:', syncError);
      }
      return uuid;
    }
  }

  /**
   * Generate a new UUID using native crypto API with fallback
   */
  _generateUUID() {
    // Try native crypto.randomUUID() first (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback to UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get UUID from localStorage
   */
  _getFromLocalStorage() {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(this.storageKey);
    } catch (error) {
      console.warn('localStorage not available:', error);
      return null;
    }
  }

  /**
   * Save UUID to localStorage
   */
  _saveToLocalStorage(uuid) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, uuid);
        return true;
      }
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
    }
    return false;
  }

  /**
   * Get UUID from IndexedDB
   */
  async _getFromIndexedDB() {
    try {
      if (typeof indexedDB === 'undefined') return null;

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.dbStoreName)) {
            resolve(null);
            return;
          }

          const transaction = db.transaction([this.dbStoreName], 'readonly');
          const store = transaction.objectStore(this.dbStoreName);
          const getRequest = store.get('uuid');

          getRequest.onsuccess = () => {
            resolve(getRequest.result ? getRequest.result.value : null);
          };

          getRequest.onerror = () => reject(getRequest.error);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.dbStoreName)) {
            db.createObjectStore(this.dbStoreName, { keyPath: 'key' });
          }
        };
      });
    } catch (error) {
      console.warn('IndexedDB not available:', error);
      return null;
    }
  }

  /**
   * Save UUID to IndexedDB
   */
  async _saveToIndexedDB(uuid) {
    try {
      if (typeof indexedDB === 'undefined') return false;

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction([this.dbStoreName], 'readwrite');
          const store = transaction.objectStore(this.dbStoreName);
          const putRequest = store.put({ key: 'uuid', value: uuid });

          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.dbStoreName)) {
            db.createObjectStore(this.dbStoreName, { keyPath: 'key' });
          }
        };
      });
    } catch (error) {
      console.warn('Error saving to IndexedDB:', error);
      return false;
    }
  }

  /**
   * Get UUID from Cookie
   */
  _getFromCookie() {
    try {
      if (typeof document === 'undefined') return null;
      
      const name = this.cookieName + '=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookieArray = decodedCookie.split(';');

      for (let cookie of cookieArray) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
          return cookie.substring(name.length);
        }
      }
    } catch (error) {
      console.warn('Error reading cookie:', error);
    }
    return null;
  }

  /**
   * Save UUID to Cookie
   */
  _saveToCookie(uuid) {
    try {
      if (typeof document === 'undefined') return false;

      const date = new Date();
      date.setTime(date.getTime() + this.cookieMaxAge * 1000);
      const expires = 'expires=' + date.toUTCString();
      document.cookie = `${this.cookieName}=${uuid};${expires};path=/;SameSite=Strict`;
      return true;
    } catch (error) {
      console.warn('Error saving to cookie:', error);
      return false;
    }
  }

  /**
   * Sync UUID to all available storage mechanisms
   */
  async _syncToAllStorage(uuid) {
    const results = await Promise.allSettled([
      Promise.resolve(this._saveToLocalStorage(uuid)),
      this._saveToIndexedDB(uuid),
      Promise.resolve(this._saveToCookie(uuid))
    ]);

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    if (successCount === 0) {
      console.warn('Failed to save UUID to any storage mechanism');
    }
  }

  /**
   * Manually reset UUID (useful for testing or user preference)
   */
  async resetUUID() {
    const newUUID = this._generateUUID();
    await this._syncToAllStorage(newUUID);
    return newUUID;
  }

  /**
   * Delete UUID from all storage (for GDPR compliance)
   */
  async deleteUUID() {
    try {
      // Delete from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      }

      // Delete from IndexedDB
      if (typeof indexedDB !== 'undefined') {
        await new Promise((resolve, reject) => {
          const request = indexedDB.open(this.dbName, 1);
          request.onsuccess = () => {
            const db = request.result;
            if (db.objectStoreNames.contains(this.dbStoreName)) {
              const transaction = db.transaction([this.dbStoreName], 'readwrite');
              const store = transaction.objectStore(this.dbStoreName);
              const deleteRequest = store.delete('uuid');
              deleteRequest.onsuccess = () => resolve();
              deleteRequest.onerror = () => reject(deleteRequest.error);
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      }

      // Delete cookie
      if (typeof document !== 'undefined') {
        document.cookie = `${this.cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      }

      return true;
    } catch (error) {
      console.error('Error deleting UUID:', error);
      return false;
    }
  }

  /**
   * Check if UUID exists in any storage
   */
  async hasUUID() {
    const uuid = await this.getOrCreateUUID();
    return uuid !== null;
  }
}

export default UUIDManager;
