import { TlsOptions } from 'tls';

type DatabaseSslEnv = {
  [key: string]: string | boolean | number | undefined;
  NODE_ENV?: string | boolean | number;
  DB_SSL?: string | boolean | number;
  DB_SSL_REJECT_UNAUTHORIZED?: string | boolean | number;
};

export function parseBooleanEnv(
  value: string | boolean | number | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }

  return defaultValue;
}

export function buildDatabaseSslOptions(env: DatabaseSslEnv = process.env): false | TlsOptions {
  const sslEnabled = parseBooleanEnv(env.DB_SSL, env.NODE_ENV === 'production');

  if (!sslEnabled) {
    return false;
  }

  return {
    rejectUnauthorized: parseBooleanEnv(env.DB_SSL_REJECT_UNAUTHORIZED, false),
  };
}
