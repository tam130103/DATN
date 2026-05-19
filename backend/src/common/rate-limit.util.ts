const decodeJwtSubject = (token: string): string | null => {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { sub?: unknown };
    return typeof parsed.sub === 'string' && parsed.sub ? parsed.sub : null;
  } catch {
    return null;
  }
};

export const getRateLimitTracker = (req: Record<string, any>): string => {
  const authHeader = req.headers?.authorization;
  const bearer = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  const subject = bearer ? decodeJwtSubject(bearer) : null;

  if (subject) {
    return `user:${subject}`;
  }

  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
};
