export const ORDER_READY_FOR_PICKUP = 'order.ready_for_pickup';

export interface OrderReadyForPickupEvent {
  orderId: string;
  cookId: string;
  actorUserId: string;
  // Embedded directly from the already-loaded order at emit time — not
  // re-queried by listeners — same reasoning as VerificationApprovedEvent in
  // verification.events.ts. Drop coordinates are the order's own snapshot
  // (Order.deliveryLat/deliveryLng), unrelated to the customer's live
  // address book.
  dropLat?: number;
  dropLng?: number;
  dropAddressLine: string;
}
