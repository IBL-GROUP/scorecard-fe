import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Connect, Plugin } from 'vite';

const BASE = '/scorecard-dashboard/';

/** /scorecard-dashboard (no trailing slash) → /scorecard-dashboard/, keeping the query, as nginx.conf does in production. */
function baseSlashRedirect(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? '';
    const q = url.indexOf('?');
    if ((q < 0 ? url : url.slice(0, q)) === BASE.slice(0, -1)) {
      res.statusCode = 301;
      res.setHeader('Location', BASE + (q < 0 ? '' : url.slice(q)));
      res.end();
      return;
    }
    next();
  };
  return {
    name: 'base-slash-redirect',
    configureServer: (server) => void server.middlewares.use(redirect),
    configurePreviewServer: (server) => void server.middlewares.use(redirect),
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [baseSlashRedirect(), react()],
  server: {
    port: 5175,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
