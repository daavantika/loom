import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import { MenuItem } from '../menu/menu-item.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id' })
  orderId!: string;

  // Nullable + SET NULL: order history must survive a later menu item deletion.
  @ManyToOne(() => MenuItem, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem?: MenuItem;

  @Column({ name: 'menu_item_id', nullable: true })
  menuItemId?: string;

  // Snapshot at order time — independent of later menu edits.
  @Column()
  name!: string;

  @Column({ name: 'price_paise', type: 'integer' })
  pricePaise!: number;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'line_total_paise', type: 'integer' })
  lineTotalPaise!: number;
}
