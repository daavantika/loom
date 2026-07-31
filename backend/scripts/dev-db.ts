// Sandbox-only convenience: serves an embedded PGlite instance over the real
// Postgres wire protocol so the app (and TypeORM) can connect to it exactly
// like a normal PostgreSQL server, without needing Docker or a local Postgres
// install. Production and any real deployment target standard PostgreSQL via
// USER_DATABASE_URL/ADMIN_DATABASE_URL — this script is not part of that path.
//
// Two logical databases (user, admin) each get their own PGlite instance —
// PGlite has no multi-database support, and separate instances match the
// two-connection production topology exactly.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import * as path from 'path';

const PORTS: Record<'user' | 'admin', { dev: number; test: number }> = {
  user: { dev: 5544, test: 5545 },
  admin: { dev: 5546, test: 5547 },
};

async function main() {
  const isTest = process.argv.includes('--test');
  const nameArg = process.argv.find((arg) => arg.startsWith('--name='));
  const name = (nameArg?.split('=')[1] ?? 'user') as 'user' | 'admin';
  if (name !== 'user' && name !== 'admin') {
    console.error(`[dev-db] --name must be "user" or "admin", got "${name}"`);
    process.exit(1);
  }

  const dataDir = path.join(__dirname, '..', `.pgdata-${isTest ? 'test' : 'dev'}-${name}`);
  const port = isTest ? PORTS[name].test : PORTS[name].dev;

  const db = await PGlite.create(dataDir);
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
  await server.start();

  console.log(`[dev-db] ${name} DB — PGlite serving Postgres wire protocol on 127.0.0.1:${port} (data: ${dataDir})`);

  const shutdown = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev-db] failed to start', err);
  process.exit(1);
});
