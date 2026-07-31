import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';

/**
 * Phase 11: real cook<->customer messaging. Confirms the thread actually
 * reaches both sides (unlike the old fully-mocked ChatModal), unread-count
 * tracking, and cross-cook/cross-customer isolation (same convention as
 * cook-dashboard.e2e-spec.ts).
 */
describe('Messages (e2e)', () => {
  let app: INestApplication;
  let userDataSource: DataSource;
  let adminDataSource: DataSource;
  let adminToken: string;
  let cookToken: string;
  let cookProfileId: string;
  let customerToken: string;
  let customerProfileId: string;
  let otherCookToken: string;
  let otherCustomerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    userDataSource = app.get(getDataSourceToken('userDb'));
    adminDataSource = app.get(getDataSourceToken('adminDb'));

    await adminDataSource.query(`DELETE FROM moderation_cases; DELETE FROM verification_records; DELETE FROM admin_users;`);
    await userDataSource.query(
      `DELETE FROM messages; DELETE FROM order_status_events; DELETE FROM order_items; DELETE FROM orders;
       DELETE FROM customer_favorites; DELETE FROM customer_addresses; DELETE FROM customer_profiles;
       DELETE FROM menu_items; DELETE FROM kitchen_photos; DELETE FROM cook_profiles; DELETE FROM users;`,
    );

    const adminEmail = `admin-messages+${Date.now()}@loom.test`;
    const passwordHash = await bcrypt.hash('admin-password', 12);
    await adminDataSource.query(`INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`, [
      adminEmail,
      passwordHash,
    ]);
    adminToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: adminEmail, password: 'admin-password' })
    ).body.accessToken;

    async function registerVerifiedCook(label: string) {
      const email = `cook-${label}+${Date.now()}@loom.test`;
      await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'password123', role: 'COOK' });
      const token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'password123' })).body.accessToken;
      await request(app.getHttpServer())
        .post('/cooks/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ kitchenName: `${label} Kitchen`, ownerName: `${label} Owner`, area: 'RS Puram', deliveryRadiusKm: 5, photoUrls: ['https://example.com/a.jpg'] })
        .expect(201);
      const submit = await request(app.getHttpServer())
        .post('/cooks/onboarding/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ payoutMethod: 'UPI', payoutDetails: `${label}@upi` })
        .expect(201);
      const profileId = submit.body.profile.id;
      const cases = await request(app.getHttpServer()).get('/admin/moderation/verifications').set('Authorization', `Bearer ${adminToken}`).expect(200);
      const ownCase = cases.body.find((c: any) => c.cook?.kitchenName === `${label} Kitchen`);
      await request(app.getHttpServer()).post(`/admin/moderation/verifications/${ownCase.id}/approve`).set('Authorization', `Bearer ${adminToken}`).expect(201);
      return { token, profileId };
    }

    const cook = await registerVerifiedCook('Main');
    cookToken = cook.token;
    cookProfileId = cook.profileId;
    const otherCook = await registerVerifiedCook('Other');
    otherCookToken = otherCook.token;

    const customerEmail = `customer-messages+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: customerEmail, password: 'password123', role: 'CUSTOMER' });
    customerToken = (await request(app.getHttpServer()).post('/auth/login').send({ email: customerEmail, password: 'password123' })).body.accessToken;
    const custProfile = await request(app.getHttpServer()).patch('/customers/me').set('Authorization', `Bearer ${customerToken}`).send({ displayName: 'Test Customer' }).expect(200);
    customerProfileId = custProfile.body.id;

    const otherCustomerEmail = `customer-other-messages+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: otherCustomerEmail, password: 'password123', role: 'CUSTOMER' });
    otherCustomerToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: otherCustomerEmail, password: 'password123' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects messaging before authenticating', async () => {
    await request(app.getHttpServer()).get(`/cooks/${cookProfileId}/messages`).expect(401);
  });

  it('lets a customer message a verified kitchen, and the cook sees it with an unread count', async () => {
    await request(app.getHttpServer())
      .post(`/cooks/${cookProfileId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ body: 'Hi! Can you make it less spicy?' })
      .expect(201);

    const conversations = await request(app.getHttpServer())
      .get('/cooks/me/conversations')
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(200);

    expect(conversations.body).toHaveLength(1);
    expect(conversations.body[0]).toMatchObject({ customerId: customerProfileId, lastMessage: 'Hi! Can you make it less spicy?', unreadCount: 1 });
  });

  it('reading the thread as the cook marks it read, and the cook can reply', async () => {
    const thread = await request(app.getHttpServer())
      .get(`/cooks/me/conversations/${customerProfileId}/messages`)
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(200);
    expect(thread.body).toHaveLength(1);
    expect(thread.body[0]).toMatchObject({ senderRole: 'CUSTOMER', body: 'Hi! Can you make it less spicy?' });

    const conversationsAfterRead = await request(app.getHttpServer())
      .get('/cooks/me/conversations')
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(200);
    expect(conversationsAfterRead.body[0].unreadCount).toBe(0);

    await request(app.getHttpServer())
      .post(`/cooks/me/conversations/${customerProfileId}/messages`)
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ body: 'Sure, noted!' })
      .expect(201);

    const customerThread = await request(app.getHttpServer())
      .get(`/cooks/${cookProfileId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(customerThread.body).toHaveLength(2);
    expect(customerThread.body[1]).toMatchObject({ senderRole: 'COOK', body: 'Sure, noted!' });
  });

  it('a second, unrelated cook never sees the first cook\'s conversations', async () => {
    const conversations = await request(app.getHttpServer())
      .get('/cooks/me/conversations')
      .set('Authorization', `Bearer ${otherCookToken}`)
      .expect(200);
    expect(conversations.body).toEqual([]);
  });

  it('a second, unrelated customer starts a fresh empty thread with the same cook — never sees the first customer\'s messages', async () => {
    const thread = await request(app.getHttpServer())
      .get(`/cooks/${cookProfileId}/messages`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(200);
    expect(thread.body).toEqual([]);
  });

  it("400s messaging a kitchen that isn't verified", async () => {
    const email = `cook-unverified+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'password123', role: 'COOK' });
    const token = (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'password123' })).body.accessToken;
    const onboarding = await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ kitchenName: 'Unverified Kitchen', ownerName: 'Owner', area: 'RS Puram', deliveryRadiusKm: 5, photoUrls: ['https://example.com/a.jpg'] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cooks/${onboarding.body.id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ body: 'Hello?' })
      .expect(400);
  });
});
