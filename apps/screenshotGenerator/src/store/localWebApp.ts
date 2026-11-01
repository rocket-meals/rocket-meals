// Builds the rocket-meals web app of one tenant from the checked out code and serves it
// on localhost, so the store screenshots show exactly this commit instead of whatever is
// deployed under rocket-meals.de right now. The data still comes from the tenant's
// backend server: EXPO_PUBLIC_CUSTOMER selects the tenant config, and with it the
// server_url, at build time.
import { spawn } from 'node:child_process';
import { existsSync, promises as fs, statSync } from 'node:fs';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
};

export type LocalWebApp = {
  /** e.g. http://127.0.0.1:41234/swosy - same shape as https://rocket-meals.de/swosy */
  url: string;
  close: () => Promise<void>;
};

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} endete mit Code ${code}`))));
  });
}

/** Static export of the web app for one tenant (expo export, output "static"). */
export async function exportWebApp(frontendDir: string, tenant: string): Promise<string> {
  const outDir = path.join(os.tmpdir(), `rocket-meals-store-web-${tenant}`);
  await fs.rm(outDir, { recursive: true, force: true });
  console.log(`   🏗️ Baue die Web-App für ${tenant} (expo export) ...`);
  const env: NodeJS.ProcessEnv = { ...process.env, CUSTOMER: tenant, EXPO_PUBLIC_CUSTOMER: tenant, CI: '1' };
  // A PR preview suffix would move the app away from /<tenant>.
  delete env.EXPO_PUBLIC_BASE_URL_SUFFIX;
  await run('yarn', ['expo', 'export', '--platform', 'web', '--output-dir', outDir], frontendDir, env);
  return outDir;
}

function isFile(candidate: string): boolean {
  return existsSync(candidate) && statSync(candidate).isFile();
}

/**
 * Maps a request path below the base path to a file of the static export: the file
 * itself, the route's .html or index.html, and the app shell for every other route
 * (expo-router takes over in the browser).
 */
export function resolveExportFile(distDir: string, basePath: string, requestPath: string): string {
  const withoutQuery = decodeURIComponent(requestPath.split('?')[0] ?? '/');
  const relative = withoutQuery.startsWith(basePath) ? withoutQuery.slice(basePath.length) : withoutQuery;
  const target = path.resolve(distDir, '.' + path.posix.normalize('/' + relative));
  if (target !== distDir && !target.startsWith(distDir + path.sep)) {
    return path.join(distDir, 'index.html');
  }
  const candidates = [target, `${target}.html`, path.join(target, 'index.html')];
  return candidates.find(isFile) ?? path.join(distDir, 'index.html');
}

export async function serveWebApp(distDir: string, basePath: string): Promise<LocalWebApp> {
  const server = http.createServer((request, response) => {
    const file = resolveExportFile(distDir, basePath, request.url ?? '/');
    fs.readFile(file)
      .then(content => {
        response.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
        response.end(content);
      })
      .catch(() => {
        response.writeHead(404);
        response.end();
      });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}${basePath}`,
    close: () => new Promise(resolve => server.close(() => resolve())),
  };
}
