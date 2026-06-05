import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '../types/request-context.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestContext }>();
    return request.user;
  },
);
