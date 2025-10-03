#!/usr/bin/env node

/**
 * Test Data Generator for Hey-INY
 * Generates realistic device fingerprints and user data for testing
 */

import crypto from 'crypto';

// Device templates
const DEVICE_TEMPLATES = {
  windows_chrome: {
    platform: 'Win32',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
    hardware: { hardwareConcurrency: 8, deviceMemory: 16 },
  },
  mac_safari: {
    platform: 'MacIntel',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    screen: { width: 2560, height: 1440, colorDepth: 24, pixelRatio: 2 },
    hardware: { hardwareConcurrency: 8, deviceMemory: 16 },
  },
  mac_chrome: {
    platform: 'MacIntel',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    screen: { width: 2560, height: 1440, colorDepth: 24, pixelRatio: 2 },
    hardware: { hardwareConcurrency: 10, deviceMemory: 32 },
  },
  linux_firefox: {
    platform: 'Linux x86_64',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
    hardware: { hardwareConcurrency: 16, deviceMemory: 32 },
  },
  mobile_android: {
    platform: 'Linux armv8l',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    screen: { width: 1080, height: 2400, colorDepth: 24, pixelRatio: 3 },
    hardware: { hardwareConcurrency: 8, deviceMemory: 8 },
  },
  mobile_ios: {
    platform: 'iPhone',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    screen: { width: 390, height: 844, colorDepth: 24, pixelRatio: 3 },
    hardware: { hardwareConcurrency: 6, deviceMemory: 6 },
  },
};

const TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const LANGUAGES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'];

const FONTS = [
  ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'],
  ['Arial', 'Helvetica', 'Times', 'Courier', 'Palatino', 'Georgia'],
  ['Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact'],
  ['Segoe UI', 'Calibri', 'Cambria', 'Consolas', 'Arial'],
];

class TestDataGenerator {
  constructor() {
    this.generatedUsers = [];
  }

  /**
   * Generate a random UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Generate a random hash
   */
  generateHash(input) {
    return crypto.createHash('sha256').update(input + Math.random()).digest('hex');
  }

  /**
   * Pick random item from array
   */
  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate base device from template
   */
  generateBaseDevice(templateName) {
    const template = DEVICE_TEMPLATES[templateName];
    const timezone = this.randomItem(TIMEZONES);
    const language = this.randomItem(LANGUAGES);
    const fonts = this.randomItem(FONTS);

    return {
      collectedAt: new Date().toISOString(),
      userAgent: template.userAgent,
      platform: template.platform,
      language: language,
      languages: [language],
      timezone: timezone,
      timezoneOffset: new Date().getTimezoneOffset(),
      screen: { ...template.screen },
      hardware: { ...template.hardware },
      canvas: {
        hash: this.generateHash(`canvas-${templateName}`),
      },
      audio: {
        hash: this.generateHash(`audio-${templateName}`),
      },
      fonts: {
        fonts: fonts,
        count: fonts.length,
      },
      webgl: {
        vendor: 'Google Inc.',
        renderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics)',
      },
    };
  }

  /**
   * Simulate browser update
   */
  simulateBrowserUpdate(device) {
    const updated = JSON.parse(JSON.stringify(device));
    
    // Update version number in user agent
    updated.userAgent = updated.userAgent.replace(/Chrome\/120\.0/, 'Chrome/121.0');
    updated.collectedAt = new Date().toISOString();
    
    return updated;
  }

  /**
   * Simulate resolution change
   */
  simulateResolutionChange(device) {
    const updated = JSON.parse(JSON.stringify(device));
    
    updated.screen.width = device.screen.width === 1920 ? 2560 : 1920;
    updated.screen.height = device.screen.width === 1920 ? 1440 : 1080;
    updated.collectedAt = new Date().toISOString();
    
    return updated;
  }

  /**
   * Simulate plugin change
   */
  simulatePluginChange(device) {
    const updated = JSON.parse(JSON.stringify(device));
    
    // Add or remove a font
    if (updated.fonts.fonts.length > 3) {
      updated.fonts.fonts.pop();
    } else {
      updated.fonts.fonts.push('New Font');
    }
    updated.fonts.count = updated.fonts.fonts.length;
    updated.collectedAt = new Date().toISOString();
    
    return updated;
  }

  /**
   * Simulate device reset (UUID change but same hardware)
   */
  simulateDeviceReset(device, newUUID) {
    const updated = JSON.parse(JSON.stringify(device));
    updated.collectedAt = new Date().toISOString();
    return { uuid: newUUID, device: updated };
  }

  /**
   * Simulate complete device change
   */
  simulateDeviceChange(oldTemplate, newTemplate) {
    return this.generateBaseDevice(newTemplate);
  }

  /**
   * Generate a user with multiple device sessions
   */
  generateUser(userId, sessionsCount = 5) {
    const templateNames = Object.keys(DEVICE_TEMPLATES);
    const primaryTemplate = this.randomItem(templateNames);
    const uuid = this.generateUUID();
    
    const sessions = [];
    let currentDevice = this.generateBaseDevice(primaryTemplate);
    
    sessions.push({
      uuid: uuid,
      device: currentDevice,
      changeType: 'initial',
    });

    // Generate device changes
    for (let i = 1; i < sessionsCount; i++) {
      const changeType = this.randomItem([
        'browser_update',
        'resolution_change',
        'plugin_change',
        'device_reset',
        'device_change',
      ]);

      let newSession;
      switch (changeType) {
        case 'browser_update':
          newSession = {
            uuid: uuid,
            device: this.simulateBrowserUpdate(currentDevice),
            changeType: 'minor',
            changeCategory: 'browser_update',
          };
          break;

        case 'resolution_change':
          newSession = {
            uuid: uuid,
            device: this.simulateResolutionChange(currentDevice),
            changeType: 'minor',
            changeCategory: 'screen_change',
          };
          break;

        case 'plugin_change':
          newSession = {
            uuid: uuid,
            device: this.simulatePluginChange(currentDevice),
            changeType: 'minor',
            changeCategory: 'environmental_change',
          };
          break;

        case 'device_reset':
          const newUUID = this.generateUUID();
          const reset = this.simulateDeviceReset(currentDevice, newUUID);
          newSession = {
            uuid: reset.uuid,
            device: reset.device,
            changeType: 'device_reset',
          };
          break;

        case 'device_change':
          const newTemplate = this.randomItem(templateNames.filter(t => t !== primaryTemplate));
          newSession = {
            uuid: uuid,
            device: this.simulateDeviceChange(primaryTemplate, newTemplate),
            changeType: 'major',
            changeCategory: 'device_change',
          };
          break;
      }

      sessions.push(newSession);
      currentDevice = newSession.device;
    }

    return {
      userId: userId,
      sessions: sessions,
    };
  }

  /**
   * Generate multiple users
   */
  generateUsers(count = 10) {
    const users = [];
    
    for (let i = 0; i < count; i++) {
      const sessionsCount = Math.floor(Math.random() * 8) + 3; // 3-10 sessions
      const user = this.generateUser(`test_user_${i + 1}`, sessionsCount);
      users.push(user);
    }

    this.generatedUsers = users;
    return users;
  }

  /**
   * Export to JSON file
   */
  exportToJSON() {
    return JSON.stringify(this.generatedUsers, null, 2);
  }

  /**
   * Generate SQL INSERT statements
   */
  generateSQL() {
    // This would generate SQL INSERT statements for direct database insertion
    // Implementation depends on specific needs
    console.log('SQL generation not implemented. Use JSON export and API instead.');
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('='.repeat(60));
    console.log('Test Data Generation Summary');
    console.log('='.repeat(60));
    console.log(`Total Users: ${this.generatedUsers.length}`);
    
    let totalSessions = 0;
    const changeTypes = {};
    
    this.generatedUsers.forEach(user => {
      totalSessions += user.sessions.length;
      user.sessions.forEach(session => {
        changeTypes[session.changeType] = (changeTypes[session.changeType] || 0) + 1;
      });
    });

    console.log(`Total Sessions: ${totalSessions}`);
    console.log(`Average Sessions per User: ${(totalSessions / this.generatedUsers.length).toFixed(1)}`);
    console.log('\nChange Type Distribution:');
    Object.entries(changeTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('='.repeat(60));
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new TestDataGenerator();
  
  const userCount = parseInt(process.argv[2]) || 100;
  
  console.log(`Generating test data for ${userCount} users...`);
  
  generator.generateUsers(userCount);
  generator.printSummary();
  
  // Export to file
  const fs = await import('fs');
  const output = generator.exportToJSON();
  fs.writeFileSync('test-data.json', output);
  
  console.log('\n✓ Test data exported to test-data.json');
  console.log('\nTo use this data:');
  console.log('  1. Parse test-data.json');
  console.log('  2. Send each session to POST /api/v1/identify');
  console.log('  3. Verify the matching algorithm behavior');
}

export default TestDataGenerator;
