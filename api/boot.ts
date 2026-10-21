import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app';

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number');
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`NSO Kryptonite API listening on http://localhost:${info.port}`);
  console.log(`tRPC endpoint: http://localhost:${info.port}/api/trpc`);
  console.log(`Health:        http://localhost:${info.port}/health`);
});
