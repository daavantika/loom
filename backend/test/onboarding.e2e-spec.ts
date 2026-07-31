import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';

/**
 * Walks the Phase 1 acceptance criteria end to end against two real Postgres
 * instances (the embedded PGlite servers started via `npm run db:test:user`
 * and `npm run db:test:admin`, listening on 127.0.0.1:5545/5547 — see
 * scripts/dev-db.ts). Requires migrations to have been applied to both first
 * (`npm run migration:run`, with USER_DATABASE_URL/ADMIN_DATABASE_URL pointed
 * at the test DBs via .env.test).
 */
describe('Cook onboarding & verification (e2e)', () => {
  let app: INestApplication;
  let userDataSource: DataSource;
  let adminDataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    userDataSource = app.get(getDataSourceToken('userDb'));
    adminDataSource = app.get(getDataSourceToken('adminDb'));

    await adminDataSource.query(`DELETE FROM moderation_cases; DELETE FROM verification_records; DELETE FROM admin_users;`);
    await userDataSource.query(`DELETE FROM kitchen_photos; DELETE FROM cook_profiles; DELETE FROM users;`);

    const adminEmail = `admin+${Date.now()}@loom.test`;
    const passwordHash = await bcrypt.hash('admin-password', 12);
    await adminDataSource.query(`INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`, [
      adminEmail,
      passwordHash,
    ]);
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'admin-password' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const cookEmail = `cook+${Date.now()}@loom.test`;
  let cookToken: string;
  let cookProfileId: string;

  it('registers a cook and logs in', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: cookEmail, password: 'cook-password', role: 'COOK' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: cookEmail, password: 'cook-password' })
      .expect(201);

    cookToken = login.body.accessToken;
    expect(cookToken).toBeDefined();
  });

  it('rejects submission with a missing required field (400) and creates no verification record', async () => {
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ kitchenName: 'Meera Kitchen', ownerName: 'Meera' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ payoutMethod: 'UPI', payoutDetails: 'meera@upi' })
      .expect(400);
  });

  it('submits onboarding and reaches PENDING_VERIFICATION once all fields are present', async () => {
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({
        kitchenName: 'Meera Kitchen',
        ownerName: 'Meera',
        area: 'RS Puram, Coimbatore',
        deliveryRadiusKm: 5,
        photoUrls: ['https://example.com/kitchen1.jpg'],
      })
      .expect(201);

    const submit = await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ payoutMethod: 'UPI', payoutDetails: 'meera@upi' })
      .expect(201);

    expect(submit.body.profile.status).toBe('PENDING_VERIFICATION');
    cookProfileId = submit.body.profile.id;
  });

  it('rejects a second submission while one is already in review (409)', async () => {
    await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ payoutMethod: 'UPI', payoutDetails: 'meera@upi' })
      .expect(409);
  });

  it('forbids a non-admin from approving a verification case (403)', async () => {
    const list = await request(app.getHttpServer())
      .get('/admin/moderation/verifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const openCase = list.body.find((c: any) => true);

    await request(app.getHttpServer())
      .post(`/admin/moderation/verifications/${openCase.id}/approve`)
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(403);
  });

  it('lets an admin approve the verification, promoting the cook to VERIFIED with a visible badge', async () => {
    const list = await request(app.getHttpServer())
      .get('/admin/moderation/verifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const openCase = list.body[0];

    await request(app.getHttpServer())
      .post(`/admin/moderation/verifications/${openCase.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const publicProfile = await request(app.getHttpServer())
      .get(`/cooks/${cookProfileId}`)
      .expect(200);

    expect(publicProfile.body.verified).toBe(true);

    // Proves the cached-status write was removed, not relocated: the user-DB
    // cook_profiles row never becomes VERIFIED — "verified" only exists as a
    // computed merge of this row with the admin-DB verification_records row.
    const [row] = await userDataSource.query('SELECT status FROM cook_profiles WHERE id = $1', [cookProfileId]);
    expect(row.status).toBe('PENDING_VERIFICATION');
  });
});
