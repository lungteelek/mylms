import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { getTenantVideoStorageUsage } from '../lib/storage-usage';
import { normalizeCommercePayload } from '../lib/pricing';
import { ensureTenantLicense, getTenantFeatureMap, isInstructorRole } from '../lib/tenant';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function toJsonValue(value: Record<string, unknown> | null | undefined) {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

type MembershipOption = {
  id: string;
  name: string;
  durationMonths: 1 | 3 | 6 | 12 | 18 | 24;
  compareAtPrice: number | null;
  salePrice: number | null;
  enabled: boolean;
  includedCourseIds: string[];
};

function normalizeMembershipOptions(input: unknown): MembershipOption[] {
  const allowed = new Set([1, 3, 6, 12, 18, 24]);
  if (!Array.isArray(input)) return [];

  const normalized: MembershipOption[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const rawMonths = Number((item as Record<string, unknown>).durationMonths);
    if (!allowed.has(rawMonths)) continue;
    const rawCompareAt = (item as Record<string, unknown>).compareAtPrice;
    const rawSale = (item as Record<string, unknown>).salePrice;
    const includedCourseIds = Array.isArray((item as Record<string, unknown>).includedCourseIds)
      ? ((item as Record<string, unknown>).includedCourseIds as unknown[])
          .map((value) => String(value).trim())
          .filter(Boolean)
      : [];
    normalized.push({
      id: String((item as Record<string, unknown>).id || `pkg-${Date.now()}-${normalized.length + 1}`),
      name: String((item as Record<string, unknown>).name || '').trim() || `${rawMonths} เดือน`,
      durationMonths: rawMonths as 1 | 3 | 6 | 12 | 18 | 24,
      compareAtPrice: rawCompareAt === null || rawCompareAt === undefined || rawCompareAt === '' ? null : Number(rawCompareAt),
      salePrice: rawSale === null || rawSale === undefined || rawSale === '' ? null : Number(rawSale),
      enabled: Boolean((item as Record<string, unknown>).enabled),
      includedCourseIds: [...new Set(includedCourseIds)],
    });
  }
  return normalized;
}

router.get('/context', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user!.userId,
          tenantId: req.user!.tenantId,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Tenant membership not found' });
    }

    const license = await ensureTenantLicense(prisma, req.user!.tenantId);
    const features = await getTenantFeatureMap(prisma, req.user!.tenantId);
    const billingProfile = await prisma.tutorBillingProfile.findUnique({
      where: { tenantId: req.user!.tenantId },
    });
    const pricing = (license.metadata && typeof license.metadata === 'object' && 'pricing' in license.metadata)
      ? (license.metadata as {
          pricing?: {
            packageId?: string;
            monthlyFee?: number | null;
            revenueSharePct?: number | null;
            videoQuotaGb?: number | null;
            promoFreeMonths?: number;
            promoEnabled?: boolean;
            renewalIntervalMonths?: number;
            membershipOptions?: MembershipOption[];
            includedCourseIds?: string[];
          };
        }).pricing || null
      : null;
    const storageUsage = getTenantVideoStorageUsage(membership.tenant.id, membership.tenant.slug);

    res.json({
      tenant: membership.tenant,
      membership: {
        role: membership.role,
        isDefault: membership.isDefault,
      },
      license: {
        status: license.status,
        plan: license.plan,
        expiresAt: license.expiresAt,
      },
      billingProfile: billingProfile
        ? {
            ...billingProfile,
            revenueSharePct: billingProfile.revenueSharePct === null ? null : Number(billingProfile.revenueSharePct),
          }
        : null,
      pricing,
      usage: {
        videoStorageBytesUsed: storageUsage.bytesUsed,
        videoStorageGbUsed: storageUsage.gigabytesUsed,
        videoQuotaGb: pricing?.videoQuotaGb ?? null,
      },
      features,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commerce', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const license = await ensureTenantLicense(prisma, req.user!.tenantId);
    const metadata = license.metadata && typeof license.metadata === 'object' ? license.metadata as Record<string, unknown> : {};
    const commerce = normalizeCommercePayload(metadata.workspaceCommerce);

    res.json({
      commerce,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/commerce', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const license = await ensureTenantLicense(prisma, req.user!.tenantId);
    const currentMetadata = license.metadata && typeof license.metadata === 'object' ? license.metadata as Record<string, unknown> : {};
    const commerce = normalizeCommercePayload(req.body);

    await prisma.license.update({
      where: { tenantId: req.user!.tenantId },
      data: {
        metadata: {
          ...currentMetadata,
          workspaceCommerce: commerce,
        },
      },
    });

    res.json({
      commerce,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/billing-profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const license = await ensureTenantLicense(prisma, req.user!.tenantId);
    const currentMetadata = license.metadata && typeof license.metadata === 'object' ? license.metadata as Record<string, unknown> : {};
    const currentPricing = (currentMetadata.pricing && typeof currentMetadata.pricing === 'object')
      ? currentMetadata.pricing as Record<string, unknown>
      : {};

    const body = req.body as {
      monthlyFeeMinor?: number | string | null;
      currency?: string;
      billingModel?: 'MONTHLY' | 'REVENUE_SHARE';
      checkoutOwner?: 'PLATFORM' | 'TUTOR';
      studentAccountMode?: 'PLATFORM_MANAGED' | 'TUTOR_MANAGED';
      active?: boolean;
      notes?: string;
      metadata?: Record<string, unknown> | null;
      pricing?: {
        monthlyFee?: number | null;
        promoEnabled?: boolean;
        promoFreeMonths?: number;
        renewalIntervalMonths?: number;
        membershipOptions?: MembershipOption[];
        includedCourseIds?: string[];
      };
    };

    const monthlyFeeMinor = body.monthlyFeeMinor === null || body.monthlyFeeMinor === undefined || body.monthlyFeeMinor === ''
      ? null
      : Number(body.monthlyFeeMinor);
    const renewalIntervalMonths = Math.max(1, Number(body.pricing?.renewalIntervalMonths || 1));
    const promoFreeMonths = Math.max(0, Number(body.pricing?.promoFreeMonths || 0));
    const promoEnabled = body.pricing?.promoEnabled ?? false;
    const membershipOptions = normalizeMembershipOptions(body.pricing?.membershipOptions);
    const includedCourseIds = Array.from(new Set(
      (Array.isArray(body.pricing?.includedCourseIds) ? body.pricing?.includedCourseIds : [])
        .map((value) => String(value).trim())
        .filter(Boolean),
    ));

    const profile = await prisma.tutorBillingProfile.upsert({
      where: { tenantId: req.user!.tenantId },
      create: {
        tenantId: req.user!.tenantId,
        billingModel: body.billingModel || 'MONTHLY',
        checkoutOwner: body.checkoutOwner || 'TUTOR',
        studentAccountMode: body.studentAccountMode || 'TUTOR_MANAGED',
        monthlyFeeMinor,
        revenueSharePct: null,
        settlementDelayDays: 7,
        currency: String(body.currency || 'THB'),
        active: body.active ?? true,
        notes: body.notes?.trim() || null,
        metadata: toJsonValue(body.metadata),
      },
      update: {
        billingModel: body.billingModel || 'MONTHLY',
        checkoutOwner: body.checkoutOwner || 'TUTOR',
        studentAccountMode: body.studentAccountMode || 'TUTOR_MANAGED',
        monthlyFeeMinor,
        currency: body.currency?.trim() || 'THB',
        active: body.active ?? true,
        notes: body.notes?.trim() ?? null,
        metadata: body.metadata === undefined ? undefined : toJsonValue(body.metadata),
      },
    });

    const nextPricing = {
      ...currentPricing,
      monthlyFee: monthlyFeeMinor === null ? null : Number(monthlyFeeMinor) / 100,
      promoEnabled,
      promoFreeMonths,
      renewalIntervalMonths,
      membershipOptions,
      includedCourseIds,
    };

    const updatedLicense = await prisma.license.update({
      where: { tenantId: req.user!.tenantId },
      data: {
        metadata: {
          ...currentMetadata,
          pricing: nextPricing,
        },
      },
    });

    const pricing = (updatedLicense.metadata && typeof updatedLicense.metadata === 'object' && 'pricing' in updatedLicense.metadata)
      ? (updatedLicense.metadata as { pricing?: Record<string, unknown> }).pricing || null
      : null;

    res.json({
      billingProfile: {
        ...profile,
        revenueSharePct: profile.revenueSharePct === null ? null : Number(profile.revenueSharePct),
      },
      pricing,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
