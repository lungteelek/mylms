import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LicenseStatus, PlatformRole, TenantRole } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  ensureTenantLicense,
  getDefaultMembership,
  getMembershipForTenant,
  getTenantFeatureMap,
} from '../lib/tenant';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || null;

let OAuth2Client: any = null;
try {
  ({ OAuth2Client } = require('../../../backend-nest/node_modules/google-auth-library'));
} catch {
  OAuth2Client = null;
}

const googleOAuthClient = GOOGLE_OAUTH_CLIENT_ID && OAuth2Client
  ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID)
  : null;

const DEMO_ACCOUNT_TENANT_MAP: Record<string, string> = {
  'coursechic@gmail.com': 'kb',
  'lungteelek@gmail.com': 'tutortan',
  'educator@coursechic.com': 'tutortan',
};

const LOGIN_ALIASES: Record<string, string> = {
  educator: 'educator@coursechic.com',
};

function signTenantToken(userId: number, role: string, tenantId: number, platformRole: string) {
  return jwt.sign({ userId, role, tenantId, platformRole }, JWT_SECRET, { expiresIn: '7d' });
}

async function resolveGoogleProfile(idToken: string) {
  if (!googleOAuthClient) {
    throw new Error('Google OAuth is not configured');
  }

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken,
    audience: GOOGLE_OAUTH_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const email = String(payload?.email || '').trim().toLowerCase();
  const emailVerified = Boolean(payload?.email_verified);
  if (!email || !emailVerified) {
    throw new Error('Google account email is not verified');
  }

  return {
    email,
    name: String(payload?.name || payload?.given_name || email.split('@')[0] || 'Google User').trim(),
    picture: payload?.picture || null,
    hd: payload?.hd || null,
    sub: payload?.sub || null,
  };
}

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'ผู้ใช้นี้มีอยู่แล้ว' });
    }

    const baseSlug = process.env.DEFAULT_TENANT_SLUG || 'academy';

    const hashedPassword = await bcrypt.hash(password, 10);
    const requestedRole = role === 'educator' || role === 'instructor' ? TenantRole.INSTRUCTOR : TenantRole.STUDENT;

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.organization.upsert({
        where: { slug: baseSlug },
        update: {},
        create: { name: process.env.APP_NAME || 'Learning Academy', slug: baseSlug },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          platformRole: PlatformRole.USER,
        },
      });

      const membership = await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: requestedRole,
          isDefault: true,
        },
      });

      await tx.license.create({
        data: {
          tenantId: tenant.id,
          status: LicenseStatus.TRIAL,
          plan: 'starter',
          issuedTo: tenant.name,
        },
      });

      await tx.featureFlag.createMany({
        data: [
          { tenantId: tenant.id, key: 'ai_quiz_generation', enabled: true },
          { tenantId: tenant.id, key: 'self_service_signup', enabled: true },
          { tenantId: tenant.id, key: 'white_label_branding', enabled: false },
        ],
      });

      return { tenant, user, membership };
    });

    const token = signTenantToken(
      result.user.id,
      result.membership.role,
      result.tenant.id,
      result.user.platformRole,
    );

    res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.membership.role,
        platformRole: result.user.platformRole,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
      },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const loginIdentifier = String(email || '').trim().toLowerCase();
    const normalizedEmail = LOGIN_ALIASES[loginIdentifier] || loginIdentifier;
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const isDemoBootstrapAccount =
      (normalizedEmail === 'lungteelek@gmail.com' || normalizedEmail === 'coursechic@gmail.com' || normalizedEmail === 'educator@coursechic.com')
      && password === 'password123';
    const allowedDemoTenantSlug = normalizedEmail ? DEMO_ACCOUNT_TENANT_MAP[normalizedEmail] : undefined;
    const canBootstrapDemoTenant = Boolean(
      isDemoBootstrapAccount
      && allowedDemoTenantSlug,
    );
    const bootstrapTenantSlug = canBootstrapDemoTenant ? allowedDemoTenantSlug || '' : '';
    if (canBootstrapDemoTenant) {
      const existingTenant = await prisma.organization.findUnique({ where: { slug: bootstrapTenantSlug } });
      const tenant = existingTenant || await prisma.organization.create({
        data: {
          slug: bootstrapTenantSlug,
          name:
            bootstrapTenantSlug === 'tutortan'
              ? 'Tutor Tan'
              : bootstrapTenantSlug === 'kb'
                ? 'CourseChic Platform'
                : `${bootstrapTenantSlug} Academy`,
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedEmail === 'coursechic@gmail.com' ? 'CourseChic Owner' : 'Educator',
            password: await bcrypt.hash(password, 10),
            platformRole: normalizedEmail === 'coursechic@gmail.com' ? PlatformRole.ADMIN : PlatformRole.USER,
          },
        });
      } else {
        user = await prisma.user.update({
          where: { email: normalizedEmail },
          data: {
            name: normalizedEmail === 'coursechic@gmail.com' ? 'CourseChic Owner' : 'Educator',
            platformRole: normalizedEmail === 'coursechic@gmail.com' ? PlatformRole.ADMIN : PlatformRole.USER,
          },
        });
      }

      await prisma.tenantMembership.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: tenant.id,
          },
        },
        update: {
          role: TenantRole.OWNER,
          isDefault: true,
        },
        create: {
          userId: user.id,
          tenantId: tenant.id,
          role: TenantRole.OWNER,
          isDefault: true,
        },
      });
      await ensureTenantLicense(prisma, tenant.id);
      await prisma.featureFlag.upsert({
        where: {
          tenantId_key: {
            tenantId: tenant.id,
            key: 'ai_quiz_generation',
          },
        },
        update: { enabled: true },
        create: {
          tenantId: tenant.id,
          key: 'ai_quiz_generation',
          enabled: true,
        },
      });
      await prisma.featureFlag.upsert({
        where: {
          tenantId_key: {
            tenantId: tenant.id,
            key: 'self_service_signup',
          },
        },
        update: { enabled: true },
        create: {
          tenantId: tenant.id,
          key: 'self_service_signup',
          enabled: true,
        },
      });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = isDemoBootstrapAccount ? true : await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let tenant;
    let membership;

    const defaultMembership = await getDefaultMembership(prisma, user.id);
    tenant = defaultMembership?.tenant;
    membership = defaultMembership;

    if ((!tenant || !membership) && canBootstrapDemoTenant) {
      const demoTenant = tenant || await prisma.organization.upsert({
        where: { slug: bootstrapTenantSlug },
        update: {
          name:
            bootstrapTenantSlug === 'tutortan'
              ? 'Tutor Tan'
              : bootstrapTenantSlug === 'kb'
                ? 'CourseChic Platform'
                : `${bootstrapTenantSlug} Academy`,
        },
        create: {
          slug: bootstrapTenantSlug,
          name:
            bootstrapTenantSlug === 'tutortan'
              ? 'Tutor Tan'
              : bootstrapTenantSlug === 'kb'
                ? 'CourseChic Platform'
                : `${bootstrapTenantSlug} Academy`,
        },
      });
      await prisma.tenantMembership.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: demoTenant.id,
          },
        },
        update: {
          role: TenantRole.OWNER,
          isDefault: true,
        },
        create: {
          userId: user.id,
          tenantId: demoTenant.id,
          role: TenantRole.OWNER,
          isDefault: true,
        },
      });
      await ensureTenantLicense(prisma, demoTenant.id);
      tenant = demoTenant;
      membership = await getMembershipForTenant(prisma, user.id, demoTenant.id);
    }

    if (!tenant || !membership) {
      return res.status(403).json({ error: 'No tenant access for this account' });
    }

    const license = await ensureTenantLicense(prisma, tenant.id);
    const features = await getTenantFeatureMap(prisma, tenant.id);
    const token = signTenantToken(user.id, membership.role, tenant.id, user.platformRole);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
        platformRole: user.platformRole,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
      token,
      license: {
        status: license.status,
        plan: license.plan,
        expiresAt: license.expiresAt,
      },
      features,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth login
router.post('/google', async (req: AuthRequest, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    const profile = await resolveGoogleProfile(idToken);
    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          password: await bcrypt.hash(profile.sub || profile.email, 10),
          platformRole: PlatformRole.USER,
        },
      });
    }

    let tenant;
    let membership;

    const defaultMembership = await getDefaultMembership(prisma, user.id);
    tenant = defaultMembership?.tenant;
    membership = defaultMembership;

    if (!tenant || !membership) {
      return res.status(403).json({ error: 'No tenant access for this account' });
    }

    const license = await ensureTenantLicense(prisma, tenant.id);
    const features = await getTenantFeatureMap(prisma, tenant.id);
    const token = signTenantToken(user.id, membership.role, tenant.id, user.platformRole);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || profile.name,
        role: membership.role,
        platformRole: user.platformRole,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
      token,
      license: {
        status: license.status,
        plan: license.plan,
        expiresAt: license.expiresAt,
      },
      features,
      provider: 'google',
      google: {
        email: profile.email,
        picture: profile.picture,
        hd: profile.hd,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
