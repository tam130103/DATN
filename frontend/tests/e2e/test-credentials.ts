import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../..');
const backendEnvPath = path.join(repoRoot, 'backend', '.env');

const readBackendEnv = (): Record<string, string> => {
  if (!fs.existsSync(backendEnvPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(backendEnvPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
};

const backendEnv = readBackendEnv();

export const getAdminCredentials = () => {
  const email = process.env.FB_BOT_EMAIL || backendEnv.FB_BOT_EMAIL;
  const password = process.env.FB_BOT_PASSWORD || backendEnv.FB_BOT_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing FB_BOT_EMAIL or FB_BOT_PASSWORD for admin smoke tests.');
  }

  return { email, password };
};
