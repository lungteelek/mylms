import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { PlatformRole, TenantRole } from '@prisma/client';
import prisma from '../lib/prisma';
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
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Inter, "Noto Sans Thai", system-ui, sans-serif;
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
    } = req.body as {
      name?: string;
      slug?: string;
      email?: string;
      password?: string;
      subdomain?: string;
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

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.organization.create({
        data: {
          name: cleanName,
          slug: cleanSlug,
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

      return { tenant, tutor };
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
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
