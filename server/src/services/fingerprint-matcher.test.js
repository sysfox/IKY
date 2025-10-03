/**
 * Tests for FingerprintMatcher service
 */

import { FingerprintMatcher } from './fingerprint-matcher.js';

describe('FingerprintMatcher', () => {
  let matcher;

  beforeEach(() => {
    matcher = new FingerprintMatcher();
  });

  describe('Initialization', () => {
    it('should initialize with default weights', () => {
      expect(matcher.weights.canvas).toBe(0.30);
      expect(matcher.weights.audio).toBe(0.25);
      expect(matcher.weights.hardware).toBe(0.20);
      expect(matcher.weights.screen).toBe(0.15);
      expect(matcher.weights.fonts).toBe(0.10);
    });

    it('should initialize with default threshold', () => {
      expect(matcher.threshold).toBe(0.75);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return score of 1.0 for identical devices', () => {
      const device = {
        canvas_fingerprint: 'abc123',
        audio_fingerprint: 'def456',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
        screen_color_depth: 24,
        screen_pixel_ratio: 1,
        fonts_list: ['Arial', 'Verdana', 'Times'],
      };

      const result = matcher.calculateSimilarity(device, device);

      expect(result.totalScore).toBe(1.0);
      expect(result.isMatch).toBe(true);
    });

    it('should return score of 0 for completely different devices', () => {
      const device1 = {
        canvas_fingerprint: 'abc123',
        audio_fingerprint: 'def456',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
        screen_color_depth: 24,
        screen_pixel_ratio: 1,
        fonts_list: ['Arial', 'Verdana', 'Times'],
      };

      const device2 = {
        canvas_fingerprint: 'xyz789',
        audio_fingerprint: 'uvw012',
        hardware_concurrency: 4,
        device_memory: 8,
        screen_width: 1280,
        screen_height: 720,
        screen_color_depth: 16,
        screen_pixel_ratio: 2,
        fonts_list: ['Helvetica', 'Georgia', 'Courier'],
      };

      const result = matcher.calculateSimilarity(device1, device2);

      expect(result.totalScore).toBeLessThan(0.75);
      expect(result.isMatch).toBe(false);
    });

    it('should detect partial matches', () => {
      const device1 = {
        canvas_fingerprint: 'abc123',
        audio_fingerprint: 'def456',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
        fonts_list: ['Arial', 'Verdana', 'Times'],
      };

      const device2 = {
        canvas_fingerprint: 'abc123', // Same
        audio_fingerprint: 'def456', // Same
        hardware_concurrency: 8,      // Same
        device_memory: 16,             // Same
        screen_width: 2560,            // Different
        screen_height: 1440,           // Different
        fonts_list: ['Arial', 'Verdana', 'Helvetica'], // Partial overlap
      };

      const result = matcher.calculateSimilarity(device1, device2);

      expect(result.totalScore).toBeGreaterThan(0.5);
      expect(result.breakdown.canvas).toBeGreaterThan(0);
      expect(result.breakdown.audio).toBeGreaterThan(0);
    });
  });

  describe('_compareExact', () => {
    it('should return 1.0 for exact matches', () => {
      expect(matcher._compareExact('abc123', 'abc123')).toBe(1.0);
    });

    it('should return 0 for different values', () => {
      expect(matcher._compareExact('abc123', 'xyz789')).toBe(0);
    });

    it('should return 0 for null values', () => {
      expect(matcher._compareExact(null, 'abc123')).toBe(0);
      expect(matcher._compareExact('abc123', null)).toBe(0);
      expect(matcher._compareExact(null, null)).toBe(0);
    });
  });

  describe('_compareHardware', () => {
    it('should return 1.0 for identical hardware', () => {
      const device1 = {
        hardware_concurrency: 8,
        device_memory: 16,
      };

      const device2 = {
        hardware_concurrency: 8,
        device_memory: 16,
      };

      expect(matcher._compareHardware(device1, device2)).toBe(1.0);
    });

    it('should return 0.5 when one property matches', () => {
      const device1 = {
        hardware_concurrency: 8,
        device_memory: 16,
      };

      const device2 = {
        hardware_concurrency: 8,
        device_memory: 8,
      };

      expect(matcher._compareHardware(device1, device2)).toBe(0.5);
    });

    it('should return 0 for completely different hardware', () => {
      const device1 = {
        hardware_concurrency: 8,
        device_memory: 16,
      };

      const device2 = {
        hardware_concurrency: 4,
        device_memory: 8,
      };

      expect(matcher._compareHardware(device1, device2)).toBe(0);
    });
  });

  describe('_compareScreen', () => {
    it('should return 1.0 for identical screens', () => {
      const device1 = {
        screen_width: 1920,
        screen_height: 1080,
        screen_color_depth: 24,
        screen_pixel_ratio: 1,
      };

      const device2 = {
        screen_width: 1920,
        screen_height: 1080,
        screen_color_depth: 24,
        screen_pixel_ratio: 1,
      };

      expect(matcher._compareScreen(device1, device2)).toBe(1.0);
    });

    it('should return partial score for partial matches', () => {
      const device1 = {
        screen_width: 1920,
        screen_height: 1080,
        screen_color_depth: 24,
        screen_pixel_ratio: 1,
      };

      const device2 = {
        screen_width: 1920,
        screen_height: 1080,
        screen_color_depth: 16,
        screen_pixel_ratio: 1,
      };

      const score = matcher._compareScreen(device1, device2);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('_compareFonts', () => {
    it('should return 1.0 for identical font lists', () => {
      const fonts1 = ['Arial', 'Verdana', 'Times'];
      const fonts2 = ['Arial', 'Verdana', 'Times'];

      expect(matcher._compareFonts(fonts1, fonts2)).toBe(1.0);
    });

    it('should calculate Jaccard similarity correctly', () => {
      const fonts1 = ['Arial', 'Verdana', 'Times'];
      const fonts2 = ['Arial', 'Verdana', 'Helvetica'];

      const similarity = matcher._compareFonts(fonts1, fonts2);
      
      // 2 common fonts (Arial, Verdana) out of 4 total unique fonts
      expect(similarity).toBeCloseTo(0.5, 2);
    });

    it('should return 0 for completely different fonts', () => {
      const fonts1 = ['Arial', 'Verdana', 'Times'];
      const fonts2 = ['Helvetica', 'Georgia', 'Courier'];

      expect(matcher._compareFonts(fonts1, fonts2)).toBe(0);
    });

    it('should return 0 for empty font lists', () => {
      expect(matcher._compareFonts([], [])).toBe(0);
      expect(matcher._compareFonts(['Arial'], [])).toBe(0);
      expect(matcher._compareFonts([], ['Arial'])).toBe(0);
    });

    it('should handle null or undefined font lists', () => {
      expect(matcher._compareFonts(null, null)).toBe(0);
      expect(matcher._compareFonts(undefined, undefined)).toBe(0);
      expect(matcher._compareFonts(['Arial'], null)).toBe(0);
    });
  });

  describe('findBestMatch', () => {
    it('should return null for empty candidate list', () => {
      const targetDevice = {
        canvas_fingerprint: 'abc123',
      };

      expect(matcher.findBestMatch(targetDevice, [])).toBeNull();
      expect(matcher.findBestMatch(targetDevice, null)).toBeNull();
    });

    it('should find the best matching device', () => {
      const targetDevice = {
        canvas_fingerprint: 'abc123',
        audio_fingerprint: 'def456',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
        fonts_list: ['Arial', 'Verdana'],
      };

      const candidates = [
        {
          canvas_fingerprint: 'xyz789',
          audio_fingerprint: 'uvw012',
          hardware_concurrency: 4,
          device_memory: 8,
          screen_width: 1280,
          screen_height: 720,
          fonts_list: ['Helvetica'],
        },
        {
          canvas_fingerprint: 'abc123', // Match
          audio_fingerprint: 'def456', // Match
          hardware_concurrency: 8,     // Match
          device_memory: 16,           // Match
          screen_width: 1920,          // Match
          screen_height: 1080,         // Match
          fonts_list: ['Arial', 'Verdana'], // Match
        },
      ];

      const result = matcher.findBestMatch(targetDevice, candidates);

      expect(result).not.toBeNull();
      expect(result.device).toBe(candidates[1]);
      expect(result.similarity.isMatch).toBe(true);
    });

    it('should return null if no candidate meets threshold', () => {
      const targetDevice = {
        canvas_fingerprint: 'abc123',
        audio_fingerprint: 'def456',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
        fonts_list: ['Arial', 'Verdana'],
      };

      const candidates = [
        {
          canvas_fingerprint: 'xyz789',
          audio_fingerprint: 'uvw012',
          hardware_concurrency: 4,
          device_memory: 8,
          screen_width: 1280,
          screen_height: 720,
          fonts_list: ['Helvetica'],
        },
      ];

      const result = matcher.findBestMatch(targetDevice, candidates);

      expect(result).toBeNull();
    });
  });

  describe('classifyChange', () => {
    it('should classify OS change as major', () => {
      const oldDevice = {
        platform: 'Win32',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
        hardware_concurrency: 8,
        device_memory: 16,
      };

      const newDevice = {
        platform: 'MacIntel',
        user_agent: 'Mozilla/5.0 (Macintosh)',
        hardware_concurrency: 8,
        device_memory: 16,
      };

      const result = matcher.classifyChange(oldDevice, newDevice);

      expect(result.type).toBe('major');
      expect(result.category).toBe('os_change');
    });

    it('should classify hardware change as major', () => {
      const oldDevice = {
        platform: 'Win32',
        hardware_concurrency: 8,
        device_memory: 16,
      };

      const newDevice = {
        platform: 'Win32',
        hardware_concurrency: 4,
        device_memory: 16,
      };

      const result = matcher.classifyChange(oldDevice, newDevice);

      expect(result.type).toBe('major');
      expect(result.category).toBe('hardware_change');
    });

    it('should classify screen change as minor', () => {
      const oldDevice = {
        platform: 'Win32',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
      };

      const newDevice = {
        platform: 'Win32',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 2560,
        screen_height: 1440,
      };

      const result = matcher.classifyChange(oldDevice, newDevice);

      expect(result.type).toBe('minor');
      expect(result.category).toBe('screen_change');
    });

    it('should classify browser update as minor', () => {
      const oldDevice = {
        platform: 'Win32',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
      };

      const newDevice = {
        platform: 'Win32',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/121.0.0.0',
        hardware_concurrency: 8,
        device_memory: 16,
        screen_width: 1920,
        screen_height: 1080,
      };

      const result = matcher.classifyChange(oldDevice, newDevice);

      expect(result.type).toBe('minor');
      expect(result.category).toBe('browser_update');
    });
  });
});
