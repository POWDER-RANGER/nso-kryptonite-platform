/**
 * API Server Bootstrap
 * Hono + tRPC + WebSocket server
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { trpcServer } from '@trpc/server/adapters/fetch';
import { appRouter } from './router';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

// tRPC API
app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (opts) => ({
      req: opts.req,
      env: opts.env,
    }),
  })
);

// REST API fallback
app.get('/api/v1/exercises', async (c) => {
  return c.json({ message: 'Exercises endpoint — use tRPC for full functionality' });
});

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`🚀 NSO Kryptonite API starting on port ${port}...`);

// Bun/Node compatible server start
if (typeof Bun !== 'undefined') {
  Bun.serve({
    fetch: app.fetch,
    port,
    websocket: {
      message(ws, message) {
        // WebSocket message handling for real-time streams
        ws.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() }));
      },
      open(ws) {
        console.log('🔌 WebSocket client connected');
      },
      close(ws) {
        console.log('🔌 WebSocket client disconnected');
      },
    },
  });
} else {
  // Node.js fallback
  const { createServer } = await import('http');
  createServer(async (req, res) => {
    const response = await app.fetch(req as unknown as Request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  }).listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

console.log(`✅ NSO Kryptonite API ready`);
console.log(`   tRPC endpoint: http://localhost:${port}/api/trpc`);
console.log(`   Health:        http://localhost:${port}/health`);
