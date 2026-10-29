import { LicenseStatus, PrismaClient, TenantMembership, TenantRole } from '@prisma/client';
import { getEffectiveTutorPricing, loadPricingConfig } from './pricing';

const SELF_HOSTED_LICENSE_KEY = process.env.SELF_HOSTED_LICENSE_KEY || 'self-hosted';

export async function requireTenantBySlug(prisma: PrismaClient, slug: string) {
  const tenant = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
}

export async function getMembershipForTenant(
  prisma: PrismaClient,
  userId: number,
  tenantId: number,
): Promise<TenantMembership | null> {
  return prisma.tenantMembership.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
  });
}

export async function getDefaultMembership(prisma: PrismaClient, userId: number) {
  return prisma.tenantMembership.findFirst({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    include: { tenant: true },
  });
}

export async function ensureTenantLicense(prisma: PrismaClient, tenantId: number) {
  let license = await prisma.license.findUnique({
    where: { tenantId },
  });

  if (!license) {
    const tenant = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const pricingConfig = await loadPricingConfig();
    const effectivePricing = getEffectiveTutorPricing(pricingConfig, tenant.slug);
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + effectivePricing.renewalIntervalMonths);

    license = await prisma.license.create({
      data: {
        tenantId,
        status: LicenseStatus.TRIAL,
        plan: effectivePricing.packageId,
        expiresAt: renewalDate,
        issuedTo: tenant.name || SELF_HOSTED_LICENSE_KEY,
        metadata: {
          pricing: {
            packageId: effectivePricing.packageId,
            monthlyFee: effectivePricing.package.monthlyFee,
            revenueSharePct: effectivePricing.package.revenueSharePct,
            videoQuotaGb: effectivePricing.package.videoQuotaGb,
            promoFreeMonths: effectivePricing.promoFreeMonths,
            promoEnabled: effectivePricing.promoEnabled,
            renewalIntervalMonths: effectivePricing.renewalIntervalMonths,
          },
        },
      },
    });
  }

  // License enforcement is temporarily disabled. Keep the record available
  // for legacy pricing/metadata compatibility, but do not block educator or
  // student requests based on status or expiry.
  return license;
}

export async function getTenantFeatureMap(prisma: PrismaClient, tenantId: number) {
  const flags = await prisma.featureFlag.findMany({
    where: { tenantId },
  });

  return flags.reduce<Record<string, boolean>>((acc, flag) => {
    acc[flag.key] = flag.enabled;
    return acc;
  }, {});
}

export function isInstructorRole(role?: string) {
  return role === TenantRole.INSTRUCTOR || role === TenantRole.ADMIN || role === TenantRole.OWNER;
}
