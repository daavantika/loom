import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CookProfile } from '../cooks/cook-profile.entity';
import { CustomerProfile } from '../customers/customer-profile.entity';

export type MessageSenderRole = 'COOK' | 'CUSTOMER';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CookProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cook_id' })
  cook!: CookProfile;

  @Column({ name: 'cook_id' })
  cookId!: string;

  @ManyToOne(() => CustomerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfile;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({ name: 'sender_role', type: 'text' })
  senderRole!: MessageSenderRole;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
