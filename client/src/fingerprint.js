/**
 * IKY Device Fingerprinting Module
 * Collects comprehensive device information for user identification
 */

export class DeviceFingerprint {
  constructor(options = {}) {
    this.includeCanvas = options.includeCanvas !== false;
    this.includeAudio = options.includeAudio !== false;
    this.includeFonts = options.includeFonts !== false;
    this.includeWebGL = options.includeWebGL !== false;
  }

  /**
   * Collect all available device information
   */
  async collect() {
    const deviceInfo = {
      // Timestamp of collection
      collectedAt: new Date().toISOString(),

      // Basic environment
      ...this._collectBasicInfo(),

      // Screen information
      screen: this._collectScreenInfo(),

      // Hardware information
      hardware: this._collectHardwareInfo(),

      // Browser features
      browser: this._collectBrowserInfo(),

      // Network information (basic client-side info)
      network: this._collectNetworkInfo(),
    };

    // Add fingerprints (may be async)
    if (this.includeCanvas) {
      deviceInfo.canvas = await this._generateCanvasFingerprint();
    }

    if (this.includeAudio) {
      deviceInfo.audio = await this._generateAudioFingerprint();
    }

    if (this.includeFonts) {
      deviceInfo.fonts = await this._detectFonts();
    }

    if (this.includeWebGL) {
      deviceInfo.webgl = this._collectWebGLInfo();
    }

    return deviceInfo;
  }

  /**
   * Collect basic environment information
   */
  _collectBasicInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages || [navigator.language],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'unspecified',
    };
  }

  /**
   * Collect screen information
   */
  _collectScreenInfo() {
    const screen = window.screen;
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation ? screen.orientation.type : 'unknown',
    };
  }

  /**
   * Collect hardware information
   */
  _collectHardwareInfo() {
    return {
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navigator.deviceMemory || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };
  }

  /**
   * Collect browser-specific information
   */
  _collectBrowserInfo() {
    const plugins = [];
    if (navigator.plugins) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        const plugin = navigator.plugins[i];
        plugins.push({
          name: plugin.name,
          description: plugin.description,
          filename: plugin.filename,
        });
      }
    }

    return {
      plugins: plugins,
      mimeTypes: this._collectMimeTypes(),
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
    };
  }

  /**
   * Collect MIME types
   */
  _collectMimeTypes() {
    const mimeTypes = [];
    if (navigator.mimeTypes) {
      for (let i = 0; i < navigator.mimeTypes.length; i++) {
        const mimeType = navigator.mimeTypes[i];
        mimeTypes.push({
          type: mimeType.type,
          description: mimeType.description,
          suffixes: mimeType.suffixes,
        });
      }
    }
    return mimeTypes;
  }

  /**
   * Collect network information
   */
  _collectNetworkInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 'unknown',
        rtt: connection.rtt || 'unknown',
        saveData: connection.saveData || false,
      };
    }
    return { effectiveType: 'unknown' };
  }

  /**
   * Generate Canvas fingerprint
   */
  async _generateCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return { hash: 'unavailable', error: 'Canvas context not available' };
      }

      // Set canvas size
      canvas.width = 280;
      canvas.height = 60;

      // Draw text with various styles
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('IKY 🔍', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device Fingerprint', 4, 35);

      // Draw some shapes
      ctx.beginPath();
      ctx.arc(50, 50, 20, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      // Get canvas data
      const canvasData = canvas.toDataURL();
      const hash = await this._hashString(canvasData);

      return {
        hash: hash,
        width: canvas.width,
        height: canvas.height,
      };
    } catch (error) {
      console.warn('Canvas fingerprint error:', error);
      return { hash: 'error', error: error.message };
    }
  }

  /**
   * Generate Audio fingerprint
   */
  async _generateAudioFingerprint() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        return { hash: 'unavailable', error: 'AudioContext not available' };
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      // Mute the output
      gainNode.gain.value = 0;

      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(0);

      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = async (event) => {
          const output = event.outputBuffer.getChannelData(0);
          const fingerprint = Array.from(output.slice(0, 100)).join(',');
          
          oscillator.stop();
          scriptProcessor.disconnect();
          gainNode.disconnect();
          analyser.disconnect();
          oscillator.disconnect();
          
          if (context.close) {
            context.close();
          }

          const hash = await this._hashString(fingerprint);
          resolve({ hash: hash, sampleSize: 100 });
        };

        // Timeout after 1 second
        setTimeout(() => {
          oscillator.stop();
          if (context.close) {
            context.close();
          }
          resolve({ hash: 'timeout', error: 'Audio fingerprint timeout' });
        }, 1000);
      });
    } catch (error) {
      console.warn('Audio fingerprint error:', error);
      return { hash: 'error', error: error.message };
    }
  }

  /**
   * Detect installed fonts
   */
  async _detectFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
      'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
      'Impact', 'Lucida Console', 'Tahoma', 'Helvetica', 'Geneva',
      'MS Sans Serif', 'MS Serif', 'Courier', 'Monaco', 'Consolas',
    ];

    const detectedFonts = [];

    try {
      const testString = 'mmmmmmmmmmlli';
      const testSize = '72px';
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return { fonts: [], error: 'Canvas not available' };
      }

      // Measure baselines
      const baselines = {};
      for (const baseFont of baseFonts) {
        ctx.font = `${testSize} ${baseFont}`;
        baselines[baseFont] = ctx.measureText(testString).width;
      }

      // Test each font
      for (const testFont of testFonts) {
        let detected = false;
        for (const baseFont of baseFonts) {
          ctx.font = `${testSize} '${testFont}', ${baseFont}`;
          const width = ctx.measureText(testString).width;
          if (width !== baselines[baseFont]) {
            detected = true;
            break;
          }
        }
        if (detected) {
          detectedFonts.push(testFont);
        }
      }

      return { fonts: detectedFonts, count: detectedFonts.length };
    } catch (error) {
      console.warn('Font detection error:', error);
      return { fonts: [], error: error.message };
    }
  }

  /**
   * Collect WebGL information
   */
  _collectWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) {
        return { vendor: 'unavailable', renderer: 'unavailable' };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      return {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        extensions: gl.getSupportedExtensions() || [],
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      };
    } catch (error) {
      console.warn('WebGL info error:', error);
      return { vendor: 'error', renderer: 'error', error: error.message };
    }
  }

  /**
   * Hash a string using SubtleCrypto or fallback
   */
  async _hashString(str) {
    try {
      if (crypto.subtle && crypto.subtle.digest) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (error) {
      console.warn('SubtleCrypto not available, using fallback hash');
    }

    // Fallback to simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get a compact fingerprint (hashed version of full fingerprint)
   */
  async collectCompact() {
    const fullFingerprint = await this.collect();
    const fingerprintString = JSON.stringify(fullFingerprint);
    const hash = await this._hashString(fingerprintString);
    
    return {
      hash: hash,
      timestamp: fullFingerprint.collectedAt,
      userAgent: fullFingerprint.userAgent,
      platform: fullFingerprint.platform,
    };
  }
}

export default DeviceFingerprint;
