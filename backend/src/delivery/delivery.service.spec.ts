import { DeliveryService } from './delivery.service';
import { PorterClientService } from './porter-client.service';
import { CooksService } from '../cooks/cooks.service';
import { OrdersService } from '../orders/orders.service';
import { OrderReadyForPickupEvent } from './delivery.events';

describe('DeliveryService.handleOrderReadyForPickup', () => {
  let bookings: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let porter: { isConfigured: jest.Mock; createPickup: jest.Mock; verifyWebhookSignature: jest.Mock };
  let cooks: { getPublicProfile: jest.Mock };
  let orders: { markDeliveredFromWebhook: jest.Mock };
  let service: DeliveryService;

  const baseEvent: OrderReadyForPickupEvent = {
    orderId: 'order-1',
    cookId: 'cook-1',
    actorUserId: 'user-1',
    dropLat: 11.1,
    dropLng: 77.1,
    dropAddressLine: '1 Customer St',
  };

  beforeEach(() => {
    bookings = {
      create: jest.fn((input) => ({ ...input })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
    };
    porter = { isConfigured: jest.fn(() => true), createPickup: jest.fn(), verifyWebhookSignature: jest.fn() };
    cooks = { getPublicProfile: jest.fn(async () => ({ profile: { lat: 11, lng: 77, addressLine: '1 Cook St' } })) };
    orders = { markDeliveredFromWebhook: jest.fn() };
    service = new DeliveryService(
      bookings as any,
      porter as unknown as PorterClientService,
      cooks as unknown as CooksService,
      orders as unknown as OrdersService,
    );
  });

  it('skips dispatch and records SKIPPED when the cook has no pickup coordinates on file', async () => {
    cooks.getPublicProfile.mockResolvedValue({ profile: { lat: undefined, lng: undefined, addressLine: undefined } });

    await service.handleOrderReadyForPickup(baseEvent);

    expect(porter.createPickup).not.toHaveBeenCalled();
    expect(bookings.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'SKIPPED' }));
  });

  it('skips dispatch and records SKIPPED when the order has no drop coordinates', async () => {
    await service.handleOrderReadyForPickup({ ...baseEvent, dropLat: undefined, dropLng: undefined });

    expect(porter.createPickup).not.toHaveBeenCalled();
    expect(bookings.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'SKIPPED' }));
  });

  it('skips dispatch and records SKIPPED when Porter is not configured', async () => {
    porter.isConfigured.mockReturnValue(false);

    await service.handleOrderReadyForPickup(baseEvent);

    expect(porter.createPickup).not.toHaveBeenCalled();
    expect(bookings.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'SKIPPED', failureReason: 'Porter not configured' }));
  });

  it('books the pickup and records BOOKED with the returned porterOrderId on success', async () => {
    porter.createPickup.mockResolvedValue({ porterOrderId: 'por_123', trackingUrl: 'https://porter.in/track/por_123' });

    await service.handleOrderReadyForPickup(baseEvent);

    expect(porter.createPickup).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', pickupLat: 11, pickupLng: 77, dropLat: 11.1, dropLng: 77.1 }),
    );
    expect(bookings.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'BOOKED', porterOrderId: 'por_123', trackingUrl: 'https://porter.in/track/por_123' }),
    );
  });

  it('records FAILED (never throws) when the Porter API call rejects', async () => {
    porter.createPickup.mockRejectedValue(new Error('Porter API error (500): timeout'));

    await expect(service.handleOrderReadyForPickup(baseEvent)).resolves.toBeUndefined();

    expect(bookings.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED', failureReason: 'Porter API error (500): timeout' }),
    );
  });
});

describe('DeliveryService.handleWebhookStatusUpdate', () => {
  let bookings: { findOne: jest.Mock; save: jest.Mock };
  let orders: { markDeliveredFromWebhook: jest.Mock };
  let service: DeliveryService;

  beforeEach(() => {
    bookings = { findOne: jest.fn(), save: jest.fn(async (entity) => entity) };
    orders = { markDeliveredFromWebhook: jest.fn(async () => undefined) };
    service = new DeliveryService(
      bookings as any,
      {} as PorterClientService,
      {} as CooksService,
      orders as unknown as OrdersService,
    );
  });

  it('is a no-op when no booking matches the porterOrderId (unknown booking, nothing to update)', async () => {
    bookings.findOne.mockResolvedValue(null);

    await service.handleWebhookStatusUpdate({ porterOrderId: 'por_unknown', status: 'PICKED_UP' });

    expect(bookings.save).not.toHaveBeenCalled();
  });

  it('is a no-op when the booking is already in a terminal state (idempotent — never re-processes)', async () => {
    bookings.findOne.mockResolvedValue({ status: 'DELIVERED', orderId: 'order-1' });

    await service.handleWebhookStatusUpdate({ porterOrderId: 'por_123', status: 'CANCELLED' });

    expect(bookings.save).not.toHaveBeenCalled();
  });

  it('updates the booking status and rider info on a normal transition', async () => {
    bookings.findOne.mockResolvedValue({ status: 'BOOKED', orderId: 'order-1' });

    await service.handleWebhookStatusUpdate({ porterOrderId: 'por_123', status: 'RIDER_ASSIGNED', riderName: 'Kumar', riderPhone: '999' });

    expect(bookings.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'RIDER_ASSIGNED', riderName: 'Kumar', riderPhone: '999' }),
    );
    expect(orders.markDeliveredFromWebhook).not.toHaveBeenCalled();
  });

  it('drives the order to DELIVERED via OrdersService when Porter reports delivery complete', async () => {
    bookings.findOne.mockResolvedValue({ status: 'PICKED_UP', orderId: 'order-1' });

    await service.handleWebhookStatusUpdate({ porterOrderId: 'por_123', status: 'DELIVERED' });

    expect(orders.markDeliveredFromWebhook).toHaveBeenCalledWith('order-1');
  });
});
