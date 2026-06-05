import { AuthService } from './auth.service';
import { RequestContext } from '../common/types/request-context.type';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<{
        data: {
            accessToken: string;
            user: {
                userId: string;
                tenantId: string;
                tenantSlug: string;
                membershipRole: string;
                featureFlags: {};
            };
        };
    }>;
    me(user: RequestContext): {
        data: RequestContext;
    };
}
