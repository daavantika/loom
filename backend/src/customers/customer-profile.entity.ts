import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type DietaryPreference = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
export type SpiceLevel = 'MILD' | 'MEDIUM' | 'HOT';

@Entity('customer_profiles')
export class CustomerProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'dietary_preference', type: 'text', nullable: true })
  dietaryPreference?: DietaryPreference;

  @Column({ name: 'spice_level', type: 'text', nullable: true })
  spiceLevel?: SpiceLevel;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
