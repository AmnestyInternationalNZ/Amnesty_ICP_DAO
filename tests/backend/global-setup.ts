import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

type TestProject = {
  provide: (key: string, value: unknown) => void;
};

const BINARY_START_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 200;

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, durationMs);
  });
}

async function waitForPortFile(
  portFilePath: string,
  serverProcess: ChildProcess,
): Promise<number> {
  const deadline = Date.now() + BINARY_START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`PocketIC exited before reporting a port (exit code ${serverProcess.exitCode})`);
    }

    if (existsSync(portFilePath)) {
      const portText = readFileSync(portFilePath, 'utf8').trim();
      const port = Number.parseInt(portText, 10);
      if (Number.isFinite(port) && port > 0) {
        return port;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`PocketIC did not report a port within ${BINARY_START_TIMEOUT_MS}ms`);
}

export default async function globalSetup(project: TestProject) {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'amnesty-pocketic-'));
  const portFilePath = join(runtimeDir, 'port');
  const pocketIcBinaryPath = resolve(process.cwd(), 'node_modules/@dfinity/pic/pocket-ic');

  const serverProcess = spawn(pocketIcBinaryPath, ['--port-file', portFilePath, '--ttl', '600'], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  serverProcess.stderr?.pipe(process.stderr);

  const port = await waitForPortFile(portFilePath, serverProcess);

  project.provide('PIC_URL', `http://127.0.0.1:${port}`);

  return async () => {
    if (serverProcess.exitCode === null) {
      serverProcess.kill();
      await new Promise<void>((resolvePromise) => {
        serverProcess.once('exit', () => {
          resolvePromise();
        });
      });
    }

    rmSync(runtimeDir, { force: true, recursive: true });
  };
}
