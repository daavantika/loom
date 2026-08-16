import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CookProfile, CookProfileStatus } from './cook-profile.entity';
import { KitchenPhoto } from './kitchen-photo.entity';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { VerificationService, CookVerificationStatus } from '../verification/verification.service';
import { PayoutMethod } from '../verification/verification-record.entity';
import { SubmitVerificationDto } from '../verification/dto/submit-verification.dto';

export interface AdminCookProfile {
  id: string;
  kitchenName?: string;
  ownerName?: string;
  phone?: string;
  area?: string;
  status: CookProfileStatus;
  minOrderValuePaise: number;
  photos: string[];
  createdAt: Date;
  verified: boolean;
  verificationStatus: CookVerificationStatus['status'];
  rejectionReason?: string;
  fssaiNumber?: string;
  payoutMethod?: PayoutMethod;
  suspended: boolean;
  suspensionReason?: string;
}

export interface PublicCookProfile {
  id: string;
  kitchenName?: string;
  ownerName?: string;
  area?: string;
  bio?: string;
  deliveryRadiusKm?: number;
  minOrderValuePaise: number;
  verified: boolean;
  photos: string[];
}

/**
 * Shared public-profile shape reused by GET /cooks/:id, GET /cooks (catalog
 * search), and the customer favorites list — one place to keep the merged
 * user-DB profile + admin-DB verification status in sync.
 */
export function toPublicCookProfile(profile: CookProfile, verification: CookVerificationStatus): PublicCookProfile {
  return {
    id: profile.id,
    kitchenName: profile.kitchenName,
    ownerName: profile.ownerName,
    area: profile.area,
    bio: profile.bio,
    deliveryRadiusKm: profile.deliveryRadiusKm,
    minOrderValuePaise: profile.minOrderValuePaise,
    verified: verification.verified,
    photos: profile.photos?.map((p) => p.url) ?? [],
  };
}

@Injectable()
export class CooksService {
  constructor(
    @InjectRepository(CookProfile, 'userDb') private readonly profiles: Repository<CookProfile>,
    @InjectRepository(KitchenPhoto, 'userDb') private readonly photos: Repository<KitchenPhoto>,
    private readonly verification: VerificationService,
  ) {}

  async getOrCreateDraft(userId: string): Promise<CookProfile> {
    let profile = await this.profiles.findOne({ where: { userId }, relations: ['photos'] });
    if (!profile) {
      profile = await this.profiles.save(this.profiles.create({ userId, status: 'DRAFT', minOrderValuePaise: 0 }));
      profile.photos = [];
    }
    return profile;
  }

  async saveOnboarding(userId: string, dto: SaveOnboardingDto): Promise<CookProfile> {
    const profile = await this.getOrCreateDraft(userId);

    if (dto.kitchenName !== undefined) profile.kitchenName = dto.kitchenName;
    if (dto.ownerName !== undefined) profile.ownerName = dto.ownerName;
    if (dto.phone !== undefined) profile.phone = dto.phone;
    if (dto.area !== undefined) profile.area = dto.area;
    if (dto.addressLine !== undefined) profile.addressLine = dto.addressLine;
    if (dto.lat !== undefined) profile.lat = dto.lat;
    if (dto.lng !== undefined) profile.lng = dto.lng;
    if (dto.deliveryRadiusKm !== undefined) profile.deliveryRadiusKm = dto.deliveryRadiusKm;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.minOrderValuePaise !== undefined) profile.minOrderValuePaise = dto.minOrderValuePaise;

    await this.profiles.save(profile);

    if (dto.photoUrls) {
      await this.photos.delete({ cookId: profile.id });
      const rows = dto.photoUrls.map((url, sortOrder) => this.photos.create({ cookId: profile.id, url, sortOrder }));
      await this.photos.save(rows);
      profile.photos = rows;
    }

    return profile;
  }

  async getMyProfile(userId: string): Promise<CookProfile> {
    const profile = await this.profiles.findOne({ where: { userId }, relations: ['photos'] });
    if (!profile) throw new NotFoundException('Cook profile not found — complete onboarding first');
    return profile;
  }

  /** Lets a cook see their own live verification status — same cross-DB merge as getPublicProfile, never a cached column. */
  async getMyProfileWithStatus(userId: string) {
    const profile = await this.getMyProfile(userId);
    const verification = await this.verification.getStatusForCook(profile.id);
    return { profile, verification };
  }

  /**
   * Merges the user-DB profile with the admin-DB verification status —
   * "verified" is never a locally cached column, it's computed here on every
   * read. See VerificationService.getStatusForCook.
   */
  async getPublicProfile(cookProfileId: string) {
    const profile = await this.profiles.findOne({ where: { id: cookProfileId }, relations: ['photos'] });
    if (!profile) throw new NotFoundException('Cook profile not found');
    const verification = await this.verification.getStatusForCook(cookProfileId);
    return { profile, verification };
  }

  /** Lean batch lookup by id, no verification merge — used by ModerationService, which already holds the verification record for these cooks. */
  async findProfilesByIds(cookProfileIds: string[]): Promise<CookProfile[]> {
    if (cookProfileIds.length === 0) return [];
    return this.profiles.find({ where: { id: In(cookProfileIds) }, relations: ['photos'] });
  }

  /**
   * Contact info for Razorpay linked-account creation — email/phone/business
   * name. A same-DB join (cook_profiles -> users, both userDb, via the
   * existing @OneToOne relation) rather than a cross-DB read.
   */
  async getOwnerContact(
    cookProfileId: string,
  ): Promise<{ email: string; phone?: string; kitchenName?: string; ownerName?: string }> {
    const profile = await this.profiles.findOne({ where: { id: cookProfileId }, relations: ['user'] });
    if (!profile) throw new NotFoundException('Cook profile not found');
    return {
      email: profile.user.email,
      phone: profile.phone,
      kitchenName: profile.kitchenName,
      ownerName: profile.ownerName,
    };
  }

  /** Cook profiles that have at least started onboarding (excludes bare DRAFT rows with no submission yet) for a given set of ids, merged with their live verification status. Used by the favorites list. */
  async getPublicProfilesByIds(cookProfileIds: string[]): Promise<PublicCookProfile[]> {
    if (cookProfileIds.length === 0) return [];
    const profiles = await this.profiles.find({ where: { id: In(cookProfileIds) }, relations: ['photos'] });
    const statuses = await this.verification.getStatusForCooks(profiles.map((p) => p.id));
    return profiles.map((profile) =>
      toPublicCookProfile(profile, statuses.get(profile.id) ?? { verified: false, status: 'NONE' }),
    );
  }

  /** Public catalog search: cooks that have submitted onboarding (PENDING_VERIFICATION), optionally filtered by area and/or verified-only. Suspended cooks never appear. */
  async searchPublic(filters: { area?: string; verifiedOnly?: boolean }): Promise<PublicCookProfile[]> {
    const profiles = await this.profiles.find({
      where: {
        status: 'PENDING_VERIFICATION',
        ...(filters.area ? { area: filters.area } : {}),
      },
      relations: ['photos'],
    });
    const cookIds = profiles.map((p) => p.id);
    const [statuses, suspensions] = await Promise.all([
      this.verification.getStatusForCooks(cookIds),
      this.verification.getSuspensionsForCooks(cookIds),
    ]);

    const withStatus = profiles
      .filter((profile) => !suspensions.has(profile.id))
      .map((profile) => ({
        profile,
        status: statuses.get(profile.id) ?? { verified: false, status: 'NONE' as const },
      }));
    const filtered = filters.verifiedOnly ? withStatus.filter((row) => row.status.verified) : withStatus;
    return filtered.map((row) => toPublicCookProfile(row.profile, row.status));
  }

  /** Admin directory: every cook profile regardless of onboarding status, merged with live verification status — same cross-DB merge as getPublicProfile. */
  async listAllForAdmin(): Promise<AdminCookProfile[]> {
    const profiles = await this.profiles.find({ relations: ['photos'], order: { createdAt: 'DESC' } });
    const cookIds = profiles.map((p) => p.id);
    const [statuses, details, suspensions] = await Promise.all([
      this.verification.getStatusForCooks(cookIds),
      this.verification.getDetailsForCooks(cookIds),
      this.verification.getSuspensionsForCooks(cookIds),
    ]);
    return profiles.map((profile) => {
      const status = statuses.get(profile.id) ?? { verified: false, status: 'NONE' as const };
      const detail = details.get(profile.id);
      const suspension = suspensions.get(profile.id);
      return {
        id: profile.id,
        kitchenName: profile.kitchenName,
        ownerName: profile.ownerName,
        phone: profile.phone,
        area: profile.area,
        status: profile.status,
        minOrderValuePaise: profile.minOrderValuePaise,
        photos: profile.photos?.map((p) => p.url) ?? [],
        createdAt: profile.createdAt,
        verified: status.verified,
        verificationStatus: status.status,
        rejectionReason: status.rejectionReason,
        fssaiNumber: detail?.fssaiNumber,
        payoutMethod: detail?.payoutMethod,
        suspended: !!suspension,
        suspensionReason: suspension?.reason,
      };
    });
  }

  /** Admin action: hide a cook from the public catalog without touching their orders/menu/messages. Idempotent — re-suspending updates the reason. */
  async suspendCook(cookProfileId: string, adminId: string, reason?: string): Promise<void> {
    const profile = await this.profiles.findOne({ where: { id: cookProfileId } });
    if (!profile) throw new NotFoundException('Cook profile not found');
    await this.verification.suspendCook(cookProfileId, adminId, reason);
  }

  /** Admin action: reverses suspendCook — the cook reappears in the public catalog. */
  async reinstateCook(cookProfileId: string): Promise<void> {
    await this.verification.reinstateCook(cookProfileId);
  }

  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    const profile = await this.getMyProfile(userId);

    const missing: string[] = [];
    if (!profile.kitchenName) missing.push('kitchenName');
    if (!profile.ownerName) missing.push('ownerName');
    if (!profile.area) missing.push('area');
    if (!profile.deliveryRadiusKm) missing.push('deliveryRadiusKm');
    if (!profile.photos || profile.photos.length === 0) missing.push('at least one kitchen photo');
    if (missing.length) {
      throw new BadRequestException(`Cannot submit for verification, missing: ${missing.join(', ')}`);
    }

    const currentStatus = await this.verification.getStatusForCook(profile.id);
    if (currentStatus.status === 'VERIFIED') {
      throw new ConflictException('This kitchen is already verified');
    }

    const isResubmission = currentStatus.status === 'REJECTED';
    const record = await this.verification.submit(profile.id, dto, isResubmission);

    profile.status = 'PENDING_VERIFICATION';
    await this.profiles.save(profile);

    return { profile, verification: record };
  }
}
