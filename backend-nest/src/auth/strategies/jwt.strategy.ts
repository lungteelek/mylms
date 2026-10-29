import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipRole, RequestContext } from '../../common/types/request-context.type';

type TokenPayload = Partial<RequestContext> & {
  role?: string;
  platformRole?: string;
  userId?: string | number;
  tenantId?: string | number;
  tenantSlug?: string;
  featureFlags?: Record<string, boolean>;
};

const MEMBERSHIP_ROLES: MembershipRole[] = ['owner', 'admin', 'tutor', 'student'];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwtSecret') || 'change-me',
    });
  }

  private toMembershipRole(value: unknown): MembershipRole {
    const role = String(value || '').trim().toLowerCase();
    return MEMBERSHIP_ROLES.includes(role as MembershipRole)
      ? (role as MembershipRole)
      : 'student';
  }

  async validate(payload: TokenPayload): Promise<RequestContext> {
    const tenantId = String(payload.tenantId || '').trim();
    const tenantSlug = String(payload.tenantSlug || '').trim();
    let resolvedTenantSlug = tenantSlug;

    if (!resolvedTenantSlug && tenantId) {
      try {
        const tenant = await this.prismaService.organization.findUnique({
          where: {
            id: Number(tenantId),
          },
          select: {
            slug: true,
          },
        });
        resolvedTenantSlug = tenant?.slug || '';
      } catch {
        resolvedTenantSlug = '';
      }
    }

    return {
      userId: String(payload.userId || ''),
      tenantId,
      tenantSlug: resolvedTenantSlug || tenantSlug || '',
      membershipRole: this.toMembershipRole(payload.membershipRole || payload.role),
      featureFlags: payload.featureFlags || {},
    };
  }
}
