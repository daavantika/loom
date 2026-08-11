import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CookProfile } from '../cooks/cook-profile.entity';

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CookProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cook_id' })
  cook!: CookProfile;

  @Column({ name: 'cook_id' })
  cookId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
