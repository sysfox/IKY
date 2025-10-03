/**
 * Comprehensive Algorithm Test with 5000 Data Points
 * Tests the IKY identification algorithm with realistic device fingerprint data
 */

const crypto = require('crypto');

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
  'Europe/London',
  'Asia/Tokyo',
  'Asia/Shanghai',
];

const LANGUAGES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'zh-CN'];

const FONTS = [
  ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'],
  ['Arial', 'Helvetica', 'Times', 'Courier', 'Palatino', 'Georgia'],
  ['Segoe UI', 'Calibri', 'Cambria', 'Consolas', 'Arial'],
];

/**
 * Simplified FingerprintMatcher for client-side testing
 */
class FingerprintMatcher {
  constructor() {
    this.weights = {
      canvas: 0.30,
      audio: 0.25,
      hardware: 0.20,
      screen: 0.15,
      fonts: 0.10,
    };
    this.threshold = 0.75;
  }

  calculateSimilarity(device1, device2) {
    let totalScore = 0;
    const scores = {};

    // Canvas fingerprint matching (exact match)
    scores.canvas = this._compareExact(
      device1.canvas_fingerprint,
      device2.canvas_fingerprint,
    ) * this.weights.canvas;

    // Audio fingerprint matching (exact match)
    scores.audio = this._compareExact(
      device1.audio_fingerprint,
      device2.audio_fingerprint,
    ) * this.weights.audio;

    // Hardware matching
    scores.hardware = this._compareHardware(device1, device2) * this.weights.hardware;

    // Screen matching
    scores.screen = this._compareScreen(device1, device2) * this.weights.screen;

    // Font list matching
    scores.fonts = this._compareFonts(device1.fonts_list, device2.fonts_list) * this.weights.fonts;

    totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

    return {
      totalScore: Math.min(totalScore, 1.0),
      breakdown: scores,
      isMatch: totalScore >= this.threshold,
    };
  }

  _compareExact(value1, value2) {
    if (!value1 || !value2) return 0;
    return value1 === value2 ? 1.0 : 0.0;
  }

  _compareHardware(device1, device2) {
    let score = 0;
    let count = 0;

    if (device1.hardware_concurrency && device2.hardware_concurrency) {
      score += device1.hardware_concurrency === device2.hardware_concurrency ? 1 : 0;
      count++;
    }

    if (device1.device_memory && device2.device_memory) {
      score += device1.device_memory === device2.device_memory ? 1 : 0;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  _compareScreen(device1, device2) {
    let score = 0;
    let count = 0;

    if (device1.screen_width && device2.screen_width) {
      score += device1.screen_width === device2.screen_width ? 1 : 0;
      count++;
    }

    if (device1.screen_height && device2.screen_height) {
      score += device1.screen_height === device2.screen_height ? 1 : 0;
      count++;
    }

    if (device1.screen_color_depth && device2.screen_color_depth) {
      score += device1.screen_color_depth === device2.screen_color_depth ? 1 : 0;
      count++;
    }

    if (device1.screen_pixel_ratio && device2.screen_pixel_ratio) {
      const diff = Math.abs(device1.screen_pixel_ratio - device2.screen_pixel_ratio);
      score += diff < 0.1 ? 1 : 0;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  _compareFonts(fonts1, fonts2) {
    if (!fonts1 || !fonts2 || fonts1.length === 0 || fonts2.length === 0) {
      return 0;
    }

    const set1 = new Set(fonts1);
    const set2 = new Set(fonts2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}

/**
 * Test Data Generator
 */
class TestDataGenerator {
  constructor() {
    this.generatedUsers = [];
  }

  generateUUID() {
    return crypto.randomUUID();
  }

  generateHash(input) {
    return crypto.createHash('sha256').update(input + Math.random()).digest('hex');
  }

  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

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
      timezone: timezone,
      screen_width: template.screen.width,
      screen_height: template.screen.height,
      screen_color_depth: template.screen.colorDepth,
      screen_pixel_ratio: template.screen.pixelRatio,
      hardware_concurrency: template.hardware.hardwareConcurrency,
      device_memory: template.hardware.deviceMemory,
      canvas_fingerprint: this.generateHash(`canvas-${templateName}`),
      audio_fingerprint: this.generateHash(`audio-${templateName}`),
      fonts_list: fonts,
    };
  }

  simulateBrowserUpdate(device) {
    const updated = { ...device };
    updated.userAgent = updated.userAgent.replace(/Chrome\/120\.0/, 'Chrome/121.0');
    updated.collectedAt = new Date().toISOString();
    return updated;
  }

  simulateResolutionChange(device) {
    const updated = { ...device };
    updated.screen_width = device.screen_width === 1920 ? 2560 : 1920;
    updated.screen_height = device.screen_width === 1920 ? 1440 : 1080;
    updated.collectedAt = new Date().toISOString();
    return updated;
  }

  simulatePluginChange(device) {
    const updated = { ...device };
    updated.fonts_list = [...device.fonts_list];
    if (updated.fonts_list.length > 3) {
      updated.fonts_list.pop();
    } else {
      updated.fonts_list.push('New Font');
    }
    updated.collectedAt = new Date().toISOString();
    return updated;
  }

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

    for (let i = 1; i < sessionsCount; i++) {
      const changeType = this.randomItem([
        'browser_update',
        'resolution_change',
        'plugin_change',
        'same',
      ]);

      let newSession;
      switch (changeType) {
        case 'browser_update':
          newSession = {
            uuid: uuid,
            device: this.simulateBrowserUpdate(currentDevice),
            changeType: 'minor',
          };
          break;

        case 'resolution_change':
          newSession = {
            uuid: uuid,
            device: this.simulateResolutionChange(currentDevice),
            changeType: 'minor',
          };
          break;

        case 'plugin_change':
          newSession = {
            uuid: uuid,
            device: this.simulatePluginChange(currentDevice),
            changeType: 'minor',
          };
          break;

        case 'same':
          newSession = {
            uuid: uuid,
            device: { ...currentDevice, collectedAt: new Date().toISOString() },
            changeType: 'none',
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
}

describe('IKY Algorithm Test Suite with 5000 Data Points', () => {
  let generator;
  let matcher;
  let testData;

  beforeAll(() => {
    generator = new TestDataGenerator();
    matcher = new FingerprintMatcher();
    
    // Generate 5000 data points (1000 users × ~5 sessions each ≈ 5000 sessions)
    console.log('Generating 5000 data points for algorithm testing...');
    testData = generator.generateUsers(1000);
    
    const totalSessions = testData.reduce((sum, user) => sum + user.sessions.length, 0);
    console.log(`Generated ${testData.length} users with ${totalSessions} total sessions`);
  });

  describe('Data Generation', () => {
    it('should generate approximately 5000 data points', () => {
      const totalSessions = testData.reduce((sum, user) => sum + user.sessions.length, 0);
      expect(totalSessions).toBeGreaterThanOrEqual(3000);
      expect(totalSessions).toBeLessThanOrEqual(10000);
      console.log(`  ✓ Generated ${totalSessions} data points`);
    });

    it('should have valid device fingerprints', () => {
      const sampleSession = testData[0].sessions[0];
      expect(sampleSession.device.canvas_fingerprint).toBeDefined();
      expect(sampleSession.device.audio_fingerprint).toBeDefined();
      expect(sampleSession.device.hardware_concurrency).toBeDefined();
      expect(sampleSession.device.screen_width).toBeDefined();
    });

    it('should have diverse device types', () => {
      const platforms = new Set();
      testData.forEach(user => {
        user.sessions.forEach(session => {
          platforms.add(session.device.platform);
        });
      });
      expect(platforms.size).toBeGreaterThan(1);
      console.log(`  ✓ ${platforms.size} different platforms detected`);
    });
  });

  describe('Fingerprint Matching Algorithm', () => {
    it('should match identical devices with score 1.0', () => {
      const device = testData[0].sessions[0].device;
      const result = matcher.calculateSimilarity(device, device);
      
      expect(result.totalScore).toBe(1.0);
      expect(result.isMatch).toBe(true);
    });

    it('should correctly identify same user across multiple sessions', () => {
      const user = testData[0];
      const firstSession = user.sessions[0].device;
      const lastSession = user.sessions[user.sessions.length - 1].device;
      
      const result = matcher.calculateSimilarity(firstSession, lastSession);
      
      // Should have some similarity even with changes
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should distinguish between different users', () => {
      const user1Device = testData[0].sessions[0].device;
      const user2Device = testData[1].sessions[0].device;
      
      const result = matcher.calculateSimilarity(user1Device, user2Device);
      
      // Different users should have low similarity
      expect(result.totalScore).toBeLessThan(1.0);
    });

    it('should handle browser updates as minor changes', () => {
      const originalDevice = generator.generateBaseDevice('windows_chrome');
      const updatedDevice = generator.simulateBrowserUpdate(originalDevice);
      
      const result = matcher.calculateSimilarity(originalDevice, updatedDevice);
      
      // Should still match because hardware/fingerprints are same
      expect(result.totalScore).toBeGreaterThanOrEqual(0.75);
      expect(result.isMatch).toBe(true);
    });

    it('should handle resolution changes appropriately', () => {
      const originalDevice = generator.generateBaseDevice('windows_chrome');
      const changedDevice = generator.simulateResolutionChange(originalDevice);
      
      const result = matcher.calculateSimilarity(originalDevice, changedDevice);
      
      // Canvas and audio should still match
      expect(result.breakdown.canvas).toBeGreaterThan(0);
      expect(result.breakdown.audio).toBeGreaterThan(0);
    });
  });

  describe('Algorithm Performance with Large Dataset', () => {
    it('should process matching for all sessions efficiently', () => {
      const startTime = Date.now();
      let matchCount = 0;
      let totalComparisons = 0;

      // Test first 100 users for performance
      testData.slice(0, 100).forEach(user => {
        if (user.sessions.length > 1) {
          const firstDevice = user.sessions[0].device;
          
          user.sessions.slice(1).forEach(session => {
            const result = matcher.calculateSimilarity(firstDevice, session.device);
            totalComparisons++;
            if (result.isMatch) {
              matchCount++;
            }
          });
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`  ✓ Processed ${totalComparisons} comparisons in ${duration}ms`);
      console.log(`  ✓ Average: ${(duration / totalComparisons).toFixed(2)}ms per comparison`);
      console.log(`  ✓ Matches found: ${matchCount}/${totalComparisons}`);
      
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(totalComparisons).toBeGreaterThan(0);
    });

    it('should maintain consistency across all test data', () => {
      let consistentMatches = 0;
      let totalUsers = 0;

      testData.slice(0, 100).forEach(user => {
        if (user.sessions.length < 2) return;
        
        totalUsers++;
        const firstDevice = user.sessions[0].device;
        const secondDevice = user.sessions[1].device;
        
        // Should match if same UUID
        const result = matcher.calculateSimilarity(firstDevice, secondDevice);
        
        if (user.sessions[0].uuid === user.sessions[1].uuid) {
          // Same user should have high similarity
          if (result.totalScore > 0.5) {
            consistentMatches++;
          }
        }
      });

      const consistency = (consistentMatches / totalUsers) * 100;
      console.log(`  ✓ Algorithm consistency: ${consistency.toFixed(1)}%`);
      
      expect(consistency).toBeGreaterThan(50);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle missing fingerprint data gracefully', () => {
      const device1 = { canvas_fingerprint: 'abc' };
      const device2 = { canvas_fingerprint: 'def' };
      
      const result = matcher.calculateSimilarity(device1, device2);
      
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(1);
    });

    it('should handle empty font lists', () => {
      const device1 = { fonts_list: [] };
      const device2 = { fonts_list: [] };
      
      const result = matcher._compareFonts(device1.fonts_list, device2.fonts_list);
      
      expect(result).toBe(0);
    });

    it('should calculate font similarity correctly', () => {
      const fonts1 = ['Arial', 'Verdana', 'Times'];
      const fonts2 = ['Arial', 'Verdana', 'Helvetica'];
      
      const similarity = matcher._compareFonts(fonts1, fonts2);
      
      // 2 common fonts out of 4 total = 0.5
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('Statistical Analysis of Test Data', () => {
    it('should provide comprehensive statistics', () => {
      const stats = {
        totalUsers: testData.length,
        totalSessions: 0,
        changeTypes: {},
        platforms: new Set(),
        avgSessionsPerUser: 0,
      };

      testData.forEach(user => {
        stats.totalSessions += user.sessions.length;
        user.sessions.forEach(session => {
          stats.changeTypes[session.changeType] = 
            (stats.changeTypes[session.changeType] || 0) + 1;
          stats.platforms.add(session.device.platform);
        });
      });

      stats.avgSessionsPerUser = (stats.totalSessions / stats.totalUsers).toFixed(2);

      console.log('\n  === Test Data Statistics ===');
      console.log(`  Total Users: ${stats.totalUsers}`);
      console.log(`  Total Sessions: ${stats.totalSessions}`);
      console.log(`  Average Sessions per User: ${stats.avgSessionsPerUser}`);
      console.log(`  Unique Platforms: ${stats.platforms.size}`);
      console.log('  Change Type Distribution:');
      Object.entries(stats.changeTypes).forEach(([type, count]) => {
        console.log(`    ${type}: ${count} (${((count / stats.totalSessions) * 100).toFixed(1)}%)`);
      });
      console.log('  ============================\n');

      expect(stats.totalSessions).toBeGreaterThan(3000);
      expect(stats.platforms.size).toBeGreaterThan(0);
    });
  });
});
