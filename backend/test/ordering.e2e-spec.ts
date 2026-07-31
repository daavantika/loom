import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';

/**
 * Walks the Phase 8 acceptance criteria end to end: order placement against
 * real menu data, min-order-value/verified-cook/cross-cook-item validation,
 * the cook-driven status lifecycle, the customer's narrower cancel window,
 * and 404-not-403 ownership checks. Reuses the two-PGlite-instance pattern.
 */
describe('Ordering & fulfillment (e2e)', () => {
  let app: INestApplication;
  let userDataSource: DataSource;
  let adminDataSource: DataSource;
  let adminToken: string;

  let cookAToken: string;
  let cookBToken: string; // unverified
  let customerToken: string;
  let otherCustomerToken: string;
  let cookAProfileId: string;
  let cookBProfileId: string;
  let addressId: string;
  let itemDosaId: string;
  let itemIdliId: string;
  let inactiveItemId: string;
  let cookBItemId: string;

  const MIN_ORDER_VALUE_PAISE = 10000;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    userDataSource = app.get(getDataSourceToken('userDb'));
    adminDataSource = app.get(getDataSourceToken('adminDb'));

    await adminDataSource.query(`DELETE FROM moderation_cases; DELETE FROM verification_records; DELETE FROM admin_users;`);
    await userDataSource.query(
      `DELETE FROM delivery_bookings; DELETE FROM order_status_events; DELETE FROM order_items; DELETE FROM orders;
       DELETE FROM customer_favorites; DELETE FROM customer_addresses; DELETE FROM customer_profiles;
       DELETE FROM menu_items; DELETE FROM kitchen_photos; DELETE FROM cook_profiles; DELETE FROM users;`,
    );

    const adminEmail = `admin-orders+${Date.now()}@loom.test`;
    const passwordHash = await bcrypt.hash('admin-password', 12);
    await adminDataSource.query(`INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`, [
      adminEmail,
      passwordHash,
    ]);
    adminToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: adminEmail, password: 'admin-password' })
    ).body.accessToken;

    // Cook A: verified, with a min order value and a menu.
    const cookAEmail = `cook-a-orders+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: cookAEmail, password: 'password123', role: 'COOK' });
    cookAToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: cookAEmail, password: 'password123' })
    ).body.accessToken;
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({
        kitchenName: 'Order Test Kitchen',
        ownerName: 'Cook A',
        area: 'RS Puram',
        deliveryRadiusKm: 5,
        minOrderValuePaise: MIN_ORDER_VALUE_PAISE,
        photoUrls: ['https://example.com/a.jpg'],
      })
      .expect(201);
    const submitA = await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ payoutMethod: 'UPI', payoutDetails: 'cooka@upi' })
      .expect(201);
    cookAProfileId = submitA.body.profile.id;
    const casesA = await request(app.getHttpServer())
      .get('/admin/moderation/verifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/admin/moderation/verifications/${casesA.body[0].id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const dosa = await request(app.getHttpServer())
      .post('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ name: 'Dosa', pricePaise: 6000 })
      .expect(201);
    itemDosaId = dosa.body.id;
    const idli = await request(app.getHttpServer())
      .post('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ name: 'Idli', pricePaise: 5000 })
      .expect(201);
    itemIdliId = idli.body.id;
    const inactive = await request(app.getHttpServer())
      .post('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ name: 'Discontinued Vada', pricePaise: 3000 })
      .expect(201);
    inactiveItemId = inactive.body.id;
    await request(app.getHttpServer())
      .patch(`/cooks/me/menu/${inactiveItemId}`)
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ active: false })
      .expect(200);

    // Cook B: onboarded, submitted, never approved — unverified, with its own menu item.
    const cookBEmail = `cook-b-orders+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: cookBEmail, password: 'password123', role: 'COOK' });
    cookBToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: cookBEmail, password: 'password123' })
    ).body.accessToken;
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookBToken}`)
      .send({
        kitchenName: 'Unverified Kitchen',
        ownerName: 'Cook B',
        area: 'RS Puram',
        deliveryRadiusKm: 5,
        photoUrls: ['https://example.com/b.jpg'],
      })
      .expect(201);
    const submitB = await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookBToken}`)
      .send({ payoutMethod: 'UPI', payoutDetails: 'cookb@upi' })
      .expect(201);
    cookBProfileId = submitB.body.profile.id;
    const cookBItem = await request(app.getHttpServer())
      .post('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookBToken}`)
      .send({ name: "Cook B's Dish", pricePaise: 5000 })
      .expect(201);
    cookBItemId = cookBItem.body.id;

    // Customer + address.
    const customerEmail = `customer-orders+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: customerEmail, password: 'password123', role: 'CUSTOMER' });
    customerToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: customerEmail, password: 'password123' })
    ).body.accessToken;
    const address = await request(app.getHttpServer())
      .post('/customers/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ label: 'Home', addressLine: '1 Order St', isDefault: true })
      .expect(201);
    addressId = address.body.id;

    // A second, unrelated customer — used for the third-party 404 checks.
    const otherEmail = `customer-other+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: otherEmail, password: 'password123', role: 'CUSTOMER' });
    otherCustomerToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: otherEmail, password: 'password123' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an order against an unverified cook (400, no order created)', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cookId: cookBProfileId, addressId, items: [{ menuItemId: cookBItemId, quantity: 1 }] })
      .expect(400);
  });

  it('rejects an order whose subtotal is below the minimum order value', async () => {
    // 1 Idli = 5000 paise, below the 10000 paise minimum.
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cookId: cookAProfileId, addressId, items: [{ menuItemId: itemIdliId, quantity: 1 }] })
      .expect(400);
  });

  it('rejects an order including an inactive item', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        cookId: cookAProfileId,
        addressId,
        items: [
          { menuItemId: itemDosaId, quantity: 1 },
          { menuItemId: inactiveItemId, quantity: 1 },
        ],
      })
      .expect(400);
  });

  it('rejects an order including a menu item belonging to a different cook', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        cookId: cookAProfileId,
        addressId,
        items: [{ menuItemId: cookBItemId, quantity: 1 }],
      })
      .expect(400);
  });

  let orderId: string;

  it('places an order meeting the minimum order value against a verified cook', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        cookId: cookAProfileId,
        addressId,
        items: [
          { menuItemId: itemDosaId, quantity: 1 }, // 6000
          { menuItemId: itemIdliId, quantity: 1 }, // 5000
        ],
      })
      .expect(201);

    orderId = res.body.id;
    expect(res.body.status).toBe('PLACED');
    expect(res.body.subtotalPaise).toBe(11000);
    expect(res.body.totalPaise).toBe(11000);
  });

  it('appears in both the cook\'s and the customer\'s order lists', async () => {
    const cookList = await request(app.getHttpServer())
      .get('/cooks/me/orders')
      .set('Authorization', `Bearer ${cookAToken}`)
      .expect(200);
    expect(cookList.body.map((o: any) => o.id)).toContain(orderId);

    const customerList = await request(app.getHttpServer())
      .get('/orders/mine')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(customerList.body.map((o: any) => o.id)).toContain(orderId);
  });

  it('404s for a third-party customer on both GET and PATCH', async () => {
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ status: 'CANCELLED' })
      .expect(404);
  });

  it('rejects the cook skipping straight from PLACED to PREPARING', async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ status: 'PREPARING' })
      .expect(400);
  });

  it('walks ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED, recording every event', async () => {
    for (const status of ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${cookAToken}`)
        .send({ status })
        .expect(200);
    }

    const detail = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${cookAToken}`)
      .expect(200);

    expect(detail.body.order.status).toBe('DELIVERED');
    expect(detail.body.statusHistory.map((e: any) => e.status)).toEqual([
      'PLACED',
      'ACCEPTED',
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
  });

  it('creates a SKIPPED delivery booking when the order reached OUT_FOR_DELIVERY (no PORTER_API_KEY in the test env, same as the current real deployment)', async () => {
    const rows = await userDataSource.query(`SELECT status FROM delivery_bookings WHERE order_id = $1`, [orderId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('SKIPPED');
  });

  it("lets the customer cancel while PLACED, but not once the cook has accepted", async () => {
    const placed = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cookId: cookAProfileId, addressId, items: [{ menuItemId: itemDosaId, quantity: 2 }] })
      .expect(201);
    const cancellableOrderId = placed.body.id;

    await request(app.getHttpServer())
      .patch(`/orders/${cancellableOrderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    const secondOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cookId: cookAProfileId, addressId, items: [{ menuItemId: itemDosaId, quantity: 2 }] })
      .expect(201);
    const acceptedOrderId = secondOrder.body.id;
    await request(app.getHttpServer())
      .patch(`/orders/${acceptedOrderId}/status`)
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ status: 'ACCEPTED' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/orders/${acceptedOrderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CANCELLED' })
      .expect(400);
  });
});
