import { buildDatabaseSslOptions, parseBooleanEnv } from './database.config';

describe('database config', () => {
  describe('parseBooleanEnv', () => {
    it('parses common true and false values', () => {
      expect(parseBooleanEnv('true', false)).toBe(true);
      expect(parseBooleanEnv('1', false)).toBe(true);
      expect(parseBooleanEnv('yes', false)).toBe(true);
      expect(parseBooleanEnv('false', true)).toBe(false);
      expect(parseBooleanEnv('0', true)).toBe(false);
      expect(parseBooleanEnv('no', true)).toBe(false);
    });

    it('falls back for missing or unknown values', () => {
      expect(parseBooleanEnv(undefined, true)).toBe(true);
      expect(parseBooleanEnv('not-a-boolean', false)).toBe(false);
    });
  });

  describe('buildDatabaseSslOptions', () => {
    it('disables SSL outside production by default', () => {
      expect(buildDatabaseSslOptions({ NODE_ENV: 'development' })).toBe(false);
    });

    it('enables SSL in production without strict certificate verification by default', () => {
      expect(buildDatabaseSslOptions({ NODE_ENV: 'production' })).toEqual({
        rejectUnauthorized: false,
      });
    });

    it('allows strict certificate verification when explicitly enabled', () => {
      expect(
        buildDatabaseSslOptions({
          NODE_ENV: 'production',
          DB_SSL_REJECT_UNAUTHORIZED: 'true',
        }),
      ).toEqual({ rejectUnauthorized: true });
    });

    it('allows SSL to be explicitly disabled', () => {
      expect(
        buildDatabaseSslOptions({
          NODE_ENV: 'production',
          DB_SSL: 'false',
        }),
      ).toBe(false);
    });
  });
});
