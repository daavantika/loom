import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerProfile } from '../customers/customer-profile.entity';
import { CookProfile } from '../cooks/cook-profile.entity';
import { OrderItem } from './order-item.entity';

export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type OrderPaymentStatus = 'COD' | 'PENDING' | 'PAID' | 'FAILED';
export type OrderPaymentMethod = 'COD' | 'ONLINE';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CustomerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfile;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @ManyToOne(() => CookProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cook_id' })
  cook!: CookProfile;

  @Column({ name: 'cook_id' })
  cookId!: string;

  // Snapshot of the chosen customer_addresses row at order time — not FK'd,
  // so editing/deleting the address later never mutates order history.
  @Column({ name: 'delivery_address_label' })
  deliveryAddressLabel!: string;

  @Column({ name: 'delivery_address_line' })
  deliveryAddressLine!: string;

  @Column({ name: 'delivery_area', nullable: true })
  deliveryArea?: string;

  @Column({ name: 'delivery_lat', type: 'numeric', nullable: true })
  deliveryLat?: number;

  @Column({ name: 'delivery_lng', type: 'numeric', nullable: true })
  deliveryLng?: number;

  @Column({ type: 'text', default: 'PLACED' })
  status!: OrderStatus;

  @Column({ name: 'subtotal_paise', type: 'integer' })
  subtotalPaise!: number;

  @Column({ name: 'delivery_fee_paise', type: 'integer', default: 0 })
  deliveryFeePaise!: number;

  @Column({ name: 'total_paise', type: 'integer' })
  totalPaise!: number;

  @Column({ name: 'payment_status', type: 'text', default: 'COD' })
  paymentStatus!: OrderPaymentStatus;

  @Column({ name: 'payment_method', type: 'text', default: 'COD' })
  paymentMethod!: OrderPaymentMethod;

  @Column({ name: 'razorpay_order_id', nullable: true })
  razorpayOrderId?: string;

  @Column({ name: 'razorpay_payment_id', nullable: true })
  razorpayPaymentId?: string;

  // Only set for paymentMethod === 'ONLINE' — the platform's commission and
  // the amount actually routed to the cook via Razorpay Route, split out of
  // totalPaise. Never set for COD, which carries no commission (see
  // specs/phase-10-razorpay-payments).
  @Column({ name: 'platform_fee_paise', type: 'integer', nullable: true })
  platformFeePaise?: number;

  @Column({ name: 'cook_payout_paise', type: 'integer', nullable: true })
  cookPayoutPaise?: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
