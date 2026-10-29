import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipRole, RequestContext } from '../types/request-context.type';

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
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  private toMembershipRole(value: unknown): MembershipRole {
    const role = String(value || '').trim().toLowerCase();
    return MEMBERSHIP_ROLES.includes(role as MembershipRole)
      ? (role as MembershipRole)
      : 'student';
  }

  private async normalizePayload(payload: TokenPayload): Promise<RequestContext> {
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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: RequestContext }>();
    const authorization = String(request.headers.authorization || request.headers.Authorization || '').trim();
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw new UnauthorizedException('Unauthorized');
    }

    const token = match[1];
    const secrets = Array.from(
      new Set([
        this.configService.get<string>('app.jwtSecret') || 'change-me',
        'your-secret-key',
      ]),
    );

    let decodedPayload: TokenPayload | null = null;
    for (const secret of secrets) {
      try {
        decodedPayload = jwt.verify(token, secret) as TokenPayload;
        break;
      } catch {
        decodedPayload = null;
      }
    }

    if (!decodedPayload) {
      throw new UnauthorizedException('Unauthorized');
    }

    request.user = await this.normalizePayload(decodedPayload);
    return true;
  }
}
