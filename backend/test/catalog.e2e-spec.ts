import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';

/**
 * Walks the Phase 7 acceptance criteria end to end: customer profile,
 * addresses, cook-owned menu, public catalog search/filtering, favorites.
 * Reuses the same two-PGlite-instance pattern as onboarding.e2e-spec.ts.
 */
describe('Customer parity & public catalog (e2e)', () => {
  let app: INestApplication;
  let userDataSource: DataSource;
  let adminDataSource: DataSource;
  let adminToken: string;

  const cookAEmail = `cook-a+${Date.now()}@loom.test`;
  const cookBEmail = `cook-b+${Date.now()}@loom.test`;
  const customerEmail = `customer+${Date.now()}@loom.test`;
  let cookAToken: string;
  let cookBToken: string;
  let customerToken: string;
  let cookAProfileId: string;
  let cookBProfileId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    userDataSource = app.get(getDataSourceToken('userDb'));
    adminDataSource = app.get(getDataSourceToken('adminDb'));

    await adminDataSource.query(`DELETE FROM moderation_cases; DELETE FROM verification_records; DELETE FROM admin_users;`);
    await userDataSource.query(
      `DELETE FROM customer_favorites; DELETE FROM customer_addresses; DELETE FROM customer_profiles;
       DELETE FROM menu_items; DELETE FROM kitchen_photos; DELETE FROM cook_profiles; DELETE FROM users;`,
    );

    const adminEmail = `admin-catalog+${Date.now()}@loom.test`;
    const passwordHash = await bcrypt.hash('admin-password', 12);
    await adminDataSource.query(`INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`, [
      adminEmail,
      passwordHash,
    ]);
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'admin-password' });
    adminToken = adminLogin.body.accessToken;

    // Cook A: fully onboarded and verified.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: cookAEmail, password: 'cook-password', role: 'COOK' })
      .expect(201);
    cookAToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: cookAEmail, password: 'cook-password' })
    ).body.accessToken;
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({
        kitchenName: 'Verified Kitchen',
        ownerName: 'Cook A',
        area: 'RS Puram',
        deliveryRadiusKm: 5,
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

    // Cook B: onboarded and submitted, but never approved — stays unverified.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: cookBEmail, password: 'cook-password', role: 'COOK' })
      .expect(201);
    cookBToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: cookBEmail, password: 'cook-password' })
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

    // Customer.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: customerEmail, password: 'customer-password', role: 'CUSTOMER' })
      .expect(201);
    customerToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: customerEmail, password: 'customer-password' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a customer profile on first GET /customers/me', async () => {
    const res = await request(app.getHttpServer())
      .get('/customers/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(res.body.userId).toBeDefined();
    expect(res.body.displayName).toBeNull();
  });

  let homeAddressId: string;
  let workAddressId: string;

  it('adds two addresses; marking the second default un-defaults the first', async () => {
    const home = await request(app.getHttpServer())
      .post('/customers/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ label: 'Home', addressLine: '1 First St', isDefault: true })
      .expect(201);
    homeAddressId = home.body.id;
    expect(home.body.isDefault).toBe(true);

    const work = await request(app.getHttpServer())
      .post('/customers/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ label: 'Work', addressLine: '2 Second St', isDefault: true })
      .expect(201);
    workAddressId = work.body.id;
    expect(work.body.isDefault).toBe(true);

    const list = await request(app.getHttpServer())
      .get('/customers/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const home2 = list.body.find((a: any) => a.id === homeAddressId);
    const work2 = list.body.find((a: any) => a.id === workAddressId);
    expect(home2.isDefault).toBe(false);
    expect(work2.isDefault).toBe(true);
  });

  let activeItemIds: string[] = [];
  let inactiveItemId: string;

  it('cook A adds three menu items, one made inactive', async () => {
    const items = [];
    for (const name of ['Dosa', 'Idli', 'Vada']) {
      const res = await request(app.getHttpServer())
        .post('/cooks/me/menu')
        .set('Authorization', `Bearer ${cookAToken}`)
        .send({ name, pricePaise: 5000 })
        .expect(201);
      items.push(res.body);
    }
    inactiveItemId = items[2].id;
    activeItemIds = [items[0].id, items[1].id];

    await request(app.getHttpServer())
      .patch(`/cooks/me/menu/${inactiveItemId}`)
      .set('Authorization', `Bearer ${cookAToken}`)
      .send({ active: false })
      .expect(200);
  });

  it('public GET /cooks/:id/menu returns only active items, unauthenticated', async () => {
    const res = await request(app.getHttpServer()).get(`/cooks/${cookAProfileId}/menu`).expect(200);
    const ids = res.body.map((i: any) => i.id);

    expect(ids.sort()).toEqual([...activeItemIds].sort());
    expect(ids).not.toContain(inactiveItemId);
  });

  it('GET /cooks?verifiedOnly=true includes the verified cook, excludes the unverified one', async () => {
    const res = await request(app.getHttpServer()).get('/cooks?verifiedOnly=true').expect(200);
    const ids = res.body.map((c: any) => c.id);

    expect(ids).toContain(cookAProfileId);
    expect(ids).not.toContain(cookBProfileId);
  });

  it('favorites a cook, lists it with verified:true, unfavorites idempotently', async () => {
    await request(app.getHttpServer())
      .put(`/customers/me/favorites/${cookAProfileId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(204);

    const favorites = await request(app.getHttpServer())
      .get('/customers/me/favorites')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(favorites.body).toHaveLength(1);
    expect(favorites.body[0].id).toBe(cookAProfileId);
    expect(favorites.body[0].verified).toBe(true);

    await request(app.getHttpServer())
      .delete(`/customers/me/favorites/${cookAProfileId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(204);

    const afterRemoval = await request(app.getHttpServer())
      .get('/customers/me/favorites')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(afterRemoval.body).toHaveLength(0);

    // idempotent — removing again still succeeds
    await request(app.getHttpServer())
      .delete(`/customers/me/favorites/${cookAProfileId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(204);
  });

  it("404s when cook B tries to edit cook A's menu item — not another cook's data", async () => {
    await request(app.getHttpServer())
      .patch(`/cooks/me/menu/${activeItemIds[0]}`)
      .set('Authorization', `Bearer ${cookBToken}`)
      .send({ name: 'Hacked' })
      .expect(404);
  });
});
