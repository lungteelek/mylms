import { RequestContext } from '../common/types/request-context.type';
import { TenantsService } from './tenants.service';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    getContext(user: RequestContext): {
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
