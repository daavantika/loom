import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CookProfile } from './cook-profile.entity';

@Entity('kitchen_photos')
export class KitchenPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CookProfile, (profile) => profile.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cook_id' })
  cookProfile!: CookProfile;

  @Column({ name: 'cook_id' })
  cookId!: string;

  @Column()
  url!: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;
}
