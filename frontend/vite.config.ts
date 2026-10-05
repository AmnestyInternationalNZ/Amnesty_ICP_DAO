import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const processEnv = {
  CANISTER_ID_BACKEND: process.env.CANISTER_ID_BACKEND ?? '',
  STORAGE_GATEWAY_URL: process.env.STORAGE_GATEWAY_URL ?? '',
  II_URL: process.env.II_URL ?? '',
};

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react(), {
    name: 'local-rehearsal-personas',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__rehearsal-personas', (req, res) => {
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')) {
          res.statusCode = 403; res.end(); return;
        }
        try {
          const env = JSON.parse(readFileSync(path.resolve(__dirname, 'public/env.json'), 'utf8'));
          const host = env.backend_host || env.BACKEND_HOST || env.backendHost;
          if (!host || !['127.0.0.1', 'localhost'].includes(new URL(host).hostname)) throw new Error('Local only');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(readFileSync(path.resolve(__dirname, '../.local-rehearsal/personas.json')));
        } catch { res.statusCode = 404; res.end(); }
      });
    }
  }],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  define: {
    'process.env': JSON.stringify(processEnv),
  },
});
