import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'crypto';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';

/**
 * Phase 10, run against the test env (.env.test) which deliberately has no
 * Razorpay keys — exactly the state the app is in until the user supplies
 * real ones. Confirms: COD is completely unaffected, ONLINE cleanly 400s
 * instead of ever 500ing, and the webhook never trusts an unverified body.
 */
describe('Payments (e2e)', () => {
  let app: INestApplication;
  let userDataSource: DataSource;
  let adminDataSource: DataSource;
  let adminToken: string;
  let cookToken: string;
  let cookProfileId: string;
  let customerToken: string;
  let addressId: string;
  let itemId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    userDataSource = app.get(getDataSourceToken('userDb'));
    adminDataSource = app.get(getDataSourceToken('adminDb'));

    await adminDataSource.query(`DELETE FROM moderation_cases; DELETE FROM verification_records; DELETE FROM admin_users;`);
    await userDataSource.query(
      `DELETE FROM order_status_events; DELETE FROM order_items; DELETE FROM orders;
       DELETE FROM customer_favorites; DELETE FROM customer_addresses; DELETE FROM customer_profiles;
       DELETE FROM menu_items; DELETE FROM kitchen_photos; DELETE FROM cook_profiles; DELETE FROM users;`,
    );

    const adminEmail = `admin-payments+${Date.now()}@loom.test`;
    const passwordHash = await bcrypt.hash('admin-password', 12);
    await adminDataSource.query(`INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`, [
      adminEmail,
      passwordHash,
    ]);
    adminToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: adminEmail, password: 'admin-password' })
    ).body.accessToken;

    const cookEmail = `cook-payments+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: cookEmail, password: 'password123', role: 'COOK' });
    cookToken = (await request(app.getHttpServer()).post('/auth/login').send({ email: cookEmail, password: 'password123' })).body
      .accessToken;
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({
        kitchenName: 'Payments Test Kitchen',
        ownerName: 'Payments Cook',
        phone: '9876543210',
        area: 'RS Puram',
        deliveryRadiusKm: 5,
        photoUrls: ['https://example.com/a.jpg'],
      })
      .expect(201);
    const submit = await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ payoutMethod: 'UPI', payoutDetails: 'cook@upi' })
      .expect(201);
    cookProfileId = submit.body.profile.id;
    const cases = await request(app.getHttpServer())
      .get('/admin/moderation/verifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/admin/moderation/verifications/${cases.body[0].id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const item = await request(app.getHttpServer())
      .post('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ name: 'Dosa', pricePaise: 6000 })
      .expect(201);
    itemId = item.body.id;

    const customerEmail = `customer-payments+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: customerEmail, password: 'password123', role: 'CUSTOMER' });
    customerToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: customerEmail, password: 'password123' })
    ).body.accessToken;
    const address = await request(app.getHttpServer())
      .post('/customers/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ label: 'Home', addressLine: '1 Payments St', isDefault: true })
      .expect(201);
    addressId = address.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports payments as disabled — no keys configured in the test env, same as the current real deployment', async () => {
    const res = await request(app.getHttpServer()).get('/payments/config').expect(200);
    expect(res.body).toEqual({ enabled: false, keyId: null });
  });

  it('COD ordering is completely unaffected: creates a normal order with no Razorpay fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cookId: cookProfileId, addressId, items: [{ menuItemId: itemId, quantity: 1 }] })
      .expect(201);

    expect(res.body.paymentMethod).toBe('COD');
    expect(res.body.paymentStatus).toBe('COD');
    expect(res.body.razorpay).toBeUndefined();
    expect(res.body.razorpayOrderId).toBeFalsy();
  });

  it('400s (never 500s) when paymentMethod is ONLINE and payments are not configured', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cookId: cookProfileId, addressId, items: [{ menuItemId: itemId, quantity: 1 }], paymentMethod: 'ONLINE' })
      .expect(400);
  });

  it('refuses to verify-payment a COD order', async () => {
    const order = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cookId: cookProfileId, addressId, items: [{ menuItemId: itemId, quantity: 1 }] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/orders/${order.body.id}/verify-payment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpayPaymentId: 'pay_x', razorpaySignature: 'sig_x' })
      .expect(400);
  });

  describe('POST /payments/webhook', () => {
    it('400s with no signature header at all', async () => {
      await request(app.getHttpServer()).post('/payments/webhook').send({ event: 'payment.captured' }).expect(400);
    });

    it('400s with a signature that does not match the raw body (no webhook secret configured in the test env, so nothing can ever verify)', async () => {
      const rawBody = JSON.stringify({ event: 'payment.captured' });
      const bogusSignature = createHmac('sha256', 'not-the-real-secret').update(rawBody).digest('hex');

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('X-Razorpay-Signature', bogusSignature)
        .set('Content-Type', 'application/json')
        .send(rawBody)
        .expect(400);
    });
  });
});
