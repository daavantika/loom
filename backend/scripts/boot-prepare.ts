// Consolidated boot-time preparation for hosts with no Shell/preDeployCommand
// access (Render's free tier): runs both databases' migrations and, if
// SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD are set, seeds/updates the admin
// account — all in one ts-node process. main.ts previously shelled out to
// three separate npm scripts (migration:run:user, migration:run:admin,
// seed:admin), each paying its own ts-node cold-start cost; on Render
// free tier's throttled CPU that made cold starts take 2+ minutes. One
// process instead of three cuts that down substantially.
// Usage: ts-node scripts/boot-prepare.ts
import 'reflect-metadata';
import { UserDataSource } from '../src/user-db/data-source';
import { AdminDataSource } from '../src/admin-db/data-source';
import { upsertAdmin } from '../src/admin-db/seed-admin.util';

async function main() {
  await UserDataSource.initialize();
  await UserDataSource.runMigrations();
  await UserDataSource.destroy();

  await AdminDataSource.initialize();
  await AdminDataSource.runMigrations();

  const email = process.env.SEED_ADMIN_EMAIL || undefined;
  const password = process.env.SEED_ADMIN_PASSWORD || undefined;
  if (email && password) {
    await upsertAdmin(AdminDataSource, email, password);
    console.log(`Admin user ready: ${email}`);
  }

  await AdminDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
