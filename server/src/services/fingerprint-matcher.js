/**
 * Device fingerprint matching and similarity calculation service
 */

export class FingerprintMatcher {
  constructor() {
    // Matching weights (should sum to 1.0)
    this.weights = {
      canvas: parseFloat(process.env.FINGERPRINT_WEIGHT_CANVAS || '0.30'),
      audio: parseFloat(process.env.FINGERPRINT_WEIGHT_AUDIO || '0.25'),
      hardware: parseFloat(process.env.FINGERPRINT_WEIGHT_HARDWARE || '0.20'),
      screen: parseFloat(process.env.FINGERPRINT_WEIGHT_SCREEN || '0.15'),
      fonts: parseFloat(process.env.FINGERPRINT_WEIGHT_FONTS || '0.10'),
    };

    this.threshold = parseFloat(process.env.MATCH_CONFIDENCE_THRESHOLD || '0.75');
  }

  /**
   * Calculate similarity between two device profiles
   */
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
    scores.hardware = this._compareHardware(
      device1,
      device2,
    ) * this.weights.hardware;

    // Screen matching
    scores.screen = this._compareScreen(
      device1,
      device2,
    ) * this.weights.screen;

    // Font list matching
    scores.fonts = this._compareFonts(
      device1.fonts_list,
      device2.fonts_list,
    ) * this.weights.fonts;

    totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

    return {
      totalScore: Math.min(totalScore, 1.0),
      breakdown: scores,
      isMatch: totalScore >= this.threshold,
    };
  }

  /**
   * Compare exact string values
   */
  _compareExact(value1, value2) {
    if (!value1 || !value2) return 0;
    return value1 === value2 ? 1.0 : 0.0;
  }

  /**
   * Compare hardware characteristics
   */
  _compareHardware(device1, device2) {
    let score = 0;
    let count = 0;

    // Hardware concurrency
    if (device1.hardware_concurrency && device2.hardware_concurrency) {
      score += device1.hardware_concurrency === device2.hardware_concurrency ? 1 : 0;
      count++;
    }

    // Device memory
    if (device1.device_memory && device2.device_memory) {
      score += device1.device_memory === device2.device_memory ? 1 : 0;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Compare screen characteristics
   */
  _compareScreen(device1, device2) {
    let score = 0;
    let count = 0;

    // Screen width
    if (device1.screen_width && device2.screen_width) {
      score += device1.screen_width === device2.screen_width ? 1 : 0;
      count++;
    }

    // Screen height
    if (device1.screen_height && device2.screen_height) {
      score += device1.screen_height === device2.screen_height ? 1 : 0;
      count++;
    }

    // Color depth
    if (device1.screen_color_depth && device2.screen_color_depth) {
      score += device1.screen_color_depth === device2.screen_color_depth ? 1 : 0;
      count++;
    }

    // Pixel ratio (allow small tolerance)
    if (device1.screen_pixel_ratio && device2.screen_pixel_ratio) {
      const diff = Math.abs(device1.screen_pixel_ratio - device2.screen_pixel_ratio);
      score += diff < 0.1 ? 1 : 0;
      count++;
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Compare font lists using Jaccard similarity
   */
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

  /**
   * Find best matching device from a list of candidates
   */
  findBestMatch(targetDevice, candidateDevices) {
    if (!candidateDevices || candidateDevices.length === 0) {
      return null;
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidateDevices) {
      const similarity = this.calculateSimilarity(targetDevice, candidate);
      
      if (similarity.totalScore > bestScore) {
        bestScore = similarity.totalScore;
        bestMatch = {
          device: candidate,
          similarity: similarity,
        };
      }
    }

    return bestMatch && bestMatch.similarity.isMatch ? bestMatch : null;
  }

  /**
   * Classify device change severity
   */
  classifyChange(oldDevice, newDevice) {
    const similarity = this.calculateSimilarity(oldDevice, newDevice);
    
    // Major change indicators
    const hasOSChange = oldDevice.platform !== newDevice.platform;
    const hasHardwareChange = 
      oldDevice.hardware_concurrency !== newDevice.hardware_concurrency ||
      oldDevice.device_memory !== newDevice.device_memory;
    const hasScreenChange = 
      oldDevice.screen_width !== newDevice.screen_width ||
      oldDevice.screen_height !== newDevice.screen_height;

    if (hasOSChange || hasHardwareChange) {
      return {
        type: 'major',
        category: hasOSChange ? 'os_change' : 'hardware_change',
        confidence: similarity.totalScore,
      };
    }

    if (hasScreenChange) {
      return {
        type: 'minor',
        category: 'screen_change',
        confidence: similarity.totalScore,
      };
    }

    // Check user agent for browser updates
    if (this._isBrowserUpdate(oldDevice.user_agent, newDevice.user_agent)) {
      return {
        type: 'minor',
        category: 'browser_update',
        confidence: similarity.totalScore,
      };
    }

    // IP or network change
    if (oldDevice.ip_address !== newDevice.ip_address) {
      return {
        type: 'minor',
        category: 'ip_change',
        confidence: similarity.totalScore,
      };
    }

    // Minor environmental change
    return {
      type: 'minor',
      category: 'environmental_change',
      confidence: similarity.totalScore,
    };
  }

  /**
   * Check if user agent indicates browser update
   */
  _isBrowserUpdate(oldUA, newUA) {
    if (!oldUA || !newUA) return false;

    // Extract browser name and compare
    const oldBrowser = this._extractBrowserInfo(oldUA);
    const newBrowser = this._extractBrowserInfo(newUA);

    return oldBrowser.name === newBrowser.name && 
           oldBrowser.version !== newBrowser.version;
  }

  /**
   * Extract browser name and version from user agent
   */
  _extractBrowserInfo(userAgent) {
    const patterns = [
      { name: 'Chrome', pattern: /Chrome\/(\d+)/ },
      { name: 'Firefox', pattern: /Firefox\/(\d+)/ },
      { name: 'Safari', pattern: /Safari\/(\d+)/ },
      { name: 'Edge', pattern: /Edg\/(\d+)/ },
      { name: 'Opera', pattern: /OPR\/(\d+)/ },
    ];

    for (const { name, pattern } of patterns) {
      const match = userAgent.match(pattern);
      if (match) {
        return { name, version: match[1] };
      }
    }

    return { name: 'Unknown', version: '0' };
  }

  /**
   * Detect specific changes between devices
   */
  detectChanges(oldDevice, newDevice) {
    const changes = [];

    const fields = [
      'user_agent',
      'platform',
      'language',
      'timezone',
      'screen_width',
      'screen_height',
      'screen_color_depth',
      'screen_pixel_ratio',
      'hardware_concurrency',
      'device_memory',
      'canvas_fingerprint',
      'audio_fingerprint',
      'webgl_fingerprint',
      'ip_address',
      'country',
      'city',
    ];

    for (const field of fields) {
      if (oldDevice[field] !== newDevice[field]) {
        changes.push(field);
      }
    }

    // Check font list changes
    if (JSON.stringify(oldDevice.fonts_list) !== JSON.stringify(newDevice.fonts_list)) {
      changes.push('fonts_list');
    }

    // Check plugins changes
    if (JSON.stringify(oldDevice.plugins_list) !== JSON.stringify(newDevice.plugins_list)) {
      changes.push('plugins_list');
    }

    return changes;
  }
}

export default FingerprintMatcher;
