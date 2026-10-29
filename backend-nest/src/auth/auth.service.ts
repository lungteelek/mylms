import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipRole } from '../common/types/request-context.type';

const DEMO_ACCOUNT_TENANT_MAP: Record<string, string> = {
  'coursechic@gmail.com': 'kb',
  'lungteelek@gmail.com': 'tutortan',
  'educator@coursechic.com': 'tutortan',
};

const LOGIN_ALIASES: Record<string, string> = {
  educator: 'educator@coursechic.com',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async login(body: LoginDto, tenantSlugHint?: string) {
    const loginIdentifier = body.email.trim().toLowerCase();
    const email = LOGIN_ALIASES[loginIdentifier] || loginIdentifier;
    const tenantSlug = String(
      DEMO_ACCOUNT_TENANT_MAP[email] || process.env.DEFAULT_TENANT_SLUG || 'academy',
    ).trim().toLowerCase();
    if (!tenantSlug) {
      throw new Error('tenantSlug is required');
    }
    const isDemoBootstrapAccount =
      (email === 'coursechic@gmail.com' || email === 'lungteelek@gmail.com')
      && body.password === 'password123';
    const canBootstrapDemoTenant = Boolean(
      isDemoBootstrapAccount
      && DEMO_ACCOUNT_TENANT_MAP[email]
      && DEMO_ACCOUNT_TENANT_MAP[email] === tenantSlug,
    );
    const tenantName =
      tenantSlug === 'tutortan'
        ? 'Tutor Tan'
        : tenantSlug === 'kb'
          ? 'CourseChic Platform'
          : `${tenantSlug} Academy`;

    let tenant = await this.prismaService.organization.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant && canBootstrapDemoTenant) {
      tenant = await this.prismaService.organization.create({
        data: {
          slug: tenantSlug,
          name: tenantName,
        },
      });
    }

    let user = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (!user && canBootstrapDemoTenant) {
      user = await this.prismaService.user.create({
        data: {
          email,
          name: email === 'coursechic@gmail.com' ? 'CourseChic Owner' : 'Educator',
          password: 'password123',
        },
      });
    }

    if (!tenant || !user) {
      throw new Error('No tenant access for this account');
    }

    let membership = await this.prismaService.tenantMembership.findFirst({
      where: {
        tenantId: tenant.id,
        userId: user.id,
      },
    });

    if (!membership && canBootstrapDemoTenant) {
      membership = await this.prismaService.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
        },
      });
    }

    if (!membership) {
      throw new Error('No tenant access for this account');
    }

    const membershipRole = membership.role.toLowerCase() as MembershipRole;
    const payload = {
      userId: String(user.id),
      tenantId: String(tenant.id),
      tenantSlug: tenant.slug,
      membershipRole,
      featureFlags: {
        ai_quiz_generation: true,
        study_planner: true,
      },
    };

    const features = await this.prismaService.featureFlag.findMany({
      where: { tenantId: tenant.id },
      select: { key: true, enabled: true },
    });
    const featureFlags = features.reduce<Record<string, boolean>>((acc, feature) => {
      acc[feature.key] = feature.enabled;
      return acc;
    }, {
      ai_quiz_generation: true,
      study_planner: true,
    });

    return {
      data: {
        accessToken: await this.jwtService.signAsync(payload),
        user: {
          ...payload,
          email,
          tenant: {
            id: String(tenant.id),
            name: tenant.name,
            slug: tenant.slug,
          },
        },
        features: featureFlags,
      },
    };
  }
}
