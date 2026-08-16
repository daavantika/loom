import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** A cook is suspended iff a row exists here — reinstating deletes it. cook_id has no FK: cook_profiles lives in the user DB. */
@Entity('cook_suspensions')
export class CookSuspension {
  @PrimaryColumn({ name: 'cook_id' })
  cookId!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'suspended_by' })
  suspendedBy!: string;

  @CreateDateColumn({ name: 'suspended_at', type: 'timestamptz' })
  suspendedAt!: Date;
}
