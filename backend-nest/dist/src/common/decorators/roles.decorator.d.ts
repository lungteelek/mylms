import { MembershipRole } from '../types/request-context.type';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: MembershipRole[]) => import("@nestjs/common").CustomDecorator<string>;
