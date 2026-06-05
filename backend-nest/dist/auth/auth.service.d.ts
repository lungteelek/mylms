import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly jwtService;
    constructor(jwtService: JwtService);
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
}
