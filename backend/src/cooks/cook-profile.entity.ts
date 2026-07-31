import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { KitchenPhoto } from './kitchen-photo.entity';

// Pure onboarding-progress states — never VERIFIED/REJECTED/SUSPENDED. Those
// are properties of the latest verification_records row (admin DB), computed
// at read time via VerificationService.getStatusForCook, never cached here.
export type CookProfileStatus = 'DRAFT' | 'PENDING_VERIFICATION';

@Entity('cook_profiles')
export class CookProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'kitchen_name', nullable: true })
  kitchenName?: string;

  @Column({ name: 'owner_name', nullable: true })
  ownerName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  area?: string;

  @Column({ name: 'address_line', nullable: true })
  addressLine?: string;

  @Column({ type: 'numeric', nullable: true })
  lat?: number;

  @Column({ type: 'numeric', nullable: true })
  lng?: number;

  @Column({ name: 'delivery_radius_km', type: 'numeric', nullable: true })
  deliveryRadiusKm?: number;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'min_order_value_paise', type: 'integer', default: 0 })
  minOrderValuePaise!: number;

  @Column({ type: 'text', default: 'DRAFT' })
  status!: CookProfileStatus;

  @OneToMany(() => KitchenPhoto, (photo) => photo.cookProfile, { cascade: true })
  photos!: KitchenPhoto[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
