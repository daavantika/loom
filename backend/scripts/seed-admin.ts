// One-off local convenience: creates an ADMIN user directly in the admin DB,
// since there is no public admin-registration endpoint (admins are
// provisioned out of band, never self-registered).
// Usage: ts-node scripts/seed-admin.ts <email> <password>
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { AdminDataSource } from '../src/admin-db/data-source';

dotenv.config();

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: ts-node scripts/seed-admin.ts <email> <password>');
    process.exit(1);
  }

  await AdminDataSource.initialize();
  const passwordHash = await bcrypt.hash(password, 12);
  await AdminDataSource.query(
    `INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, passwordHash],
  );
  console.log(`Admin user ready: ${email}`);
  await AdminDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
