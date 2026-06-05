import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly jwtService;
    constructor(jwtService: JwtService);
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
}
