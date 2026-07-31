import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ModerationCase } from './moderation-case.entity';
import { VerificationService } from '../verification/verification.service';
import { VerificationSubmittedEvent, VERIFICATION_SUBMITTED } from '../verification/verification.events';
import { CooksService } from '../cooks/cooks.service';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationCase, 'adminDb') private readonly cases: Repository<ModerationCase>,
    private readonly verification: VerificationService,
    private readonly cooks: CooksService,
    @InjectDataSource('adminDb') private readonly dataSource: DataSource,
  ) {}

  @OnEvent(VERIFICATION_SUBMITTED)
  async handleVerificationSubmitted(event: VerificationSubmittedEvent) {
    await this.cases.save(
      this.cases.create({
        type: 'VERIFICATION',
        entityType: 'verification_record',
        entityId: event.verificationId,
        status: 'OPEN',
      }),
    );
  }

  /**
   * Enriches each bare case with the referenced verification record and cook
   * profile — an admin reviewing an application needs to see the kitchen's
   * actual submitted data, not just a case id pointing at it. This is the
   * cross-DB "directory service" read pattern flagged as a future need back
   * in Phase 1.5: batch-read from the user DB (cook profiles) to enrich data
   * that only exists here, in the admin DB, never the reverse.
   */
  async listOpenVerificationCases() {
    const cases = await this.cases.find({
      where: [
        { type: 'VERIFICATION', status: 'OPEN' },
        { type: 'VERIFICATION', status: 'IN_REVIEW' },
      ],
      order: { openedAt: 'ASC' },
    });
    if (cases.length === 0) return [];

    const verificationRecords = await this.verification.findByIds(cases.map((c) => c.entityId));
    const recordsById = new Map(verificationRecords.map((r) => [r.id, r]));

    const cookProfiles = await this.cooks.findProfilesByIds(verificationRecords.map((r) => r.cookId));
    const cooksById = new Map(cookProfiles.map((c) => [c.id, c]));

    return cases.map((modCase) => {
      const record = recordsById.get(modCase.entityId);
      const cook = record ? cooksById.get(record.cookId) : undefined;
      return {
        ...modCase,
        verification: record
          ? {
              fssaiNumber: record.fssaiNumber,
              fssaiDocUrl: record.fssaiDocUrl,
              payoutMethod: record.payoutMethod,
              type: record.type,
              createdAt: record.createdAt,
            }
          : null,
        cook: cook
          ? {
              id: cook.id,
              kitchenName: cook.kitchenName,
              ownerName: cook.ownerName,
              area: cook.area,
              photos: cook.photos?.map((p) => p.url) ?? [],
              deliveryRadiusKm: cook.deliveryRadiusKm,
              bio: cook.bio,
            }
          : null,
      };
    });
  }

  private async getVerificationCaseOrThrow(caseId: string, manager: EntityManager): Promise<ModerationCase> {
    const repo = manager.withRepository(this.cases);
    const record = await repo.findOne({ where: { id: caseId } });
    if (!record) throw new NotFoundException('Moderation case not found');
    if (record.type !== 'VERIFICATION') throw new BadRequestException('Not a verification case');
    if (record.status === 'RESOLVED' || record.status === 'REJECTED') {
      throw new BadRequestException('This case has already been closed');
    }
    return record;
  }

  /** Single adminDb transaction — the verification_records write and the moderation_cases write commit or roll back together. */
  async approveVerification(caseId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const modCase = await this.getVerificationCaseOrThrow(caseId, manager);
      await this.verification.approve(modCase.entityId, adminId, manager);

      modCase.status = 'RESOLVED';
      modCase.assignedAdminId = adminId;
      modCase.resolvedAt = new Date();
      return manager.withRepository(this.cases).save(modCase);
    });
  }

  async rejectVerification(caseId: string, adminId: string, reason: string) {
    return this.dataSource.transaction(async (manager) => {
      const modCase = await this.getVerificationCaseOrThrow(caseId, manager);
      await this.verification.reject(modCase.entityId, adminId, reason, manager);

      modCase.status = 'REJECTED';
      modCase.assignedAdminId = adminId;
      modCase.resolutionNotes = reason;
      modCase.resolvedAt = new Date();
      return manager.withRepository(this.cases).save(modCase);
    });
  }
}
