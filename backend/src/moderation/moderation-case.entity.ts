import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ModerationCaseType = 'VERIFICATION' | 'QUALITY_COMPLAINT' | 'BULK_CAPACITY_EXCEPTION';
export type ModerationCaseStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

@Entity('moderation_cases')
export class ModerationCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  type!: ModerationCaseType;

  @Column({ name: 'entity_type' })
  entityType!: string;

  @Column({ name: 'entity_id' })
  entityId!: string;

  @Column({ type: 'text', default: 'OPEN' })
  status!: ModerationCaseStatus;

  @Column({ name: 'assigned_admin_id', nullable: true })
  assignedAdminId?: string;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string;

  @CreateDateColumn({ name: 'opened_at', type: 'timestamptz' })
  openedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;
}
