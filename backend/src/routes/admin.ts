import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { LicenseStatus, PlatformRole, Prisma, TenantRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { getEffectiveTutorPricing, getPricingPackage, loadPricingConfig, savePricingConfig, type PricingConfig, type PricingPackageId } from '../lib/pricing';
import { isInstructorRole } from '../lib/tenant';
import { authenticate, AuthRequest } from '../middleware/auth';
import { slugify } from '../utils/slugify';

const router = Router();

const RESERVED_TUTOR_SLUG_PARTS = [
  'admin',
  'administrator',
  'mail',
  'email',
  'webmaster',
  'root',
  'system',
  'sys',
  'support',
  'help',
  'billing',
  'payment',
  'payments',
  'api',
  'app',
  'console',
  'login',
  'auth',
  'secure',
  'portal',
  'dashboard',
  'status',
  'internal',
  'backend',
  'frontend',
  'server',
  'nginx',
  'www',
  'ftp',
  'smtp',
  'imap',
  'pop3',
  'noreply',
  'no-reply',
  'postmaster',
  'hostmaster',
  'abuse',
  'security',
  'contact',
  'info',
  'demo',
  'test',
  'staging',
  'dev',
  'beta',
];

function buildReservedTutorSlugMessage() {
  return 'ชื่อย่อใน URL ห้ามใช้คำระบบหรือคำคล้ายระบบ เช่น admin, mail, webmaster, support, api, login, auth, portal, dashboard';
}

function normalizeTutorSlugInput(value: string) {
  return String(value || '').trim().toLowerCase();
}

function toJsonValue(value: Record<string, unknown> | null | undefined) {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function validateTutorSlugInput(value: string) {
  const slug = normalizeTutorSlugInput(value);
  if (slug.length < 4) {
    return 'ชื่อย่อใน URL ต้องมีอย่างน้อย 4 ตัวอักษร';
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'ชื่อย่อใน URL ใช้ได้เฉพาะ a-z, 0-9 และ -';
  }
  if (/^-|-$/.test(slug)) {
    return 'ชื่อย่อใน URL ห้ามขึ้นต้นหรือลงท้ายด้วย -';
  }
  if (RESERVED_TUTOR_SLUG_PARTS.some((part) => slug === part || slug.includes(part))) {
    return buildReservedTutorSlugMessage();
  }
  return null;
}

function buildDefaultLandingPage(tenantName: string) {
  const safeTitle = tenantName || 'CourseChic';
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} | CourseChic</title>
  <meta name="description" content="Smart Learning Platform for Future Success" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --panel: rgba(12, 20, 36, 0.86);
      --panel-border: rgba(148, 163, 184, 0.18);
      --text: #eff6ff;
      --muted: #a7b4c9;
      --accent: #7dd3fc;
      --accent-2: #34d399;
    }
    @font-face {
      font-family: 'Sarabun';
      src: url('/fonts/Sarabun-Light.ttf') format('truetype');
      font-weight: 300;
      font-style: normal;
    }
    @font-face {
      font-family: 'Sarabun';
      src: url('/fonts/Sarabun-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Sarabun';
      src: url('/fonts/Sarabun-Bold.ttf') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Sarabun, "Noto Sans Thai", system-ui, sans-serif;
      background:
        radial-gradient(circle at top, rgba(56, 189, 248, 0.22), transparent 32%),
        radial-gradient(circle at 20% 20%, rgba(52, 211, 153, 0.16), transparent 28%),
        linear-gradient(180deg, #050816 0%, #08111f 42%, #0b1220 100%);
      color: var(--text);
      display: grid;
      place-items: center;
      padding: 32px;
    }
    .card {
      width: min(960px, 100%);
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 28px;
      padding: clamp(28px, 5vw, 60px);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(14px);
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
      gap: 24px;
      align-items: start;
    }
    .eyebrow {
      display: inline-flex;
      border: 1px solid rgba(125, 211, 252, 0.35);
      background: rgba(14, 165, 233, 0.12);
      color: var(--accent);
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 0.88rem;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    h1 {
      margin: 18px 0 10px;
      font-size: clamp(2.6rem, 8vw, 5rem);
      line-height: 0.95;
      letter-spacing: -0.05em;
    }
    p {
      margin: 0;
      color: var(--muted);
      font-size: clamp(1rem, 2vw, 1.15rem);
      line-height: 1.7;
      max-width: 58ch;
    }
    .cta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 18px;
      border-radius: 999px;
      font-weight: 700;
      text-decoration: none;
      border: 1px solid transparent;
      transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn.primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #04111f;
    }
    .btn.secondary {
      background: rgba(148, 163, 184, 0.08);
      color: var(--text);
      border-color: rgba(148, 163, 184, 0.18);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 32px;
    }
    .side-panel {
      display: grid;
      gap: 16px;
    }
    .notice, .contact {
      border-radius: 24px;
      padding: 22px;
      background: rgba(148, 163, 184, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }
    .notice strong, .contact strong, .course-card strong {
      display: block;
      font-size: 1.05rem;
      margin-bottom: 8px;
    }
    .notice span, .contact span, .course-card span, .course-card small {
      color: var(--muted);
      line-height: 1.55;
      font-size: 0.96rem;
    }
    .contact a { color: var(--accent); text-decoration: none; }
    .box {
      border-radius: 20px;
      padding: 18px;
      background: rgba(148, 163, 184, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }
    .course-card {
      border-radius: 24px;
      padding: 22px;
      background: rgba(8, 17, 31, 0.6);
      border: 1px solid rgba(125, 211, 252, 0.14);
      min-height: 170px;
      display: grid;
      gap: 12px;
    }
    .course-meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 12px;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(125, 211, 252, 0.18);
      color: var(--accent);
      font-size: 0.83rem;
    }
    .course-card small {
      display: block;
    }
    .footer {
      margin-top: 28px;
      color: rgba(239, 246, 255, 0.55);
      font-size: 0.9rem;
    }
    @media (max-width: 760px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="hero">
      <section>
        <span class="eyebrow">Coming Soon!!!</span>
        <h1>Smart Learning Platform for Future Success</h1>
        <p>${safeTitle} กำลังเตรียมเส้นทางการเรียนรู้แบบใหม่ให้พร้อมใช้งาน ทั้งคอร์ส, แผนเรียน, และประสบการณ์ที่ออกแบบมาเพื่อการเติบโตของผู้เรียน.</p>
        <div class="cta-row">
          <a class="btn primary" href="#courses">ดูคอร์สเร็ว ๆ นี้</a>
          <a class="btn secondary" href="#contact">ติดต่อทีมสอน</a>
        </div>
      </section>
      <aside class="side-panel">
        <div class="notice">
          <strong>สิ่งที่กำลังจะมา</strong>
          <span>หน้า public นี้จะใช้เป็น landing page หลักของบัญชีองค์กรสำหรับสมัครเรียน, ดูไฮไลต์คอร์ส, และพาไปสู่การเริ่มต้นที่ชัดเจนกว่าเดิม</span>
        </div>
        <div class="contact" id="contact">
          <strong>ติดต่อ</strong>
          <span>อีเมล: <a href="mailto:hello@coursechic.com">hello@coursechic.com</a><br/>Line: @coursechic</span>
        </div>
      </aside>
    </div>
    <section class="grid" id="courses" aria-label="course-cards">
      <article class="course-card">
        <div class="course-meta">
          <span class="tag">Live class</span>
          <span class="tag">Beginner</span>
        </div>
        <strong>คอร์สเริ่มต้นสำหรับผู้เรียนใหม่</strong>
        <small>แนะนำเส้นทางแบบเป็นขั้นตอน พร้อมแผนเรียนที่ช่วยให้เริ่มได้เร็วและไม่หลงทาง</small>
      </article>
      <article class="course-card">
        <div class="course-meta">
          <span class="tag">Self-paced</span>
          <span class="tag">AI tutor</span>
        </div>
        <strong>เรียนด้วย AI tutor และฐานความรู้</strong>
        <small>ผู้เรียนเข้าถึงคำอธิบาย, ทรานสคริปต์, และการทบทวนได้จากระบบเดียว</small>
      </article>
      <article class="course-card">
        <div class="course-meta">
          <span class="tag">Community</span>
          <span class="tag">Mentor</span>
        </div>
        <strong>พื้นที่เรียนรู้ที่เติบโตไปพร้อมกัน</strong>
        <small>เชื่อมผู้เรียนเข้ากับครู, ทีมงาน, และการประกาศสำคัญได้จากหน้าเดียว</small>
      </article>
    </section>
    <div class="footer">CourseChic • Smart Learning Platform for Future Success</div>
  </main>
</body>
</html>`;
}

function isAdminRole(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

router.get('/students', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId: req.user!.tenantId,
        role: 'STUDENT',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            enrollments: {
              where: {
                tenantId: req.user!.tenantId,
              },
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
              orderBy: {
                updatedAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const students = memberships.map((membership) => {
      const enrollments = membership.user.enrollments;
      const progress =
        enrollments.length === 0
          ? 0
          : Math.round(enrollments.reduce((total, enrollment) => total + enrollment.progress, 0) / enrollments.length);
      const latestEnrollment = enrollments[0];
      const startDate = membership.user.createdAt;
      const renewalDue = new Date(startDate);
      renewalDue.setDate(renewalDue.getDate() + 90);

      const status =
        progress >= 70 || startDate.getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000
          ? 'Active'
          : progress >= 30
            ? 'Expiring'
            : 'Expired';

      return {
        id: membership.user.id,
        name: membership.user.name || membership.user.email,
        email: membership.user.email,
        status,
        progress,
        startDate,
        renewalDue,
        courseCount: enrollments.length,
        latestCourse: latestEnrollment?.course?.title || null,
        courses: enrollments.map((enrollment) => ({
          id: enrollment.course.id,
          title: enrollment.course.title,
          progress: enrollment.progress,
        })),
      };
    });

    res.json({
      total: students.length,
      active: students.filter((student) => student.status === 'Active').length,
      expiring: students.filter((student) => student.status === 'Expiring').length,
      expired: students.filter((student) => student.status === 'Expired').length,
      students,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tutors', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const memberships = await prisma.tenantMembership.findMany({
      where: {
        role: 'OWNER',
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            platformRole: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const tutors = memberships.map((membership) => ({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        createdAt: membership.tenant.createdAt,
        url: `https://${membership.tenant.slug}.${process.env.APP_DOMAIN || 'coursechic.com'}/`,
      },
      tutor: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        platformRole: membership.user.platformRole,
        createdAt: membership.user.createdAt,
      },
      role: membership.role,
    }));

    res.json({
      total: tutors.length,
      tutors,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pricing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const config = await loadPricingConfig();
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        role: 'OWNER',
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const tenantBySlug = new Map(memberships.map((membership) => [membership.tenant.slug, membership.tenant] as const));
    const overrides = config.overrides
      .map((override) => ({
        ...override,
        tenant: tenantBySlug.get(override.tenantSlug) || null,
        effectivePackage: getPricingPackage(config, override.packageId),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    res.json({
      updatedAt: config.updatedAt,
      defaults: config.defaults,
      overrides,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/pricing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const body = req.body as Partial<PricingConfig>;
    const saved = await savePricingConfig(body);
    res.json({
      updatedAt: saved.updatedAt,
      defaults: saved.defaults,
      overrides: saved.overrides,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/billing/profiles', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const profiles = await prisma.tutorBillingProfile.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    res.json({
      total: profiles.length,
      profiles: profiles.map((profile) => ({
        ...profile,
        revenueSharePct: profile.revenueSharePct === null ? null : Number(profile.revenueSharePct),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/billing/profiles/:tenantSlug', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const tenantSlug = String(req.params.tenantSlug || '').trim().toLowerCase();
    const tenant = await prisma.organization.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: 'ไม่พบ tenant' });
    }

    const body = req.body as {
      billingModel?: 'MONTHLY' | 'REVENUE_SHARE';
      checkoutOwner?: 'PLATFORM' | 'TUTOR';
      studentAccountMode?: 'PLATFORM_MANAGED' | 'TUTOR_MANAGED';
      monthlyFeeMinor?: number | string | null;
      revenueSharePct?: number | string | null;
      settlementDelayDays?: number | string | null;
      currency?: string;
      active?: boolean;
      notes?: string;
      metadata?: Record<string, unknown> | null;
    };

    const profile = await prisma.tutorBillingProfile.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        billingModel: body.billingModel || 'REVENUE_SHARE',
        checkoutOwner: body.checkoutOwner || 'PLATFORM',
        studentAccountMode: body.studentAccountMode || 'PLATFORM_MANAGED',
        monthlyFeeMinor: body.monthlyFeeMinor === null || body.monthlyFeeMinor === undefined || body.monthlyFeeMinor === '' ? null : Number(body.monthlyFeeMinor),
        revenueSharePct: body.revenueSharePct === null || body.revenueSharePct === undefined || body.revenueSharePct === '' ? null : Number(body.revenueSharePct),
        settlementDelayDays: body.settlementDelayDays === null || body.settlementDelayDays === undefined || body.settlementDelayDays === '' ? 7 : Number(body.settlementDelayDays),
        currency: String(body.currency || 'THB'),
        active: body.active ?? true,
        notes: body.notes?.trim() || null,
        metadata: toJsonValue(body.metadata),
      },
      update: {
        billingModel: body.billingModel || undefined,
        checkoutOwner: body.checkoutOwner || undefined,
        studentAccountMode: body.studentAccountMode || undefined,
        monthlyFeeMinor: body.monthlyFeeMinor === null || body.monthlyFeeMinor === undefined || body.monthlyFeeMinor === '' ? null : Number(body.monthlyFeeMinor),
        revenueSharePct: body.revenueSharePct === null || body.revenueSharePct === undefined || body.revenueSharePct === '' ? null : Number(body.revenueSharePct),
        settlementDelayDays: body.settlementDelayDays === null || body.settlementDelayDays === undefined || body.settlementDelayDays === '' ? undefined : Number(body.settlementDelayDays),
        currency: body.currency?.trim() || undefined,
        active: body.active ?? undefined,
        notes: body.notes?.trim() ?? undefined,
        metadata: body.metadata === undefined ? undefined : toJsonValue(body.metadata),
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json({
      billingProfile: {
        ...profile,
        revenueSharePct: profile.revenueSharePct === null ? null : Number(profile.revenueSharePct),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/courses/:courseId/pricing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = Number(req.params.courseId);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        pricing: true,
        discountCampaigns: {
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    res.json({
      course: {
        id: course.id,
        title: course.title,
        tenant: course.tenant,
      },
      pricing: course.pricing
        ? {
            ...course.pricing,
            priceMinor: course.pricing.priceMinor,
            compareAtPriceMinor: course.pricing.compareAtPriceMinor,
          }
        : null,
      discounts: course.discountCampaigns.map((discount) => ({
        ...discount,
        discountValue: discount.discountValue === null ? null : Number(discount.discountValue),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/courses/:courseId/pricing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = Number(req.params.courseId);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, tenantId: true, title: true },
    });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    const body = req.body as {
      priceMinor?: number | string;
      compareAtPriceMinor?: number | string | null;
      currency?: string;
      allowCoupons?: boolean;
      allowPromotions?: boolean;
      showPricePublicly?: boolean;
      salesStartsAt?: string | null;
      salesEndsAt?: string | null;
      metadata?: Record<string, unknown> | null;
    };

    const pricing = await prisma.coursePricing.upsert({
      where: { courseId },
      create: {
        tenantId: course.tenantId,
        courseId,
        priceMinor: Number(body.priceMinor || 0),
        compareAtPriceMinor: body.compareAtPriceMinor === null || body.compareAtPriceMinor === undefined || body.compareAtPriceMinor === '' ? null : Number(body.compareAtPriceMinor),
        currency: String(body.currency || 'THB'),
        allowCoupons: body.allowCoupons ?? true,
        allowPromotions: body.allowPromotions ?? true,
        showPricePublicly: body.showPricePublicly ?? true,
        salesStartsAt: body.salesStartsAt ? new Date(body.salesStartsAt) : null,
        salesEndsAt: body.salesEndsAt ? new Date(body.salesEndsAt) : null,
        metadata: toJsonValue(body.metadata),
      },
      update: {
        priceMinor: Number(body.priceMinor || 0),
        compareAtPriceMinor: body.compareAtPriceMinor === null || body.compareAtPriceMinor === undefined || body.compareAtPriceMinor === '' ? null : Number(body.compareAtPriceMinor),
        currency: body.currency?.trim() || undefined,
        allowCoupons: body.allowCoupons ?? undefined,
        allowPromotions: body.allowPromotions ?? undefined,
        showPricePublicly: body.showPricePublicly ?? undefined,
        salesStartsAt: body.salesStartsAt === null ? null : body.salesStartsAt ? new Date(body.salesStartsAt) : undefined,
        salesEndsAt: body.salesEndsAt === null ? null : body.salesEndsAt ? new Date(body.salesEndsAt) : undefined,
        metadata: body.metadata === undefined ? undefined : toJsonValue(body.metadata),
      },
    });

    res.json({
      course: {
        id: course.id,
        title: course.title,
      },
      pricing,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/courses/:courseId/discounts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courseId = Number(req.params.courseId);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, tenantId: true, title: true },
    });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    const body = req.body as {
      mode?: 'AUTO' | 'CODE';
      code?: string | null;
      name?: string;
      description?: string | null;
      discountType?: 'PERCENT' | 'AMOUNT' | 'FREE';
      discountValue?: number | string | null;
      discountAmountMinor?: number | string | null;
      currency?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
      stackable?: boolean;
      priority?: number | string;
      maxRedemptions?: number | string | null;
      maxRedemptionsPerStudent?: number | string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      metadata?: Record<string, unknown> | null;
    };

    const campaign = await prisma.discountCampaign.create({
      data: {
        tenantId: course.tenantId,
        courseId,
        mode: body.mode || 'AUTO',
        code: body.code?.trim().toUpperCase() || null,
        name: body.name?.trim() || 'New discount campaign',
        description: body.description?.trim() || null,
        discountType: body.discountType || 'PERCENT',
        discountValue: body.discountValue === null || body.discountValue === undefined || body.discountValue === '' ? null : Number(body.discountValue),
        discountAmountMinor: body.discountAmountMinor === null || body.discountAmountMinor === undefined || body.discountAmountMinor === '' ? null : Number(body.discountAmountMinor),
        currency: String(body.currency || 'THB'),
        status: body.status || 'DRAFT',
        stackable: body.stackable ?? false,
        priority: body.priority === null || body.priority === undefined || body.priority === '' ? 0 : Number(body.priority),
        maxRedemptions: body.maxRedemptions === null || body.maxRedemptions === undefined || body.maxRedemptions === '' ? null : Number(body.maxRedemptions),
        maxRedemptionsPerStudent: body.maxRedemptionsPerStudent === null || body.maxRedemptionsPerStudent === undefined || body.maxRedemptionsPerStudent === '' ? null : Number(body.maxRedemptionsPerStudent),
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        metadata: toJsonValue(body.metadata),
      },
    });

    res.status(201).json({
      campaign: {
        ...campaign,
        discountValue: campaign.discountValue === null ? null : Number(campaign.discountValue),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tutors', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const {
      name,
      slug,
      email,
      password = 'password123',
      subdomain,
      packageId,
    } = req.body as {
      name?: string;
      slug?: string;
      email?: string;
      password?: string;
      subdomain?: string;
      packageId?: string;
    };

    const cleanName = String(name || '').trim();
    const rawSlugInput = String(slug || subdomain || '').trim();
    const cleanSlug = slugify(rawSlugInput || cleanName);
    const tutorEmail = String(email || `${cleanSlug}@coursechic.com`).trim().toLowerCase();
    if (!cleanName || !cleanSlug) {
      return res.status(400).json({ error: 'ต้องระบุชื่อ tutor และชื่อย่อใน URL' });
    }
    if (cleanName.length < 4) {
      return res.status(400).json({ error: 'ชื่อ tutor ต้องมีอย่างน้อย 4 ตัวอักษร' });
    }
    const slugError = validateTutorSlugInput(rawSlugInput || cleanSlug);
    if (slugError) {
      return res.status(400).json({ error: slugError });
    }

    const existingTenant = await prisma.organization.findUnique({ where: { slug: cleanSlug } });
    if (existingTenant) {
      return res.status(400).json({ error: 'ชื่อย่อใน URL นี้ถูกใช้แล้ว กรุณาเลือกชื่อใหม่' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: tutorEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'อีเมล tutor นี้ถูกใช้แล้ว กรุณาใช้อีเมลอื่น' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const pricingConfig = await loadPricingConfig();
    const effectivePricing = getEffectiveTutorPricing(pricingConfig, cleanSlug, packageId as PricingPackageId | undefined);
    const packageConfig = effectivePricing.package;
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + effectivePricing.renewalIntervalMonths);
    const defaultBillingModel = packageConfig.revenueSharePct === null ? 'MONTHLY' : 'REVENUE_SHARE';
    const billingModel = (req.body?.billingModel || defaultBillingModel) as 'MONTHLY' | 'REVENUE_SHARE';
    const checkoutOwner = (req.body?.checkoutOwner || (billingModel === 'MONTHLY' ? 'TUTOR' : 'PLATFORM')) as 'PLATFORM' | 'TUTOR';
    const studentAccountMode = (req.body?.studentAccountMode || (billingModel === 'MONTHLY' ? 'TUTOR_MANAGED' : 'PLATFORM_MANAGED')) as 'PLATFORM_MANAGED' | 'TUTOR_MANAGED';

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.organization.create({
        data: {
          name: cleanName,
          slug: cleanSlug,
        },
      });

      const billingProfile = await tx.tutorBillingProfile.create({
        data: {
          tenantId: tenant.id,
          billingModel,
          checkoutOwner,
          studentAccountMode,
          monthlyFeeMinor: packageConfig.monthlyFee === null ? null : Math.round(packageConfig.monthlyFee * 100),
          revenueSharePct: packageConfig.revenueSharePct === null ? null : Number(packageConfig.revenueSharePct),
          settlementDelayDays: billingModel === 'MONTHLY' ? 0 : 7,
          currency: 'THB',
          active: true,
          notes: packageConfig.note,
          metadata: {
            packageId: packageConfig.id,
            promoFreeMonths: effectivePricing.promoFreeMonths,
            promoEnabled: effectivePricing.promoEnabled,
            renewalIntervalMonths: effectivePricing.renewalIntervalMonths,
          },
        },
      });

      await tx.license.create({
        data: {
          tenantId: tenant.id,
          status: LicenseStatus.TRIAL,
          plan: packageConfig.id,
          expiresAt: renewalDate,
          issuedTo: cleanName,
          metadata: {
            pricing: {
              packageId: packageConfig.id,
              monthlyFee: packageConfig.monthlyFee,
              revenueSharePct: packageConfig.revenueSharePct,
              videoQuotaGb: packageConfig.videoQuotaGb,
              promoFreeMonths: effectivePricing.promoFreeMonths,
              promoEnabled: effectivePricing.promoEnabled,
              renewalIntervalMonths: effectivePricing.renewalIntervalMonths,
              billingModel,
              checkoutOwner,
              studentAccountMode,
            },
          },
        },
      });

      const tutor = await tx.user.create({
        data: {
          email: tutorEmail,
          name: cleanName,
          password: hashedPassword,
          platformRole: PlatformRole.USER,
        },
      });

      await tx.tenantMembership.create({
        data: {
          userId: tutor.id,
          tenantId: tenant.id,
          role: TenantRole.OWNER,
          isDefault: true,
        },
      });

      const tenantLandingDir = path.join(process.cwd(), 'uploads', 'landing-pages', tenant.slug);
      fs.mkdirSync(tenantLandingDir, { recursive: true });
      fs.writeFileSync(path.join(tenantLandingDir, 'index.html'), buildDefaultLandingPage(tenant.name), 'utf8');

      if (tenant.slug === 'tutortan') {
        fs.mkdirSync(path.join(tenantLandingDir, 'assets'), { recursive: true });
      }

      return { tenant, tutor, billingProfile };
    });

    const wildCardHost = `${cleanSlug}.${process.env.APP_DOMAIN || 'coursechic.com'}`;

    res.status(201).json({
      data: {
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          url: `https://${wildCardHost}`,
        },
        tutor: {
          id: result.tutor.id,
          email: result.tutor.email,
          name: result.tutor.name,
        },
      },
      pricing: {
        packageId: packageConfig.id,
        monthlyFee: packageConfig.monthlyFee,
        revenueSharePct: packageConfig.revenueSharePct,
        videoQuotaGb: packageConfig.videoQuotaGb,
        promoFreeMonths: effectivePricing.promoFreeMonths,
        renewalIntervalMonths: effectivePricing.renewalIntervalMonths,
        expiresAt: renewalDate,
        billingModel: result.billingProfile.billingModel,
        checkoutOwner: result.billingProfile.checkoutOwner,
        studentAccountMode: result.billingProfile.studentAccountMode,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
