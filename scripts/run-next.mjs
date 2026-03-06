#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { config as loadEnvFile } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const nextBin = path.join(workspaceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const mode = process.argv[2] ?? 'dev';
const nextCommand = mode === 'start' ? 'start' : 'dev';
const nextRuntimeArgs = mode === 'start' ? [] : ['--webpack'];

const envFileCandidates =
  nextCommand === 'dev'
    ? [
        '.env.development.local',
        '.env.development',
        '.env.local',
        '.env',
      ]
    : [
        '.env.production.local',
        '.env.production',
        '.env.local',
        '.env',
      ];

for (const relativePath of envFileCandidates) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (existsSync(absolutePath)) {
    loadEnvFile({ path: absolutePath, override: false });
  }
}

const port = process.env.PORT || '3000';

const ensureProtocol = (value) => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const host = value.trim().toLowerCase();
  const isLocalHost =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]');

  return `${isLocalHost ? 'http' : 'https'}://${value}`;
};

const domain = process.env.DOMAIN?.trim();
if (domain) {
  const canonicalUrl = ensureProtocol(domain).replace(/\/+$/, '');
  process.env.AUTH_URL = process.env.AUTH_URL || canonicalUrl;
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || canonicalUrl;
}

process.env.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST || 'true';

const child = spawn(
  process.execPath,
  [nextBin, nextCommand, ...nextRuntimeArgs, '-p', port],
  {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      INIT_CWD: workspaceRoot,
      PWD: workspaceRoot,
      npm_config_local_prefix: workspaceRoot,
    },
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 0;
});
