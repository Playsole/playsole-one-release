/**
 * Clean an IP address by stripping IPv4-mapped IPv6 prefixes (::ffff:)
 * and normalizing localhost notations.
 */
export function cleanIp(ip?: string | null): string {
  if (!ip) return '';
  let cleaned = String(ip).trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned === '::1') {
    return '127.0.0.1';
  }
  return cleaned;
}

/**
 * Extract the real client IP from incoming request headers (e.g. Cloudflare, reverse proxy)
 * or fallback to direct socket IP.
 */
export function getClientIp(req: { headers: Record<string, any>; ip?: string }): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cleanIp(cfIp.trim());

  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) return cleanIp(xRealIp.trim());

  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    const first = xForwardedFor.split(',')[0].trim();
    if (first) return cleanIp(first);
  }

  return cleanIp(req.ip || '127.0.0.1');
}

/**
 * Format a raw User-Agent string into a clean, human-readable browser and operating system.
 * Example: "Firefox on Windows 10/11", "Chrome on Android", "Safari on macOS"
 */
export function formatUserAgent(ua?: string | null): string {
  if (!ua || typeof ua !== 'string') return 'Browser Session';
  const raw = ua.trim();
  if (!raw) return 'Browser Session';

  // OS detection
  let os = '';
  if (/Windows NT 10\.0/i.test(raw)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/i.test(raw)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/i.test(raw)) os = 'Windows 7';
  else if (/Windows NT/i.test(raw)) os = 'Windows';
  else if (/iPhone/i.test(raw)) os = 'iPhone';
  else if (/iPad/i.test(raw)) os = 'iPad';
  else if (/Macintosh|Mac OS X/i.test(raw)) os = 'macOS';
  else if (/Android/i.test(raw)) os = 'Android';
  else if (/Linux/i.test(raw)) os = 'Linux';
  else if (/CrOS/i.test(raw)) os = 'Chrome OS';

  // Browser detection
  let browser = '';
  if (/Edg\//i.test(raw)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(raw)) browser = 'Opera';
  else if (/Chrome\//i.test(raw) && !/Chromium\//i.test(raw)) browser = 'Chrome';
  else if (/Firefox\//i.test(raw)) browser = 'Firefox';
  else if (/Safari\//i.test(raw) && !/Chrome\//i.test(raw)) browser = 'Safari';
  else if (/MSIE|Trident\//i.test(raw)) browser = 'Internet Explorer';
  else browser = 'Web Browser';

  if (browser && os) {
    return `${browser} on ${os}`;
  }
  return browser || os || 'Web Browser';
}

/**
 * Format a device hardware label for Recognized Devices.
 * Example: "Windows PC (Firefox)", "Mac (Safari)", "Android Device (Chrome)", "iPhone (Safari)"
 */
export function formatDeviceLabel(ua?: string | null): string {
  if (!ua || typeof ua !== 'string') return 'Recognized Device';
  const raw = ua.trim();
  if (!raw) return 'Recognized Device';

  let device = 'Computer';
  if (/iPhone/i.test(raw)) device = 'iPhone';
  else if (/iPad/i.test(raw)) device = 'iPad';
  else if (/Android/i.test(raw)) device = 'Android Device';
  else if (/Windows/i.test(raw)) device = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(raw)) device = 'Mac';
  else if (/CrOS/i.test(raw)) device = 'Chromebook';
  else if (/Linux/i.test(raw)) device = 'Linux PC';

  let browser = '';
  if (/Edg\//i.test(raw)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(raw)) browser = 'Opera';
  else if (/Chrome\//i.test(raw) && !/Chromium\//i.test(raw)) browser = 'Chrome';
  else if (/Firefox\//i.test(raw)) browser = 'Firefox';
  else if (/Safari\//i.test(raw) && !/Chrome\//i.test(raw)) browser = 'Safari';

  if (browser) {
    return `${device} (${browser})`;
  }
  return device;
}
