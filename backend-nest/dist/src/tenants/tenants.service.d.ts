import { RequestContext } from '../common/types/request-context.type';
export declare class TenantsService {
    getTenantContext(user: RequestContext): {
        data: {
            tenant: {
                id: string;
                slug: string;
            };
            membershipRole: import("../common/types/request-context.type").MembershipRole;
            featureFlags: Record<string, boolean>;
        };
    };
}
