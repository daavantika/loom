import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CustomerProfile } from './customer-profile.entity';

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CustomerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfile;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column()
  label!: string;

  @Column({ name: 'address_line' })
  addressLine!: string;

  @Column({ nullable: true })
  area?: string;

  @Column({ type: 'numeric', nullable: true })
  lat?: number;

  @Column({ type: 'numeric', nullable: true })
  lng?: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
