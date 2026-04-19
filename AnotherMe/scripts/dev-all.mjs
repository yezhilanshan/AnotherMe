import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const rootDir = process.cwd();
const engineDir = path.join(rootDir, 'anotherme2_engine');
const comspec = process.env.ComSpec || 'cmd.exe';
const uvCmd = process.env.ANOTHERME2_UV_CMD || 'uv';
const pythonCmd = process.env.ANOTHERME2_PYTHON_CMD || 'python';
const requirementsPath = path.join(engineDir, 'requirements.txt');
const nextDevLockPath = path.join(rootDir, '.next', 'dev', 'lock');

const children = new Map();
let shuttingDown = false;
const serviceBuffers = new Map();
const ignoredExitServices = new Set();

function parseGatewayBaseUrl() {
  const envValue = process.env.ANOTHERME2_GATEWAY_BASE_URL?.trim();
  if (envValue) {
    return new URL(envValue);
  }

  const envFile = path.join(rootDir, '.env.local');
  if (fs.existsSync(envFile)) {
    const line = fs
      .readFileSync(envFile, 'utf8')
      .split(/\r?\n/)
      .find(item => item.startsWith('ANOTHERME2_GATEWAY_BASE_URL='));
    if (line) {
      const raw = line.split('=', 2)[1]?.trim().replace(/^['"]|['"]$/g, '');
      if (raw) {
        return new URL(raw);
      }
    }
  }

  return new URL('http://127.0.0.1:8080');
}

function isPortAvailable(port, host) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickGatewayUrl() {
  const parsed = parseGatewayBaseUrl();
  const hostname = parsed.hostname || '127.0.0.1';
  const protocol = parsed.protocol || 'http:';
  const pathname = parsed.pathname || '';
  const basePort = parsed.port ? Number(parsed.port) : 8080;

  for (let candidate = basePort; candidate < basePort + 20; candidate += 1) {
    // Probe on 0.0.0.0 semantics by checking all interfaces.
    const canBindAny = await isPortAvailable(candidate, '0.0.0.0');
    if (!canBindAny) continue;
    return `${protocol}//${hostname}:${candidate}${pathname}`.replace(/\/$/, '');
  }

  throw new Error(`No available port found for AnotherMe2 gateway starting from ${basePort}`);
}

function prefixOutput(name, chunk, stream = process.stdout) {
  const text = String(chunk);
  const prev = serviceBuffers.get(name) || '';
  serviceBuffers.set(name, `${prev}${text}`.slice(-12000));
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    stream.write(`[${name}] ${line}\n`);
  }
}

function shouldIgnoreServiceExit(serviceName, code) {
  if (serviceName !== 'anotherme' || code === 0) {
    return false;
  }
  const output = serviceBuffers.get(serviceName) || '';
  return (
    output.includes('Unable to acquire lock') &&
    output.includes('.next\\dev\\lock')
  );
}

function killChild(child, signal) {
  try {
    if (!child.killed) {
      child.kill(signal);
    }
  } catch {}
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) {
    killChild(child, 'SIGTERM');
  }
  setTimeout(() => {
    for (const child of children.values()) {
      killChild(child, 'SIGKILL');
    }
    process.exit(exitCode);
  }, 1000).unref();
}

function spawnService(service) {
  if (service.runner === 'pnpm') {
    if (isWindows) {
      return spawn(comspec, ['/d', '/s', '/c', service.command], {
        cwd: service.cwd,
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
        windowsHide: false,
      });
    }
    return spawn('pnpm', ['dev'], {
      cwd: service.cwd,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });
  }

  return spawn(uvCmd, service.args, {
    cwd: service.cwd,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
  });
}

async function main() {
  const gatewayUrl = await pickGatewayUrl();
  const gatewayPort = new URL(gatewayUrl).port || '8080';

  process.stdout.write(`[dev-all] AnotherMe2 gateway URL: ${gatewayUrl}\n`);

  const sharedEnv = {
    ...process.env,
    ANOTHERME2_GATEWAY_BASE_URL: gatewayUrl,
    GATEWAY_PORT: gatewayPort,
  };

  const services = [
    {
      name: 'anotherme2-gateway',
      cwd: engineDir,
      runner: 'uv',
      args: [
        'run',
        '--with-requirements',
        requirementsPath,
        '--directory',
        engineDir,
        pythonCmd,
        'run_gateway.py',
      ],
      env: sharedEnv,
    },
    {
      name: 'anotherme2-worker',
      cwd: engineDir,
      runner: 'uv',
      args: [
        'run',
        '--with-requirements',
        requirementsPath,
        '--directory',
        engineDir,
        pythonCmd,
        'run_gateway_worker.py',
      ],
      env: sharedEnv,
    },
  ];

  if (fs.existsSync(nextDevLockPath)) {
    process.stdout.write('[dev-all] Detected existing Next dev lock, reusing the running AnotherMe dev server.\n');
    ignoredExitServices.add('anotherme');
  } else {
    services.unshift({
      name: 'anotherme',
      cwd: rootDir,
      runner: 'pnpm',
      command: 'pnpm dev',
      env: sharedEnv,
    });
  }

  for (const service of services) {
    const child = service.runner === 'pnpm'
      ? (isWindows
          ? spawn(comspec, ['/d', '/s', '/c', service.command], {
              cwd: service.cwd,
              env: service.env,
              stdio: ['inherit', 'pipe', 'pipe'],
              windowsHide: false,
            })
          : spawn('pnpm', ['dev'], {
              cwd: service.cwd,
              env: service.env,
              stdio: ['inherit', 'pipe', 'pipe'],
              shell: false,
            }))
      : spawn(uvCmd, service.args, {
          cwd: service.cwd,
          env: service.env,
          stdio: ['inherit', 'pipe', 'pipe'],
          shell: false,
        });

    children.set(service.name, child);
    child.stdout.on('data', chunk => prefixOutput(service.name, chunk));
    child.stderr.on('data', chunk => prefixOutput(service.name, chunk, process.stderr));
    child.on('exit', code => {
      if (shuttingDown) return;
      const normalized = typeof code === 'number' ? code : 1;
      if (ignoredExitServices.has(service.name) || shouldIgnoreServiceExit(service.name, normalized)) {
        process.stdout.write(`[dev-all] Reusing existing ${service.name} instance.\n`);
        return;
      }
      process.stderr.write(`[${service.name}] exited with code ${normalized}\n`);
      shutdown(normalized);
    });
    child.on('error', error => {
      if (shuttingDown) return;
      process.stderr.write(`[${service.name}] failed to start: ${error.message}\n`);
      shutdown(1);
    });
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch(error => {
  process.stderr.write(`[dev-all] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
