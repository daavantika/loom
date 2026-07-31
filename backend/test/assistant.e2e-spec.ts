import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { GeminiClientService } from '../src/assistant/gemini-client.service';

/**
 * Phase 12. Never calls the real paid Gemini API in automated tests — the
 * client is mocked at the Nest DI level (same reasoning as never hitting
 * Razorpay's real API in Phase 10's e2e suite) — but everything around it
 * (grounding-data assembly from real seeded catalog data, request
 * validation) runs for real.
 */
describe('Assistant (e2e)', () => {
  let app: INestApplication;
  let userDataSource: DataSource;
  let adminDataSource: DataSource;
  let generateReply: jest.Mock;

  beforeAll(async () => {
    generateReply = jest.fn(async () => 'Try Chat Smoke Kitchen for lunch!');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GeminiClientService)
      .useValue({ isConfigured: () => true, generateReply })
      .compile();
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

    const adminEmail = `admin-assistant+${Date.now()}@loom.test`;
    const passwordHash = await bcrypt.hash('admin-password', 12);
    await adminDataSource.query(`INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`, [
      adminEmail,
      passwordHash,
    ]);
    const adminToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: adminEmail, password: 'admin-password' })
    ).body.accessToken;

    const cookEmail = `cook-assistant+${Date.now()}@loom.test`;
    await request(app.getHttpServer()).post('/auth/register').send({ email: cookEmail, password: 'password123', role: 'COOK' });
    const cookToken = (await request(app.getHttpServer()).post('/auth/login').send({ email: cookEmail, password: 'password123' })).body
      .accessToken;
    await request(app.getHttpServer())
      .post('/cooks/onboarding')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ kitchenName: 'Chat Smoke Kitchen', ownerName: 'Owner', area: 'RS Puram', deliveryRadiusKm: 5, photoUrls: ['https://example.com/a.jpg'] })
      .expect(201);
    const submit = await request(app.getHttpServer())
      .post('/cooks/onboarding/submit')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ payoutMethod: 'UPI', payoutDetails: 'cook@upi' })
      .expect(201);
    const cases = await request(app.getHttpServer()).get('/admin/moderation/verifications').set('Authorization', `Bearer ${adminToken}`).expect(200);
    await request(app.getHttpServer())
      .post(`/admin/moderation/verifications/${cases.body[0].id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post('/cooks/me/menu')
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ name: 'Lemon rice box', pricePaise: 9000 })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('is reachable without authentication and returns a real reply', async () => {
    const res = await request(app.getHttpServer())
      .post('/assistant/chat')
      .send({ messages: [{ role: 'user', text: 'Suggest something for lunch' }] })
      .expect(201);

    expect(res.body).toEqual({ reply: 'Try Chat Smoke Kitchen for lunch!' });
  });

  it('grounds the system prompt in the real seeded catalog (not a hallucinated kitchen)', async () => {
    await request(app.getHttpServer())
      .post('/assistant/chat')
      .send({ messages: [{ role: 'user', text: 'Suggest something for lunch' }] })
      .expect(201);

    const [systemPrompt] = generateReply.mock.calls.at(-1)!;
    expect(systemPrompt).toContain('Chat Smoke Kitchen');
    expect(systemPrompt).toContain('Lemon rice box');
  });

  it('rejects a message array over the size limit', async () => {
    const messages = Array.from({ length: 21 }, () => ({ role: 'user', text: 'hi' }));
    await request(app.getHttpServer()).post('/assistant/chat').send({ messages }).expect(400);
  });

  it('rejects an over-length message body', async () => {
    await request(app.getHttpServer())
      .post('/assistant/chat')
      .send({ messages: [{ role: 'user', text: 'x'.repeat(1001) }] })
      .expect(400);
  });

  it('rejects an invalid role', async () => {
    await request(app.getHttpServer())
      .post('/assistant/chat')
      .send({ messages: [{ role: 'system', text: 'hi' }] })
      .expect(400);
  });
});
