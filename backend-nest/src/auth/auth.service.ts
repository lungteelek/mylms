import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { MembershipRole } from '../common/types/request-context.type';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(body: LoginDto) {
    const email = body.email.trim().toLowerCase();
    const membershipRole: MembershipRole = email === 'instructor@example.com' ? 'owner' : 'student';
    const userId = email === 'instructor@example.com' ? '1' : '2';
    const payload = {
      userId,
      tenantId: '1',
      tenantSlug: body.tenantSlug || 'demo-academy',
      membershipRole,
      featureFlags: {
        ai_quiz_generation: true,
        study_planner: true,
      },
    };

    return {
      data: {
        accessToken: await this.jwtService.signAsync(payload),
        user: {
          ...payload,
          email,
        },
      },
    };
  }
}
