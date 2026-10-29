import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parseId } from '../utils/parseId';
import { syncPackageEnrollments } from '../lib/course-access';

const router = Router();

function toJsonValue(value: Record<string, unknown> | null | undefined) {
  return value === undefined || value === null ? undefined : (value as Prisma.InputJsonValue);
}

function normalizeCampaign(record: any) {
  if (!record) return null;
  return {
    ...record,
    discountValue: record.discountValue === null ? null : Number(record.discountValue),
    startsAt: record.startsAt || null,
    endsAt: record.endsAt || null,
  };
}

function calculateDiscount(grossAmountMinor: number, campaign: any | null) {
  if (!campaign) {
    return 0;
  }

  if (campaign.discountType === 'FREE') {
    return grossAmountMinor;
  }

  if (campaign.discountType === 'AMOUNT') {
    return Math.max(0, Math.min(grossAmountMinor, Number(campaign.discountAmountMinor || 0)));
  }

  if (campaign.discountType === 'PERCENT') {
    const pct = Math.max(0, Math.min(100, Number(campaign.discountValue || 0)));
    return Math.max(0, Math.round((grossAmountMinor * pct) / 100));
  }

  return 0;
}

function isDiscountActive(campaign: any) {
  const now = new Date();
  if (!campaign) return false;
  if (campaign.status !== 'ACTIVE') return false;
  if (campaign.startsAt && new Date(campaign.startsAt) > now) return false;
  if (campaign.endsAt && new Date(campaign.endsAt) < now) return false;
  return true;
}

function normalizeOrder(record: any) {
  if (!record) return null;
  return {
    ...record,
    grossAmountMinor: Number(record.grossAmountMinor || 0),
    discountAmountMinor: Number(record.discountAmountMinor || 0),
    netAmountMinor: Number(record.netAmountMinor || 0),
    providerSessionId: record.providerSessionId || null,
    providerPaymentId: record.providerPaymentId || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// สร้าง order จ่ายเงินจริงใน database สำหรับ flow นักเรียน
router.post('/create-session', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, couponCode } = req.body as { courseId?: string; couponCode?: string };
    const parsedCourseId = parseId(courseId);

    const course = await prisma.course.findFirst({
      where: {
        id: parsedCourseId,
        tenantId: req.user!.tenantId,
      },
      include: {
        pricing: {
          include: {
            billingProfile: true,
          },
        },
        discountCampaigns: {
          where: {
            status: 'ACTIVE',
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบบทเรียน' });
    }

    const pricing = course.pricing;
    const grossAmountMinor = Number(pricing?.priceMinor ?? 0);
    let campaign = null;
    if (couponCode?.trim()) {
      const code = couponCode.trim().toUpperCase();
      campaign = course.discountCampaigns.find((item) => {
        const itemCode = String(item.code || '').trim().toUpperCase();
        return itemCode === code && (item.courseId === null || Number(item.courseId) === Number(course.id));
      }) || null;
      if (!campaign || !isDiscountActive(campaign)) {
        return res.status(400).json({ error: 'คูปองนี้ใช้ไม่ได้หรือหมดอายุแล้ว' });
      }
    } else {
      campaign = course.discountCampaigns.find((item) => item.mode === 'AUTO' && isDiscountActive(item)) || null;
    }

    const discountAmountMinor = calculateDiscount(grossAmountMinor, campaign);
    const netAmountMinor = Math.max(0, grossAmountMinor - discountAmountMinor);
    const checkoutOwner = pricing?.billingProfile?.checkoutOwner || 'PLATFORM';
    const billingModel = pricing?.billingProfile?.billingModel || 'REVENUE_SHARE';
    const providerSessionId = `payment_session_${course.id}_${req.user!.userId}_${Date.now()}`;

    const order = await prisma.studentOrder.create({
      data: {
        tenantId: req.user!.tenantId,
        courseId: course.id,
        userId: req.user!.userId,
        billingModel,
        checkoutOwner,
        grossAmountMinor,
        discountAmountMinor,
        netAmountMinor,
        currency: pricing?.currency || 'THB',
        status: 'PENDING',
        providerSessionId,
        pricingSnapshot: {
          courseId: course.id,
          courseTitle: course.title,
          billingModel,
          checkoutOwner,
          priceMinor: grossAmountMinor,
          compareAtPriceMinor: pricing?.compareAtPriceMinor ?? null,
          couponCode: couponCode?.trim().toUpperCase() || campaign?.code || null,
          discountCampaignId: campaign?.id || null,
          discountType: campaign?.discountType || null,
          discountAmountMinor,
          netAmountMinor,
          instructor: course.instructor,
        },
        metadata: toJsonValue({
          couponCode: couponCode?.trim().toUpperCase() || null,
          billingProfileId: pricing?.billingProfile?.id || null,
          source: 'student-web',
        }),
      },
    });

    res.status(201).json({
      sessionId: order.providerSessionId,
      orderId: order.id,
      courseTitle: course.title,
      amount: netAmountMinor / 100,
      amountMinor: netAmountMinor,
      discountAmountMinor,
      grossAmountMinor,
      currency: order.currency,
      couponCode: couponCode?.trim().toUpperCase() || campaign?.code || null,
      campaign: normalizeCampaign(campaign),
      pricing: pricing
        ? {
            priceMinor: pricing.priceMinor,
            compareAtPriceMinor: pricing.compareAtPriceMinor,
            currency: pricing.currency,
            showPricePublicly: pricing.showPricePublicly,
            allowCoupons: pricing.allowCoupons,
            allowPromotions: pricing.allowPromotions,
          }
        : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ยืนยันการจ่ายและลงทะเบียนผู้เรียน
router.post('/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, sessionId } = req.body as { courseId?: string; sessionId?: string };
    const userId = req.user?.userId;
    const parsedCourseId = parseId(courseId);

    if (!userId) return res.status(401).json({ error: 'ไม่ได้รับอนุญาต' });

    // ตรวจ sessionId แบบจำลอง
    if (!sessionId || !sessionId.startsWith('payment_session_')) {
      return res.status(400).json({ error: 'session ID ไม่ถูกต้อง' });
    }

    const order = await prisma.studentOrder.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        courseId: parsedCourseId,
        userId,
        providerSessionId: sessionId,
      },
      include: {
        discountRedemptions: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        tenantId_userId_courseId: {
          tenantId: req.user!.tenantId,
          userId,
          courseId: parsedCourseId,
        },
      }
    });

    if (existing) {
      const updatedOrder = order.status === 'PAID'
        ? order
        : await prisma.studentOrder.update({
            where: { id: order.id },
            data: {
              status: 'PAID',
              providerPaymentId: order.providerPaymentId || sessionId,
            },
          });
      return res.status(200).json({
        message: 'ลงทะเบียนแล้ว',
        enrollment: existing,
        order: updatedOrder,
      });
    }

    const campaignCode = typeof order.pricingSnapshot === 'object' && order.pricingSnapshot && 'couponCode' in order.pricingSnapshot
      ? String((order.pricingSnapshot as Record<string, unknown>).couponCode || '')
      : '';
    const campaign = campaignCode
      ? await prisma.discountCampaign.findFirst({
          where: {
            tenantId: req.user!.tenantId,
            courseId: parsedCourseId,
            code: campaignCode,
          },
        })
      : null;

    const packageIncludedCourseIds = typeof order.pricingSnapshot === 'object' && order.pricingSnapshot && 'includedCourseIds' in order.pricingSnapshot
      ? Array.from(new Set((((order.pricingSnapshot as Record<string, unknown>).includedCourseIds as unknown[]) || [])
          .map((value) => String(value).trim())
          .filter(Boolean)))
      : [];
    const entitlementCourseIds = packageIncludedCourseIds.length
      ? packageIncludedCourseIds.map((value) => Number(value)).filter(Number.isFinite)
      : [parsedCourseId];

    const enrollment = await prisma.$transaction(async (tx) => {
      let primaryEnrollment = null as any;
      for (const entitledCourseId of entitlementCourseIds) {
        const createdEnrollment = await tx.enrollment.upsert({
          where: {
            tenantId_userId_courseId: {
              tenantId: req.user!.tenantId,
              userId,
              courseId: entitledCourseId,
            },
          },
          update: {},
          create: {
            tenantId: req.user!.tenantId,
            userId,
            courseId: entitledCourseId,
          },
        });
        if (!primaryEnrollment || entitledCourseId === parsedCourseId) {
          primaryEnrollment = createdEnrollment;
        }
      }

      if (campaign && !order.discountRedemptions.length) {
        await tx.discountRedemption.create({
          data: {
            tenantId: req.user!.tenantId,
            campaignId: campaign.id,
            userId,
            orderId: order.id,
            enrollmentId: primaryEnrollment.id,
            discountAmountMinor: order.discountAmountMinor,
            currency: order.currency,
            metadata: {
              sessionId,
            },
          },
        });
      }

      await tx.studentOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          providerPaymentId: order.providerPaymentId || sessionId,
          pricingSnapshot: order.pricingSnapshot as Prisma.InputJsonValue,
        },
      });

      return primaryEnrollment;
    });

    await syncPackageEnrollments(prisma, req.user!.tenantId, userId);

    const updatedOrder = await prisma.studentOrder.findUnique({
      where: { id: order.id },
      include: {
        discountRedemptions: true,
      },
    });

    res.status(201).json({
      message: 'ยืนยันการจ่ายเงินและลงทะเบียนสำเร็จ',
      enrollment,
      order: updatedOrder,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my/orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.studentOrder.findMany({
      where: {
        tenantId: req.user!.tenantId,
        userId: req.user!.userId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            slug: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
        discountRedemptions: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                code: true,
                discountType: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    res.json({
      total: orders.length,
      orders: orders.map((order) => ({
        ...normalizeOrder(order),
        course: order.course,
        discountRedemptions: order.discountRedemptions.map((redemption) => ({
          ...redemption,
          discountAmountMinor: redemption.discountAmountMinor === null ? null : Number(redemption.discountAmountMinor),
        })),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
