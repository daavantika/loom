import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Composite PK (customerId, cookId) — favoriting twice is a no-op, not an error. No FK to cook_profiles beyond the shared userDb (both tables live here, so this one IS a real, DB-enforced FK — see migration). */
@Entity('customer_favorites')
export class CustomerFavorite {
  @PrimaryColumn({ name: 'customer_id' })
  customerId!: string;

  @PrimaryColumn({ name: 'cook_id' })
  cookId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
