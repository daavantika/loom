// One-off local convenience: creates an ADMIN user directly in the admin DB,
// since there is no public admin-registration endpoint (admins are
// provisioned out of band, never self-registered). On hosts with no Shell
// access (e.g. Render's free tier), use SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD
// instead — see main.ts's seedAdminIfConfigured().
// Usage: ts-node scripts/seed-admin.ts <email> <password>
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AdminDataSource } from '../src/admin-db/data-source';
import { upsertAdmin } from '../src/admin-db/seed-admin.util';

dotenv.config();

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: ts-node scripts/seed-admin.ts <email> <password>');
    process.exit(1);
  }

  await AdminDataSource.initialize();
  await upsertAdmin(AdminDataSource, email, password);
  console.log(`Admin user ready: ${email}`);
  await AdminDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
