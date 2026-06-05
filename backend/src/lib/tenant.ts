import { PrismaClient, TenantMembership, TenantRole } from '@prisma/client';

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
  const license = await prisma.license.findUnique({
    where: { tenantId },
  });

  if (!license) {
    return {
      status: 'ACTIVE',
      plan: 'starter',
      expiresAt: null,
      issuedTo: SELF_HOSTED_LICENSE_KEY,
    };
  }

  if (license.status === 'SUSPENDED' || license.status === 'EXPIRED') {
    throw new Error(`License is ${license.status.toLowerCase()}`);
  }

  if (license.expiresAt && license.expiresAt.getTime() < Date.now()) {
    throw new Error('License is expired');
  }

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
