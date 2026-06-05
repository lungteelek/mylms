import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { TenantsService } from './tenants.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('context')
  getContext(@CurrentUser() user: RequestContext) {
    return this.tenantsService.getTenantContext(user);
  }
}
