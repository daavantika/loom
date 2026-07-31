import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { UPLOADS_DIR } from '../src/uploads/uploads.constants';

/**
 * Walks the Phase 9.5 acceptance criteria: real file upload, the enriched
 * admin moderation listing showing real kitchen data, and cross-cook
 * isolation holding through the new/enriched endpoints.
 */
describe('Cook dashboard: uploads & enriched moderation (e2e)', () => {
  let app: INestApplication;
  let userDataSource: DataSource;
  let adminDataSource: DataSource;
  let adminToken: string;

  let cookAToken: string;
  let cookBToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    (app as NestExpressApplication).useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });
    await app.init();

    userDataSource = app.get(getDataSourceToken('userDb'));
    adminDataSource = app.get(getDataSourceToken('adminDb'));

    await adminDataSource.query(`DELETE FROM moderation_cases; DELETE FROM verification_records; DELETE FROM admin_users;`);
    await userDataSource.query(
      `DELETE FROM order_status_events; DELETE FROM order_items; DELETE FROM orders;
       DELETE FROM customer_favorites; DELETE FROM customer_addresses; DELETE FROM customer_profiles;
       DELETE FROM menu_items; DELETE FROM kitchen_photos; DELETE FROM cook_profiles; DELETE FROM users;`,
    );

    const adminEmail = `admin-dash+${Date.now()}@loom.test`;
    const passwordHash = await bcrypt.hash('admin-password', 12);
    await adminDataSource.query(`INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`, [
      adminEmail,
      passwordHash,
    ]);
    adminToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: adminEmail, password: 'admin-password' })
    ).body.accessToken;

    const cookAEmail = `cook-a-dash+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: cookAEmail, password: 'password123', role: 'COOK' });
    cookAToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: cookAEmail, password: 'password123' })
    ).body.accessToken;

    const cookBEmail = `cook-b-dash+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: cookBEmail, password: 'password123', role: 'COOK' });
    cookBToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: cookBEmail, password: 'password123' })
    ).body.accessToken;

    const customerEmail = `customer-dash+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: customerEmail, password: 'password123', role: 'CUSTOMER' });
    customerToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: customerEmail, password: 'password123' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an upload with no auth (401)', async () => {
    await request(app.getHttpServer())
      .post('/uploads/files')
      .attach('file', Buffer.from('not-really-a-png'), { filename: 'kitchen.png', contentType: 'image/png' })
      .expect(401);
  });

  it('rejects an unsupported file type (400)', async () => {
    await request(app.getHttpServer())
      .post('/uploads/files')
      .set('Authorization', `Bearer ${cookAToken}`)
      .attach('file', Buffer.from('#!/bin/sh\necho hi'), { filename: 'script.sh', contentType: 'application/x-sh' })
      .expect(400);
  });

  let uploadedPhotoUrl: string;

  it('accepts a real image upload and returns a fetchable absolute URL', async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads/files')
      .set('Authorization', `Bearer ${cookAToken}`)
      .attach('file', Buffer.from('fake-png-bytes'), { filename: 'kitchen.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/uploads\/.+\.png$/);
    uploadedPhotoUrl = res.body.url;

    // Fetchable — proves it's actually served back, not just accepted.
    await request(app.getHttpServer()).get(new URL(uploadedPhotoUrl).pathname).expect(200);
  });

  it('403s a non-admin (customer) hitting the moderation listing', async () => {
    await request(app.getHttpServer())
      .get('/admin/moderation/verifications')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('shows real kitchen data (including the uploaded photo) on the enriched moderation listing', async () => {
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({
        kitchenName: 'Dashboard Test Kitchen',
        ownerName: 'Priya',
        area: 'RS Puram',
        deliveryRadiusKm: 5,
        photoUrls: [uploadedPhotoUrl],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ fssaiNumber: 'FSSAI-999', payoutMethod: 'UPI', payoutDetails: 'priya@upi' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/admin/moderation/verifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ourCase = list.body.find((c: any) => c.cook?.kitchenName === 'Dashboard Test Kitchen');
    expect(ourCase).toBeDefined();
    expect(ourCase.cook.ownerName).toBe('Priya');
    expect(ourCase.cook.area).toBe('RS Puram');
    expect(ourCase.cook.photos).toContain(uploadedPhotoUrl);
    expect(ourCase.verification.fssaiNumber).toBe('FSSAI-999');
    expect(ourCase.verification.payoutMethod).toBe('UPI');
    // The encrypted payout secret must never be exposed.
    expect(ourCase.verification.payoutDetailsEncrypted).toBeUndefined();
  });

  it('lets the cook see their own live verification status via GET /cooks/me', async () => {
    const me = await request(app.getHttpServer())
      .get('/cooks/me')
      .set('Authorization', `Bearer ${cookAToken}`)
      .expect(200);

    expect(me.body.verified).toBe(false);
    expect(me.body.verificationStatus).toBe('PENDING');

    const list = await request(app.getHttpServer())
      .get('/admin/moderation/verifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ourCase = list.body.find((c: any) => c.cook?.kitchenName === 'Dashboard Test Kitchen');
    await request(app.getHttpServer())
      .post(`/admin/moderation/verifications/${ourCase.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const meAfter = await request(app.getHttpServer())
      .get('/cooks/me')
      .set('Authorization', `Bearer ${cookAToken}`)
      .expect(200);
    expect(meAfter.body.verified).toBe(true);
    expect(meAfter.body.verificationStatus).toBe('VERIFIED');
  });

  it('keeps cook B fully isolated from cook A\'s menu and orders', async () => {
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookBToken}`)
      .send({ kitchenName: 'Cook B Kitchen', ownerName: 'Cook B Owner', area: 'Peelamedu', deliveryRadiusKm: 5, photoUrls: [uploadedPhotoUrl] })
      .expect(201);

    const cookAMenuItem = await request(app.getHttpServer())
      .post('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ name: "Cook A's Dish", pricePaise: 5000 })
      .expect(201);

    // Cook B's own menu listing never includes cook A's item.
    const cookBMenu = await request(app.getHttpServer())
      .get('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookBToken}`)
      .expect(200);
    expect(cookBMenu.body.map((i: any) => i.id)).not.toContain(cookAMenuItem.body.id);

    // Cook B cannot edit or delete cook A's item.
    await request(app.getHttpServer())
      .patch(`/cooks/me/menu/${cookAMenuItem.body.id}`)
      .set('Authorization', `Bearer ${cookBToken}`)
      .send({ name: 'Hacked' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/cooks/me/menu/${cookAMenuItem.body.id}`)
      .set('Authorization', `Bearer ${cookBToken}`)
      .expect(404);

    // Cook B's own orders listing never includes any of cook A's orders.
    const cookBOrders = await request(app.getHttpServer())
      .get('/cooks/me/orders')
      .set('Authorization', `Bearer ${cookBToken}`)
      .expect(200);
    expect(cookBOrders.body).toEqual([]);
  });
});
