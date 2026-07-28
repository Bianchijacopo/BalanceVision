export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

const SKIP_FIELDS = new Set(['password', 'oldPassword', 'newPassword', 'otp', 'refreshToken']);

export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string' && !SKIP_FIELDS.has(key)) {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  next();
}
