import { Injectable } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';

@Injectable()
export class TenantsService {
  getTenantContext(user: RequestContext) {
    return {
      data: {
        tenant: {
          id: user.tenantId,
          slug: user.tenantSlug,
        },
        membershipRole: user.membershipRole,
        featureFlags: user.featureFlags,
      },
    };
  }
}
