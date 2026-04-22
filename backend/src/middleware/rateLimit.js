const stores = new Map();

function getClientKey(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function rateLimit({ windowMs, max, message }) {
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = `${req.baseUrl || ''}:${req.path}:${getClientKey(req)}`;
    const current = stores.get(key);

    if (!current || current.expiresAt <= now) {
      stores.set(key, {
        count: 1,
        expiresAt: now + windowMs
      });
      return next();
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: message || 'Too many requests'
      });
    }

    current.count += 1;
    stores.set(key, current);
    next();
  };
}
