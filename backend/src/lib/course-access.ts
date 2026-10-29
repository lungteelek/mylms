import { PrismaClient } from '@prisma/client';

type MembershipPricingSnapshot = {
  packageId?: unknown;
  packageName?: unknown;
  includedCourseIds?: unknown;
  durationMonths?: unknown;
  compareAtPrice?: unknown;
  salePrice?: unknown;
};

export type PublicPackageOption = {
  id: string;
  name: string;
  durationMonths: number;
  compareAtPrice: number | null;
  salePrice: number | null;
  enabled: boolean;
  includedCourseIds: string[];
};

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function normalizeIncludedCourseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractMembershipSnapshot(snapshot: unknown): { includedCourseIds: string[]; durationMonths: number } | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const record = snapshot as MembershipPricingSnapshot;
  const includedCourseIds = normalizeIncludedCourseIds(record.includedCourseIds);
  const durationMonths = Math.max(1, Number(record.durationMonths || 0));
  if (!includedCourseIds.length || !Number.isFinite(durationMonths)) return null;
  return { includedCourseIds, durationMonths };
}

export async function getActivePackageCourseIds(prisma: PrismaClient, tenantId: number, userId: number) {
  const paidOrders = await prisma.studentOrder.findMany({
    where: {
      tenantId,
      userId,
      status: 'PAID',
    },
    select: {
      id: true,
      createdAt: true,
      pricingSnapshot: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const activeCourseIds = new Set<string>();
  const now = Date.now();

  for (const order of paidOrders) {
    const snapshot = extractMembershipSnapshot(order.pricingSnapshot);
    if (!snapshot) continue;
    const expiresAt = addMonths(order.createdAt, snapshot.durationMonths);
    if (expiresAt.getTime() < now) continue;
    for (const courseId of snapshot.includedCourseIds) {
      activeCourseIds.add(courseId);
    }
  }

  return [...activeCourseIds];
}

export function getPublicPackageOptionsFromPricing(pricing: unknown): PublicPackageOption[] {
  if (!pricing || typeof pricing !== 'object') return [];
  const rawOptions = Array.isArray((pricing as Record<string, unknown>).membershipOptions)
    ? (pricing as Record<string, unknown>).membershipOptions as Array<Record<string, unknown>>
    : [];

  return rawOptions
    .map((item, index) => ({
      id: String(item.id || `pkg-${index + 1}`),
      name: String(item.name || '').trim() || `แพ็ก ${index + 1}`,
      durationMonths: Math.max(1, Number(item.durationMonths || 1)),
      compareAtPrice: toNullableNumber(item.compareAtPrice),
      salePrice: toNullableNumber(item.salePrice),
      enabled: Boolean(item.enabled),
      includedCourseIds: normalizeIncludedCourseIds(item.includedCourseIds),
    }))
    .filter((item) => item.enabled && item.includedCourseIds.length > 0);
}

export async function syncPackageEnrollments(prisma: PrismaClient, tenantId: number, userId: number) {
  const activeCourseIds = await getActivePackageCourseIds(prisma, tenantId, userId);
  if (!activeCourseIds.length) return [];

  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      tenantId,
      userId,
      courseId: { in: activeCourseIds.map((courseId) => Number(courseId)).filter(Number.isFinite) },
    },
    select: { courseId: true },
  });
  const existingCourseIds = new Set(existingEnrollments.map((item) => String(item.courseId)));
  const missingCourseIds = activeCourseIds.filter((courseId) => !existingCourseIds.has(String(courseId)));

  for (const courseId of missingCourseIds) {
    const parsedCourseId = Number(courseId);
    if (!Number.isFinite(parsedCourseId)) continue;
    await prisma.enrollment.create({
      data: {
        tenantId,
        userId,
        courseId: parsedCourseId,
      },
    }).catch(() => null);
  }

  return activeCourseIds;
}

export async function userHasCourseAccess(params: {
  prisma: PrismaClient;
  tenantId: number;
  userId: number;
  courseId: number | string;
  role?: string;
}) {
  if (params.role === 'INSTRUCTOR' || params.role === 'ADMIN' || params.role === 'OWNER') {
    return { allowed: true, source: 'role' as const };
  }

  const normalizedCourseId = Number(params.courseId);
  if (!Number.isFinite(normalizedCourseId)) {
    return { allowed: false, source: 'none' as const };
  }

  const enrollment = await params.prisma.enrollment.findUnique({
    where: {
      tenantId_userId_courseId: {
        tenantId: params.tenantId,
        userId: params.userId,
        courseId: normalizedCourseId,
      },
    },
  });
  if (enrollment) {
    return { allowed: true, source: 'enrollment' as const, enrollment };
  }

  const activeCourseIds = await syncPackageEnrollments(params.prisma, params.tenantId, params.userId);
  if (activeCourseIds.includes(String(normalizedCourseId))) {
    const packageEnrollment = await params.prisma.enrollment.findUnique({
      where: {
        tenantId_userId_courseId: {
          tenantId: params.tenantId,
          userId: params.userId,
          courseId: normalizedCourseId,
        },
      },
    });
    return { allowed: true, source: 'package' as const, enrollment: packageEnrollment || null };
  }

  return { allowed: false, source: 'none' as const };
}
