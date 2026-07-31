import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CookProfile } from '../cooks/cook-profile.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CookProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cook_id' })
  cook!: CookProfile;

  @Column({ name: 'cook_id' })
  cookId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'price_paise', type: 'integer' })
  pricePaise!: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags!: string[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
