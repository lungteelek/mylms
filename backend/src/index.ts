import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import type { Router } from 'express';
import { authenticate, AuthRequest } from './middleware/auth';
import prisma from './lib/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '../public');
const uploadsDir = path.join(__dirname, '../uploads');
const landingPagesDir = path.join(uploadsDir, 'landing-pages');

app.use(cors());
app.use(express.json());

function getTenantSlugFromHost(req: Request) {
  const hostHeader = req.headers.host?.toString() || '';
  const appDomain = (process.env.APP_DOMAIN || 'coursechic.com').toLowerCase();
  const hostName = hostHeader.split(':')[0].toLowerCase();
  if (!hostName.endsWith(`.${appDomain}`) || hostName === appDomain) {
    return null;
  }
  return hostName.slice(0, -(appDomain.length + 1));
}

function shouldTryTenantLandingPage(req: Request) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }
  if (!req.accepts('html')) {
    return false;
  }
  const ext = path.extname(req.path || '').toLowerCase();
  if (ext && ext !== '.html') {
    return false;
  }
  const appPages = [
    '/admin-app.html',
    '/admin-app',
    '/student-app.html',
    '/student-app',
    '/platform-console.html',
    '/platform-console',
    '/index.html',
  ];
  if (appPages.includes(req.path)) {
    return false;
  }
  const reservedPrefixes = ['/api/', '/uploads/', '/health', '/debug/'];
  if (reservedPrefixes.some((prefix) => req.path.startsWith(prefix))) {
    return false;
  }
  if (req.path === '/favicon.ico' || req.path === '/robots.txt') {
    return false;
  }
  return true;
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
      width: min(1100px, 100%);
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 28px;
      padding: clamp(28px, 5vw, 60px);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(14px);
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr);
      gap: 28px;
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
      margin: 18px 0 12px;
      font-size: clamp(2.7rem, 8vw, 5.4rem);
      line-height: 0.92;
      letter-spacing: -0.06em;
    }
    p {
      margin: 0;
      color: var(--muted);
      font-size: clamp(1rem, 2vw, 1.15rem);
      line-height: 1.75;
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
    }
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
    .side-panel { display: grid; gap: 16px; }
    .notice, .contact, .course-card {
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
    .course-card {
      min-height: 180px;
      display: grid;
      gap: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 28px;
    }
    .info-card {
      border-radius: 24px;
      padding: 22px;
      background: rgba(148, 163, 184, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.14);
      display: grid;
      gap: 10px;
    }
    .info-card strong {
      display: block;
      font-size: 1.05rem;
    }
    .info-card p, .info-card ul {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
      font-size: 0.96rem;
    }
    .info-card ul {
      padding-left: 1.1rem;
    }
    .course-meta { display: flex; flex-wrap: wrap; gap: 10px; }
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
    .footer {
      margin-top: 28px;
      color: rgba(239, 246, 255, 0.55);
      font-size: 0.9rem;
    }
    @media (max-width: 880px) {
      .layout, .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="layout">
      <section>
        <span class="eyebrow">Coming Soon!!!</span>
        <h1>Smart Learning Platform for Future Success</h1>
        <p>${safeTitle} กำลังเตรียมเส้นทางการเรียนรู้แบบใหม่ให้พร้อมใช้งาน ทั้งคอร์ส, แผนเรียน, และประสบการณ์ที่ออกแบบมาเพื่อการเติบโตของผู้เรียน.</p>
        <div class="cta-row">
          <a class="btn primary" href="/enroll">สมัครเรียน</a>
          <a class="btn secondary" href="#courses">ดูคอร์สเร็ว ๆ นี้</a>
          <a class="btn secondary" href="#contact">ติดต่อทีมสอน</a>
        </div>
      </section>
      <aside class="side-panel">
        <div class="notice">
          <strong>สิ่งที่กำลังจะมา</strong>
          <span>Landing page นี้จะใช้เป็นหน้าต้อนรับผู้เรียนของบัญชีองค์กร พร้อมเชื่อมต่อสู่การสมัครเรียนในอนาคต</span>
        </div>
        <div class="contact" id="contact">
          <strong>ติดต่อ</strong>
          <span>อีเมล: <a href="mailto:hello@coursechic.com">hello@coursechic.com</a><br />Line: @coursechic</span>
        </div>
      </aside>
    </div>
    <section class="grid" id="courses" aria-label="course-cards">
      <article class="course-card">
        <div class="course-meta"><span class="tag">Live class</span><span class="tag">Beginner</span></div>
        <strong>คอร์สเริ่มต้นสำหรับผู้เรียนใหม่</strong>
        <small>เริ่มจากพื้นฐานที่ชัดเจน พร้อมแผนเรียนที่ช่วยพาไปทีละขั้น</small>
        <a class="btn secondary" href="/enroll?course=beginner">สมัครเรียนคอร์สนี้</a>
      </article>
      <article class="course-card">
        <div class="course-meta"><span class="tag">Self-paced</span><span class="tag">AI tutor</span></div>
        <strong>เรียนด้วย AI tutor และฐานความรู้</strong>
        <small>เข้าถึงคำอธิบาย, เอกสาร, และการทบทวนได้จากระบบเดียว</small>
        <a class="btn secondary" href="/enroll?course=ai-tutor">สมัครเรียนคอร์สนี้</a>
      </article>
      <article class="course-card">
        <div class="course-meta"><span class="tag">Community</span><span class="tag">Mentor</span></div>
        <strong>พื้นที่เรียนรู้ที่เติบโตไปพร้อมกัน</strong>
        <small>เชื่อมผู้เรียนเข้ากับครู, ทีมงาน, และประกาศสำคัญได้อย่างเรียบง่าย</small>
        <a class="btn secondary" href="/enroll?course=mentor-community">สมัครเรียนคอร์สนี้</a>
      </article>
    </section>
    <section class="info-grid" aria-label="pricing-and-schedule">
      <article class="info-card">
        <strong>ราคา</strong>
        <p>แพ็กเกจเริ่มต้น ฿2,990 / เดือน</p>
        <p>รวม AI tutor, ทรานสคริปต์, และแผนเรียนพื้นฐาน</p>
      </article>
      <article class="info-card">
        <strong>ตารางเรียน</strong>
        <ul>
          <li>จันทร์ - ศุกร์ 19:00 - 21:00</li>
          <li>เสาร์ 10:00 - 12:00</li>
          <li>เรียนย้อนหลังได้จาก student-app</li>
        </ul>
      </article>
      <article class="info-card">
        <strong>รีวิวจากผู้เรียน</strong>
        <p>"หน้าเรียนอ่านง่าย และกลับมาเรียนต่อได้เร็วมาก"</p>
        <p>"Landing page ชัด ตั้งแต่คอร์สไปจนถึงปุ่มสมัคร"</p>
      </article>
    </section>
    <div class="footer">CourseChic • Smart Learning Platform for Future Success</div>
  </main>
</body>
</html>`;
}

function buildEnrollPage(tenantSlug: string, courseSlug: string, courseTitle: string) {
  const safeTenant = tenantSlug || 'coursechic';
  const safeCourseTitle = courseTitle || 'คอร์สที่เลือก';
  const safeCourseSlug = courseSlug || '';
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Enroll | ${safeCourseTitle} | CourseChic</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f8fc;
      --panel: rgba(255,255,255,.9);
      --border: rgba(15,23,42,.08);
      --text: #102033;
      --muted: #607089;
      --primary: #0b7bdc;
      --primary-2: #4f8cf7;
      --ok: #0f8d63;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Inter, "Noto Sans Thai", system-ui, sans-serif;
      background: linear-gradient(180deg, #f7fbff, #edf4fb);
      color: var(--text);
      padding: 32px;
    }
    .wrap {
      width: min(1100px, 100%);
      margin: 0 auto;
      display: grid;
      gap: 18px;
    }
    .hero, .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 18px 40px rgba(15,23,42,.08);
      padding: 24px;
    }
    .hero h1 { margin: .2rem 0 .6rem; font-size: clamp(2rem, 4vw, 3rem); }
    .hero p, .card p, label span, small { color: var(--muted); line-height: 1.6; }
    .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 18px; }
    form { display: grid; gap: 14px; }
    .field { display: grid; gap: 6px; }
    input, select {
      width: 100%;
      border: 1px solid rgba(15,23,42,.09);
      border-radius: 14px;
      padding: .85rem .95rem;
      font: inherit;
      background: #fff;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      border: 0;
      border-radius: 999px;
      padding: 0 18px;
      font: inherit;
      font-weight: 700;
      text-decoration: none;
      background: linear-gradient(135deg, var(--primary), var(--primary-2));
      color: #fff;
      cursor: pointer;
    }
    .note { font-size: .9rem; }
    .status { font-weight: 700; }
    .meta-list { display: grid; gap: 10px; margin: 0; padding-left: 1.1rem; color: var(--muted); }
    .pill {
      display: inline-flex;
      border-radius: 999px;
      padding: 6px 12px;
      background: rgba(11,123,220,.08);
      color: var(--primary);
      border: 1px solid rgba(11,123,220,.12);
      font-size: .84rem;
      font-weight: 700;
    }
    .banner {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 12px;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div class="banner">
        <span class="pill">${safeTenant}</span>
        <span class="pill">${safeCourseSlug || 'course'}</span>
      </div>
      <h1>สมัครเรียน ${safeCourseTitle}</h1>
      <p>กรอกข้อมูลเบื้องต้นเพื่อบันทึกการสมัครเรียนของบัญชีองค์กรนี้ แล้วเราจะผูกผู้เรียนกับคอร์สและส่งต่อเข้า student-app ให้ทันที.</p>
    </section>
    <section class="grid">
      <article class="card">
        <form id="enrollForm">
          <div class="field">
            <span>ชื่อ</span>
            <input id="name" type="text" placeholder="ชื่อผู้สมัคร" required />
          </div>
          <div class="field">
            <span>อีเมล</span>
            <input id="email" type="email" placeholder="name@gmail.com" required />
          </div>
          <div class="field">
            <span>รหัสผ่าน</span>
            <input id="password" type="password" placeholder="ตั้งรหัสผ่านสำหรับเข้าเรียน" required />
          </div>
          <div class="field">
            <span>ชื่อย่อใน URL</span>
            <input id="tenantSlug" type="text" value="${safeTenant}" required />
          </div>
          <div class="field">
            <span>คอร์ส</span>
            <input id="courseSlug" type="text" value="${safeCourseSlug}" placeholder="course slug หรือ course id" required />
            <small>ใช้ slug, ชื่อคอร์ส, หรือรหัสคอร์สก็ได้</small>
          </div>
          <button class="btn" type="submit">สมัครเรียน</button>
          <div class="status" id="status">ยังไม่ได้ส่งข้อมูล</div>
        </form>
      </article>
      <aside class="card">
        <strong>ข้อมูลคอร์ส</strong>
        <ul class="meta-list">
          <li>Tenant: ${safeTenant}</li>
          <li>Course: ${safeCourseTitle}</li>
          <li>ต่อจากหน้านี้ผู้เรียนจะเข้า student-app ของบัญชีองค์กรนี้ได้</li>
        </ul>
      </aside>
    </section>
  </main>
  <script>
    const form = document.getElementById('enrollForm');
    const status = document.getElementById('status');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.textContent = 'กำลังสมัครเรียน...';
      try {
        const response = await fetch('/api/enrollments/public/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantSlug: document.getElementById('tenantSlug').value.trim(),
            courseSlug: document.getElementById('courseSlug').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            name: document.getElementById('name').value.trim(),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'สมัครไม่สำเร็จ');
        status.textContent = 'สมัครเรียนสำเร็จแล้ว';
      } catch (error) {
        status.textContent = error.message || 'สมัครไม่สำเร็จ';
      }
    });
  </script>
</body>
</html>`;
}

async function trySendTenantLandingPage(req: Request, res: Response) {
  const tenantSlug = getTenantSlugFromHost(req);
  if (!tenantSlug) {
    return false;
  }

  try {
    const tenant = await prisma.organization.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) {
      console.warn(`[landing] tenant not found for host=${req.headers.host} slug=${tenantSlug}, serving default template`);
      res.type('html').send(buildDefaultLandingPage(tenantSlug));
      return true;
    }

    if (req.path === '/enroll') {
      const courseQuery = String(req.query.course || req.query.courseSlug || '').trim();
      const tenantCourses = await prisma.course.findMany({
        where: { tenantId: tenant.id },
        orderBy: [{ createdAt: 'desc' }],
        select: { id: true, title: true },
      });
      const matchedCourse = tenantCourses.find((item) => {
        const titleSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return String(item.id) === courseQuery || titleSlug === courseQuery.toLowerCase();
      }) || tenantCourses[0] || null;

      res.type('html').send(buildEnrollPage(
        tenant.slug,
        courseQuery || matchedCourse?.title || '',
        matchedCourse?.title || 'คอร์สที่เลือก',
      ));
      return true;
    }

    const landingPath = path.join(landingPagesDir, tenant.slug, 'index.html');
    if (!fs.existsSync(landingPath)) {
      console.warn(`[landing] no index.html for tenant=${tenant.slug} path=${landingPath}, serving default template`);
      res.type('html').send(buildDefaultLandingPage(tenant.name));
      return true;
    }

    console.log(`[landing] serve tenant=${tenant.slug} host=${req.headers.host} path=${req.path}`);
    res.sendFile(landingPath);
    return true;
  } catch (error) {
    console.error('[landing] failed to resolve tenant landing page:', error);
    return false;
  }
}

app.get('/debug/tenant-resolution', async (req: Request, res: Response) => {
  const tenantSlug = getTenantSlugFromHost(req);
  const appDomain = (process.env.APP_DOMAIN || 'coursechic.com').toLowerCase();
  const configuredAppDomain = process.env.APP_DOMAIN || null;
  const hostHeader = req.headers.host || null;
  const pathName = req.path;
  if (!tenantSlug) {
    return res.json({
      host: hostHeader,
      path: pathName,
      appDomain,
      configuredAppDomain,
      tenantSlug: null,
      tenant: null,
      landingPath: null,
      landingExists: false,
      resolved: false,
      note: 'Host นี้ไม่ตรงกับ subdomain pattern ของ APP_DOMAIN',
    });
  }

  const tenant = await prisma.organization.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true, name: true },
  });
  const landingPath = tenant ? path.join(landingPagesDir, tenant.slug, 'index.html') : null;
  res.json({
    host: hostHeader,
    path: pathName,
    appDomain,
    configuredAppDomain,
    tenantSlug,
    tenant: tenant || null,
    landingPath,
    landingExists: landingPath ? fs.existsSync(landingPath) : false,
    resolved: Boolean(tenant && landingPath && fs.existsSync(landingPath)),
    publicFallback: !Boolean(tenant && landingPath && fs.existsSync(landingPath)),
  });
});

app.get('/api/debug/tenant-resolution', async (req: Request, res: Response) => {
  const tenantSlug = getTenantSlugFromHost(req);
  const appDomain = (process.env.APP_DOMAIN || 'coursechic.com').toLowerCase();
  const configuredAppDomain = process.env.APP_DOMAIN || null;
  const hostHeader = req.headers.host || null;
  const pathName = req.path;

  if (!tenantSlug) {
    return res.json({
      host: hostHeader,
      path: pathName,
      appDomain,
      configuredAppDomain,
      tenantSlug: null,
      tenant: null,
      landingPath: null,
      landingExists: false,
      resolved: false,
      note: 'Host นี้ไม่ตรงกับ subdomain pattern ของ APP_DOMAIN',
    });
  }

  const tenant = await prisma.organization.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true, name: true },
  });
  const landingPath = tenant ? path.join(landingPagesDir, tenant.slug, 'index.html') : null;
  res.json({
    host: hostHeader,
    path: pathName,
    appDomain,
    configuredAppDomain,
    tenantSlug,
    tenant: tenant || null,
    landingPath,
    landingExists: landingPath ? fs.existsSync(landingPath) : false,
    resolved: Boolean(tenant && landingPath && fs.existsSync(landingPath)),
    publicFallback: !Boolean(tenant && landingPath && fs.existsSync(landingPath)),
  });
});

app.get('/api/debug/landing-page/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').trim();
  if (!slug) {
    return res.status(400).json({ error: 'slug is required' });
  }

  const tenant = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });

  const landingPath = path.join(landingPagesDir, slug, 'index.html');
  const exists = fs.existsSync(landingPath);
  const fileStats = exists ? fs.statSync(landingPath) : null;
  const preview = exists ? fs.readFileSync(landingPath, 'utf8').slice(0, 600) : '';

  res.json({
    slug,
    tenant: tenant || null,
    landingPath,
    exists,
    sizeBytes: fileStats?.size || 0,
    modifiedAt: fileStats ? fileStats.mtime.toISOString() : null,
    preview,
  });
});

app.use(async (req: Request, res: Response, next) => {
  if (!shouldTryTenantLandingPage(req)) {
    return next();
  }

  if (await trySendTenantLandingPage(req, res)) {
    return;
  }

  return next();
});

app.use(express.static(publicDir));

app.get('/admin', (req: Request, res: Response) => {
  res.redirect(302, '/admin-app.html');
});

app.get('/admin-app', (req: Request, res: Response) => {
  res.redirect(302, '/admin-app.html');
});

app.get('/console', (req: Request, res: Response) => {
  res.redirect(302, '/platform-console.html');
});

app.get('/platform-console', (req: Request, res: Response) => {
  res.redirect(302, '/platform-console.html');
});

app.get('/student', (req: Request, res: Response) => {
  res.redirect(302, '/student-app.html');
});

app.get('/student-app', (req: Request, res: Response) => {
  res.redirect(302, '/student-app.html');
});

// Set up local storage for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as AuthRequest).user?.tenantId;
    const destination = tenantId ? path.join('uploads', 'videos', String(tenantId)) : path.join('uploads', 'videos', 'public');
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as AuthRequest).user?.tenantId;
    const destination = tenantId ? path.join('uploads', 'course-builder', String(tenantId)) : path.join('uploads', 'course-builder', 'public');
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const pdfUpload = multer({ storage: pdfStorage });

// Serve static files
app.use('/uploads', express.static(uploadsDir));

function loadRoute(modulePath: string): Router | null {
  try {
    return require(modulePath).default as Router;
  } catch (error) {
    console.error(`Failed to load route module ${modulePath}:`, error);
    return null;
  }
}

function unavailableApiHandler(req: Request, res: Response) {
  res.status(503).json({ error: 'API temporarily unavailable' });
}

app.get('/api/landing-pages/html', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await prisma.organization.findUnique({
      where: { id: req.user!.tenantId },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'ไม่พบบัญชีองค์กร' });
    }

    const landingPath = path.join(landingPagesDir, tenant.slug, 'index.html');
    if (!fs.existsSync(landingPath)) {
      return res.json({
        html: '',
        url: `https://${tenant.slug}.${process.env.APP_DOMAIN || 'coursechic.com'}/`,
        exists: false,
      });
    }

    const html = fs.readFileSync(landingPath, 'utf8');
    return res.json({
      html,
      url: `https://${tenant.slug}.${process.env.APP_DOMAIN || 'coursechic.com'}/`,
      exists: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/landing-pages/html', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { html } = req.body as { html?: string };
    const cleanHtml = String(html || '').trim();
    if (!cleanHtml) {
      return res.status(400).json({ error: 'กรอก HTML ก่อน' });
    }

    const tenant = await prisma.organization.findUnique({
      where: { id: req.user!.tenantId },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'ไม่พบบัญชีองค์กร' });
    }

    const tenantLandingDir = path.join(landingPagesDir, tenant.slug);
    fs.mkdirSync(tenantLandingDir, { recursive: true });
    const landingPath = path.join(tenantLandingDir, 'index.html');
    fs.writeFileSync(landingPath, cleanHtml, 'utf8');

    res.status(201).json({
      message: 'บันทึก landing page แล้ว',
      url: `https://${tenant.slug}.${process.env.APP_DOMAIN || 'coursechic.com'}/`,
      fileUrl: `/uploads/landing-pages/${tenant.slug}/index.html`,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Routes
app.use('/api/auth', loadRoute('./routes/auth') ?? unavailableApiHandler);
app.use('/api/tenant', loadRoute('./routes/tenant') ?? unavailableApiHandler);
app.use('/api/admin', loadRoute('./routes/admin') ?? unavailableApiHandler);
app.use('/api/courses', loadRoute('./routes/courses') ?? unavailableApiHandler);
app.use('/api/enrollments', loadRoute('./routes/enrollments') ?? unavailableApiHandler);
app.use('/api/payments', loadRoute('./routes/payments') ?? unavailableApiHandler);
app.use('/api/quizzes', loadRoute('./routes/quizzes') ?? unavailableApiHandler);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Video upload endpoint (still in main for now, can be moved to a separate controller later)
app.post('/api/upload-video', authenticate, upload.single('video'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }
  const tenantPath = req.user?.tenantId ? `${req.user.tenantId}/` : 'public/';
  const videoUrl = `/uploads/videos/${tenantPath}${req.file.filename}`;
  res.json({ message: 'Video uploaded successfully', url: videoUrl });
});

app.post('/api/course-builder/upload-pdf', authenticate, pdfUpload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file provided' });
  }

  const tenantPath = req.user?.tenantId ? `${req.user.tenantId}/` : 'public/';
  const fileUrl = `/uploads/course-builder/${tenantPath}${req.file.filename}`;
  res.status(201).json({
    fileUrl,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
