import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Order } from '../orders/order.entity';

export type DeliveryBookingStatus =
  | 'PENDING'
  | 'SKIPPED'
  | 'BOOKED'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * One row per OUT_FOR_DELIVERY transition — created best-effort by
 * DeliveryService (see delivery.events.ts). PENDING/SKIPPED/FAILED all mean
 * "no active Porter booking exists"; only BOOKED onward carries a real
 * porterOrderId. A missing booking (or one stuck in SKIPPED/FAILED) means
 * the cook needs to arrange delivery manually — see DeliveryService.
 */
@Entity('delivery_bookings')
export class DeliveryBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ type: 'text', default: 'PENDING' })
  status!: DeliveryBookingStatus;

  @Column({ name: 'porter_order_id', nullable: true })
  porterOrderId?: string;

  @Column({ name: 'pickup_lat', type: 'numeric', nullable: true })
  pickupLat?: number;

  @Column({ name: 'pickup_lng', type: 'numeric', nullable: true })
  pickupLng?: number;

  @Column({ name: 'drop_lat', type: 'numeric', nullable: true })
  dropLat?: number;

  @Column({ name: 'drop_lng', type: 'numeric', nullable: true })
  dropLng?: number;

  @Column({ name: 'rider_name', nullable: true })
  riderName?: string;

  @Column({ name: 'rider_phone', nullable: true })
  riderPhone?: string;

  @Column({ name: 'tracking_url', nullable: true })
  trackingUrl?: string;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
