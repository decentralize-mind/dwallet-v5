/**
 * 🖥️ Device Information Collector (Frontend)
 * 
 * Collects device fingerprint and system information
 * for alternative authentication methods
 */

/**
 * Generate unique device fingerprint
 * Combines multiple browser/system characteristics
 */
export function generateDeviceFingerprint() {
  const components = [
    // Browser info
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    
    // Screen info
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    window.devicePixelRatio,
    
    // System info
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 1, // CPU cores
    navigator.deviceMemory || 1, // RAM (GB)
    
    // Canvas fingerprint
    getCanvasFingerprint(),
    
    // Audio fingerprint
    getAudioFingerprint(),
  ];

  // Create hash
  const fingerprint = components.join('|');
  return simpleHash(fingerprint);
}

/**
 * Get canvas fingerprint
 */
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const text = 'Device Fingerprint 🔐';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText(text, 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText(text, 4, 17);
    
    return canvas.toDataURL();
  } catch (error) {
    return 'canvas_unavailable';
  }
}

/**
 * Get audio fingerprint
 */
function getAudioFingerprint() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gain = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    
    gain.gain.value = 0;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.start(0);
    
    // Get frequency data
    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);
    
    oscillator.stop();
    
    return data.slice(0, 10).join(',');
  } catch (error) {
    return 'audio_unavailable';
  }
}

/**
 * Simple hash function
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Get device information
 */
export function getDeviceInfo() {
  return {
    // Browser
    userAgent: navigator.userAgent,
    browser: getBrowserName(),
    browserVersion: getBrowserVersion(),
    
    // OS
    platform: navigator.platform,
    os: getOSName(),
    
    // Screen
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    
    // Hardware
    cpuCores: navigator.hardwareConcurrency || 'unknown',
    memory: navigator.deviceMemory || 'unknown',
    
    // Network
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Touch support
    touchSupport: 'ontouchstart' in window,
    
    // Cookies enabled
    cookiesEnabled: navigator.cookieEnabled,
    
    // Do Not Track
    doNotTrack: navigator.doNotTrack,
  };
}

/**
 * Get browser name
 */
function getBrowserName() {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('SamsungBrowser/')) return 'Samsung Internet';
  if (userAgent.includes('Opera') || userAgent.includes('OPR/')) return 'Opera';
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/')) return 'Safari';
  
  return 'Unknown';
}

/**
 * Get browser version
 */
function getBrowserVersion() {
  const userAgent = navigator.userAgent;
  const match = userAgent.match(/(Firefox|Chrome|Safari|Edge|Opera|OPR|SamsungBrowser)[\/\s]([\d.]+)/);
  return match ? match[2] : 'unknown';
}

/**
 * Get OS name
 */
function getOSName() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  
  return platform || 'Unknown';
}

/**
 * Request MAC address from backend
 * This requires a backend endpoint to collect the MAC
 */
export async function requestMACAddress() {
  try {
    const response = await fetch('/api/device/get-mac', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.macAddress;
    }
  } catch (error) {
    console.warn('Failed to get MAC address:', error.message);
  }
  
  return null;
}

/**
 * Register current device
 */
export async function registerDevice(deviceName) {
  try {
    const fingerprint = generateDeviceFingerprint();
    const deviceInfo = getDeviceInfo();
    
    const response = await fetch('/api/device/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        deviceName,
        fingerprint,
        deviceInfo,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store device ID locally
      localStorage.setItem('device_id', data.device.id);
      localStorage.setItem('device_fingerprint', fingerprint);
      
      return data;
    } else {
      throw new Error(data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Device registration error:', error);
    throw error;
  }
}

/**
 * Verify if current device is registered
 */
export async function verifyDevice() {
  try {
    const fingerprint = localStorage.getItem('device_fingerprint') || generateDeviceFingerprint();
    const deviceId = localStorage.getItem('device_id');
    
    const response = await fetch('/api/device/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        deviceId,
        fingerprint,
      }),
    });
    
    const data = await response.json();
    return data.verified || false;
  } catch (error) {
    console.error('Device verification error:', error);
    return false;
  }
}

/**
 * Get all registered devices
 */
export async function getRegisteredDevices() {
  try {
    const response = await fetch('/api/device/list', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.devices || [];
    }
  } catch (error) {
    console.error('Failed to get devices:', error);
    return [];
  }
  
  return [];
}

/**
 * Remove device registration
 */
export async function removeDevice(deviceId) {
  try {
    const response = await fetch(`/api/device/remove/${deviceId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to remove device:', error);
    return false;
  }
}

/**
 * Display device info in console (for debugging)
 */
export function displayDeviceInfo() {
  const info = getDeviceInfo();
  const fingerprint = generateDeviceFingerprint();
  
  console.log('🖥️ Device Information:');
  console.log('═'.repeat(60));
  console.log(`Browser: ${info.browser} ${info.browserVersion}`);
  console.log(`OS: ${info.os}`);
  console.log(`Platform: ${info.platform}`);
  console.log(`Screen: ${info.screenResolution}`);
  console.log(`CPU Cores: ${info.cpuCores}`);
  console.log(`Memory: ${info.memory} GB`);
  console.log(`Language: ${info.language}`);
  console.log(`Timezone: ${info.timezone}`);
  console.log('');
  console.log(`Device Fingerprint: ${fingerprint}`);
  console.log('═'.repeat(60));
  
  return { info, fingerprint };
}
