const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'secret',
  'stripesecret',
  'authorization',
  'cookie',
]);

const REDACTED_VALUE = '[REDACTED]';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const shouldRedactKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  if (SENSITIVE_KEYS.has(normalized)) {
    return true;
  }
  return normalized.includes('password') || normalized.includes('token') || normalized.includes('secret');
};

export const sanitizeAuditPayload = (payload: unknown): unknown => {
  if (payload === null || payload === undefined) {
    return payload ?? null;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeAuditPayload(item));
  }

  if (isPlainObject(payload)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      sanitized[key] = shouldRedactKey(key) ? REDACTED_VALUE : sanitizeAuditPayload(value);
    }
    return sanitized;
  }

  return payload;
};
