import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

const processEnv = {
  CANISTER_ID_BACKEND: process.env.CANISTER_ID_BACKEND ?? '',
  STORAGE_GATEWAY_URL: process.env.STORAGE_GATEWAY_URL ?? '',
  II_URL: process.env.II_URL ?? '',
};

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
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
