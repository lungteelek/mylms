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
                email: string;
                userId: string;
                tenantId: string;
                tenantSlug: string;
                membershipRole: "owner" | "student";
                featureFlags: {
                    ai_quiz_generation: boolean;
                    study_planner: boolean;
                };
            };
        };
    }>;
    me(user: RequestContext): {
        data: RequestContext;
    };
}
