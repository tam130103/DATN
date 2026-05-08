type AllowedOrigin = string | RegExp;

const STATIC_ALLOWED_ORIGINS: AllowedOrigin[] = [
  'https://datn-mu-six.vercel.app',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

const parseConfiguredOrigins = (origins?: string | null): string[] =>
  origins
    ? origins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

const normalizeOrigins = (frontendUrl?: string | null): AllowedOrigin[] => {
  const origins = [...STATIC_ALLOWED_ORIGINS];

  if (frontendUrl) {
    origins.unshift(frontendUrl);
  }

  origins.unshift(...parseConfiguredOrigins(process.env.CORS_ORIGINS));

  return origins;
};

export const isOriginAllowed = (origin?: string | null, frontendUrl?: string | null) => {
  if (!origin) {
    return true;
  }

  return normalizeOrigins(frontendUrl).some((allowedOrigin) =>
    typeof allowedOrigin === 'string'
      ? allowedOrigin === origin
      : allowedOrigin.test(origin),
  );
};

export const createCorsOriginValidator =
  (getFrontendUrl?: () => string | undefined) =>
  (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const frontendUrl = getFrontendUrl?.() ?? process.env.FRONTEND_URL;

    if (isOriginAllowed(origin, frontendUrl)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin ?? 'unknown origin'}`));
  };

export const createSocketCorsOptions = (getFrontendUrl?: () => string | undefined) => ({
  origin: createCorsOriginValidator(getFrontendUrl),
  credentials: true,
});
