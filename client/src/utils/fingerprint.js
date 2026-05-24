/**
 * Custom modern device fingerprinting helper
 * Gathers details about the user's browser, environment, and screen, and generates a stable SHA-256 hash.
 */

async function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    // Draw text with multiple fonts, alignments, and sizes
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("RazzHex, <canvas> 1.0", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("RazzHex, <canvas> 1.0", 4, 17);
    
    // Basic rendering operations
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.stroke();
    
    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-err';
  }
}

function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'webgl-no-renderer';
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return `${vendor}~${renderer}`;
  } catch (e) {
    return 'webgl-err';
  }
}

export async function getFingerprint() {
  try {
    const canvasHash = await getCanvasFingerprint();
    const webglHash = getWebGLInfo();
    
    const data = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvasHash,
      webgl: webglHash,
    };
    
    const jsonStr = JSON.stringify(data);
    
    // Hash with SubtleCrypto SHA-256
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(jsonStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (err) {
    console.error('Device fingerprinting failed. Generating fallback...', err);
    // Fallback: Generate a random ID and store in localStorage
    let fallbackId = localStorage.getItem('razz_hex_fallback_fp');
    if (!fallbackId) {
      fallbackId = 'fp_fallback_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('razz_hex_fallback_fp', fallbackId);
    }
    return fallbackId;
  }
}
