import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

/**
 * Shared by scripts/seed-admin.ts (manual CLI use, local/any host with
 * Shell access) and main.ts's optional SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD
 * boot-time seed (for hosts like Render's free tier with no Shell access to
 * run the CLI script manually). Idempotent — safe to call on every boot.
 */
export async function upsertAdmin(dataSource: DataSource, email: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  await dataSource.query(
    `INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, passwordHash],
  );
}
