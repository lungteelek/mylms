export type MembershipRole = 'owner' | 'admin' | 'tutor' | 'student';

export type RequestContext = {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  membershipRole: MembershipRole;
  featureFlags: Record<string, boolean>;
};
