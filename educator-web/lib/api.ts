export type LoginPayload = {
  email: string;
  password: string;
};

export type EducatorSession = {
  token: string;
  nestToken?: string | null;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    platformRole?: string;
    tenant: {
      id: number;
      name: string;
      slug: string;
    };
  };
  license?: {
    status?: string;
    plan?: string;
    expiresAt?: string | null;
  };
  features?: Record<string, boolean>;
};

export type TenantContext = {
  tenant: {
    id: number;
    name: string;
    slug: string;
  };
  membership: {
    role: string;
    isDefault: boolean;
  };
  license: {
    status: string;
    plan: string;
    expiresAt?: string | null;
  };
  pricing?: {
    packageId?: PricingPackageId;
    monthlyFee?: number | null;
    revenueSharePct?: number | null;
    videoQuotaGb?: number | null;
    promoFreeMonths?: number;
    promoEnabled?: boolean;
    renewalIntervalMonths?: number;
    membershipOptions?: WorkspaceMembershipOption[];
    includedCourseIds?: string[];
  } | null;
  billingProfile?: TutorBillingProfile | null;
  usage?: {
    videoStorageBytesUsed: number;
    videoStorageGbUsed: number;
    videoQuotaGb?: number | null;
  } | null;
  features: Record<string, boolean>;
};

export type TutorBillingProfileSaveResponse = {
  billingProfile: TutorBillingProfile | null;
  pricing?: TenantContext['pricing'];
};

export type WorkspaceMembershipOption = {
  id: string;
  name: string;
  durationMonths: 1 | 3 | 6 | 12 | 18 | 24;
  compareAtPrice: number | null;
  salePrice: number | null;
  enabled: boolean;
  includedCourseIds: string[];
};

export type CourseItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  description?: string;
  subject?: string;
  level?: string;
  enrollmentCount?: number;
  completedStudentCount?: number;
  reviewScore?: number | null;
  updatedAt?: string;
  tree?: CourseTreeNode[];
  modules?: Array<{
    id: string;
    title: string;
    content?: string;
    path?: string;
    depth?: number;
    nodeType?: string;
    videoUrl?: string;
    videoStatus?: string | null;
    videoAssetId?: string | null;
    videoHlsUrl?: string | null;
    videoPosterUrl?: string | null;
    videoMediaId?: string | null;
    asset?: {
      type: 'pdf' | 'url' | 'image' | 'attachment' | 'none';
      fileName?: string;
      url?: string;
      fileUrl?: string;
      externalUrl?: string;
      mimeType?: string;
      sizeBytes?: number | null;
    };
    assets?: Array<{
      id: string;
      title: string;
      assetType: 'pdf' | 'link' | 'image' | 'attachment' | 'assignment';
      type: 'pdf' | 'url' | 'image' | 'attachment';
      fileName?: string;
      url?: string;
      fileUrl?: string;
      externalUrl?: string;
      mimeType?: string;
      sizeBytes?: number | null;
    }>;
    transcriptFullText?: string;
    transcriptStatus?: 'ready' | 'processing' | 'failed' | 'uploading';
    transcriptLanguage?: string;
    transcriptSegments?: Array<{
      seek: string;
      progress: number;
      text: string;
    }>;
  }>;
};

export type StudentSummary = {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  students: Array<{
    id: number;
    name: string;
    email: string;
    status: string;
    progress: number;
    renewalDue?: string;
  }>;
};

export type CreateTutorPayload = {
  name: string;
  slug: string;
  email: string;
  password: string;
  packageId?: PricingPackageId;
};

export type TutorCreateResult = {
  data: {
    tenant: {
      id: number;
      name: string;
      slug: string;
      url: string;
    };
    tutor: {
      id: number;
      email: string;
      name: string;
    };
  };
  pricing?: {
    packageId: 'starter' | 'growth' | 'pro' | 'enterprise';
    monthlyFee: number | null;
    revenueSharePct: number | null;
    videoQuotaGb: number | null;
    promoFreeMonths: number;
    renewalIntervalMonths?: number;
    expiresAt?: string;
  };
};

export type TutorDirectory = {
  total: number;
  tutors: Array<{
    tenant: {
      id: number;
      name: string;
      slug: string;
      createdAt: string;
      url: string;
    };
    tutor: {
      id: number;
      email: string;
      name: string;
      platformRole: string;
      createdAt: string;
    };
    role: string;
  }>;
};

export type PricingPackageId = 'starter' | 'growth' | 'pro' | 'enterprise';

export type PricingPackage = {
  id: PricingPackageId;
  name: string;
  monthlyFee: number | null;
  revenueSharePct: number | null;
  videoQuotaGb: number | null;
  note: string;
  highlighted?: boolean;
};

export type PricingPromo = {
  enabled: boolean;
  freeMonths: number;
  label: string;
  note: string;
};

export type CommerceDurationValue = '1' | '3' | '6' | '12' | '18' | '24' | '30' | '36' | 'lifetime';

export type CommercePriceOption = {
  durationMonths: CommerceDurationValue;
  price: string;
  compareAt: string;
  enabled: boolean;
};

export type CommercePromotionOption = {
  id: string;
  label: string;
  durationMonths: CommerceDurationValue;
  discountPercent: string;
  note: string;
  enabled: boolean;
};

export type CommerceCouponOption = {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'free_months';
  value: string;
  durationMonths: CommerceDurationValue;
  note: string;
  enabled: boolean;
};

export type CommerceConfig = {
  currency: string;
  priceOptions: CommercePriceOption[];
  showPublic: boolean;
  allowPromotions: boolean;
  promotionOptions: CommercePromotionOption[];
  couponOptions: CommerceCouponOption[];
};

export type PricingTutorOverride = {
  tenantSlug: string;
  tenantName: string;
  packageId: PricingPackageId;
  monthlyFee: number | null;
  revenueSharePct: number | null;
  videoQuotaGb: number | null;
  promoFreeMonths: number;
  note: string;
  updatedAt: string;
  updatedBy: string;
  tenant?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  effectivePackage?: PricingPackage;
};

export type PricingConfig = {
  updatedAt: string;
  defaults: {
    promo: PricingPromo;
    packages: PricingPackage[];
    commerce: CommerceConfig;
  };
  overrides: PricingTutorOverride[];
};

export type TutorBillingProfile = {
  id: number;
  tenantId: number;
  billingModel: 'MONTHLY' | 'REVENUE_SHARE';
  checkoutOwner: 'PLATFORM' | 'TUTOR';
  studentAccountMode: 'PLATFORM_MANAGED' | 'TUTOR_MANAGED';
  monthlyFeeMinor: number | null;
  revenueSharePct: number | null;
  settlementDelayDays: number;
  currency: string;
  active: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  tenant?: {
    id: number;
    name: string;
    slug: string;
  };
};

export type CoursePricing = {
  id: number;
  tenantId: number;
  courseId: number;
  tutorBillingProfileId?: number | null;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  currency: string;
  allowCoupons: boolean;
  allowPromotions: boolean;
  showPricePublicly: boolean;
  salesStartsAt: string | null;
  salesEndsAt: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CourseDiscountCampaign = {
  id: number;
  tenantId: number;
  courseId: number | null;
  tutorBillingProfileId?: number | null;
  mode: 'AUTO' | 'CODE';
  code: string | null;
  name: string;
  description?: string | null;
  discountType: 'PERCENT' | 'AMOUNT' | 'FREE';
  discountValue: number | null;
  discountAmountMinor: number | null;
  currency: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
  stackable: boolean;
  priority: number;
  maxRedemptions: number | null;
  maxRedemptionsPerStudent: number | null;
  startsAt: string | null;
  endsAt: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CoursePricingResponse = {
  course: {
    id: string;
    title: string;
    tenant: {
      id: number;
      name: string;
      slug: string;
    };
  };
  billingProfile: TutorBillingProfile | null;
  pricing: CoursePricing | null;
  discounts: CourseDiscountCampaign[];
};

export type NestCourseListResponse = {
  data: {
    items: CourseItem[];
  };
};

export type NestCourseTree = {
  data: {
    course: CourseItem;
    nodes: CourseTreeNode[];
  };
};

export type CourseTreeNode = {
  id: string;
  parentId: string | null;
  nodeType: 'section' | 'lesson' | 'quiz' | 'assignment';
  title: string;
  path: string;
  depth: number;
  sortOrder: number;
  estimatedMinutes: number;
  isPublished: boolean;
  children: CourseTreeNode[];
};

export type TranscriptResponse = {
  data: {
    videoAssetId: string;
    language?: string;
    status?: string;
    fullText?: string | null;
    segments?: Array<{
      seek: string;
      progress: number;
      text: string;
    }>;
  } | null;
};

export type PaymentSessionResult = {
  sessionId: string;
  courseTitle: string;
  amount: number;
  currency: string;
};

export type PaymentConfirmResult = {
  message: string;
  enrollment: {
    id?: number;
    tenantId?: number;
    userId?: number;
    courseId?: number;
  };
};

export type LandingPageResponse = {
  html: string;
  url: string;
  exists: boolean;
};

export type LandingPageSaveResponse = {
  message: string;
  url: string;
  fileUrl: string;
  tenant: {
    id: number;
    slug: string;
    name: string;
  };
};

const CONFIGURED_API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');

function getApiBase() {
  if (typeof window === 'undefined') {
    return CONFIGURED_API_BASE;
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  return isLocalhost ? CONFIGURED_API_BASE : '';
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildApiError(path: string, response: Response, data: unknown, prefix = 'Request failed') {
  const detail = typeof data === 'object' && data && 'error' in data ? String((data as { error?: string }).error || '') : '';
  if (detail === 'No tenant access for this account' || detail === 'Tenant not found') {
    return detail;
  }
  const label = `${prefix} ${response.url ? `${response.url} ` : ''}${path} (${response.status})`.replace(/\s+/g, ' ').trim();
  return detail ? `${label}: ${detail}` : label;
}

async function request<T>(path: string, init: RequestInit = {}, session?: EducatorSession): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(buildApiError(path, response, data), response.status);
  }

  return data as T;
}

async function requestForm<T>(path: string, init: RequestInit = {}, session?: EducatorSession): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.delete('Content-Type');
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(buildApiError(path, response, data), response.status);
  }

  return data as T;
}

async function requestNest<T>(path: string, init: RequestInit = {}, session?: EducatorSession): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (session?.nestToken) {
    headers.set('Authorization', `Bearer ${session.nestToken}`);
  }

  const response = await fetch(`${getApiBase()}/api/nest${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(buildApiError(`/api/nest${path}`, response, data, 'Nest request failed'), response.status);
  }

  return data as T;
}

function shouldFallbackToLegacy(error: unknown) {
  return error instanceof ApiError && (
    [404, 502, 503, 504].includes(error.status)
    || (error.status === 500 && /no such table|unrecognized token|syntax error/i.test(error.message))
  );
}

function shouldFallbackToLegacyCourse(error: unknown) {
  return error instanceof ApiError && (
    [404, 502, 503, 504].includes(error.status)
    || (error.status === 500 && /no such table|unrecognized token|syntax error|invalid .*queryraw|invalid .*invocation|raw query failed|argument .*where/i.test(error.message))
  );
}

export async function login(payload: LoginPayload): Promise<EducatorSession> {
  const loginBody = {
    email: payload.email,
    password: payload.password,
  };
  const [data, nestData] = await Promise.all([
    request<{
      user: EducatorSession['user'];
      token: string;
      license?: EducatorSession['license'];
      features?: Record<string, boolean>;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginBody),
    }),
    requestNest<{
      data: {
        accessToken: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginBody),
    }).catch(() => null),
  ]);

  return {
    token: data.token,
    nestToken: nestData?.data?.accessToken || null,
    user: data.user,
    license: data.license,
    features: data.features,
  };
}

export function fetchCourses(session: EducatorSession) {
  return request<CourseItem[]>('/api/courses', { method: 'GET' }, session);
}

export function fetchStudents(session: EducatorSession) {
  return request<StudentSummary>('/api/admin/students', { method: 'GET' }, session);
}

export function fetchTenantContext(session: EducatorSession) {
  return request<TenantContext>('/api/tenant/context', { method: 'GET' }, session);
}

export function saveTutorBillingProfile(
  session: EducatorSession,
  payload: {
    monthlyFeeMinor: number | null;
    currency: string;
    billingModel: 'MONTHLY' | 'REVENUE_SHARE';
    checkoutOwner: 'PLATFORM' | 'TUTOR';
    studentAccountMode: 'PLATFORM_MANAGED' | 'TUTOR_MANAGED';
    active: boolean;
    notes?: string;
    metadata?: Record<string, unknown> | null;
    pricing: {
      monthlyFee: number | null;
      promoEnabled: boolean;
      promoFreeMonths: number;
      renewalIntervalMonths: number;
      membershipOptions?: WorkspaceMembershipOption[];
      includedCourseIds?: string[];
    };
  },
) {
  return request<TutorBillingProfileSaveResponse>('/api/tenant/billing-profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, session);
}

export function fetchLandingPageHtml(session: EducatorSession) {
  return request<LandingPageResponse>('/api/landing-pages/html', { method: 'GET' }, session);
}

export function saveLandingPageHtml(session: EducatorSession, html: string) {
  return request<LandingPageSaveResponse>('/api/landing-pages/html', {
    method: 'POST',
    body: JSON.stringify({ html }),
  }, session);
}

export function fetchCourseDetail(session: EducatorSession, courseId: string) {
  return request<CourseItem>(`/api/courses/${courseId}`, { method: 'GET' }, session);
}

export function fetchNestCourses(session: EducatorSession) {
  return requestNest<NestCourseListResponse>('/courses', { method: 'GET' }, session).then((data) => data.data.items || []);
}

export function fetchCourseTree(session: EducatorSession, courseId: string) {
  return requestNest<NestCourseTree>(`/courses/${courseId}/tree`, { method: 'GET' }, session).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    const legacy = await request<CourseItem>(`/api/courses/${courseId}`, { method: 'GET' }, session);
    return {
      data: {
        course: {
          id: legacy.id,
          title: legacy.title,
          slug: legacy.slug,
          description: legacy.description || '',
          status: legacy.status || 'draft',
          subject: legacy.subject || '',
          level: legacy.level || '',
          enrollmentCount: legacy.enrollmentCount || 0,
          updatedAt: legacy.updatedAt || new Date().toISOString(),
        },
        nodes: legacy.tree || [],
      },
    };
  });
}

export function publishCourse(session: EducatorSession, courseId: string) {
  return requestNest<{ data: { id: string; status: string; publishedAt?: string | null } }>(
    `/courses/${courseId}/publish`,
    { method: 'POST' },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacyCourse(error)) {
      throw error;
    }
    return request<{ data: { id: string; status: string; publishedAt?: string | null } }>(
      `/api/courses/${courseId}/publish`,
      { method: 'POST' },
      session,
    );
  });
}

export function unpublishCourse(session: EducatorSession, courseId: string) {
  return requestNest<{ data: { id: string; status: string; publishedAt?: string | null } }>(
    `/courses/${courseId}/unpublish`,
    { method: 'POST' },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacyCourse(error)) {
      throw error;
    }
    return request<{ data: { id: string; status: string; publishedAt?: string | null } }>(
      `/api/courses/${courseId}/unpublish`,
      { method: 'POST' },
      session,
    );
  });
}

export function deleteCourse(session: EducatorSession, courseId: string) {
  return requestNest<{ data: { courseId: string; deleted: boolean } }>(
    `/courses/${courseId}`,
    { method: 'DELETE' },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacyCourse(error)) {
      throw error;
    }
    return request<{ data: { courseId: string; deleted: boolean } }>(
      `/api/courses/${courseId}`,
      { method: 'DELETE' },
      session,
    );
  });
}

export function reorderCourses(session: EducatorSession, orderedCourseIds: string[]) {
  return requestNest<{ data: { updated: number } }>(
    '/courses/reorder',
    {
      method: 'PATCH',
      body: JSON.stringify({ orderedCourseIds }),
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    return request<{ data: { updated: number } }>(
      '/api/courses/reorder',
      {
        method: 'PATCH',
        body: JSON.stringify({ orderedCourseIds }),
      },
      session,
    );
  });
}

export function reorderCourseTree(
  session: EducatorSession,
  courseId: string,
  moves: Array<{
    nodeId: string;
    newParentId?: string | null;
    newSortOrder: number;
  }>,
) {
  return requestNest<{ data: { courseId: string; updated: number } }>(
    `/courses/${courseId}/tree/reorder`,
    {
      method: 'PATCH',
      body: JSON.stringify({ moves }),
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    return request<{ data: { courseId: string; updated: number } }>(
      `/api/courses/${courseId}/tree/reorder`,
      {
        method: 'PATCH',
        body: JSON.stringify({ moves }),
      },
      session,
    );
  });
}

export function updateCourse(session: EducatorSession, courseId: string, payload: Partial<Pick<CourseItem, 'title' | 'description' | 'subject' | 'level'>>) {
  return requestNest<{ data: CourseItem }>(
    `/courses/${courseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacyCourse(error)) {
      throw error;
    }

    const data = await request<CourseItem>(
      `/api/courses/${courseId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      session,
    );
    return { data };
  });
}

export function createCourse(session: EducatorSession, payload: Required<Pick<CourseItem, 'title' | 'slug'>> & Partial<Pick<CourseItem, 'description' | 'subject' | 'level'>>) {
  return requestNest<{ data: CourseItem }>(
    '/courses',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    const legacy = await request<CourseItem>(
      '/api/courses',
      {
        method: 'POST',
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
        }),
      },
      session,
    );

    return {
      data: {
        ...legacy,
        title: legacy.title || payload.title,
        slug: payload.slug,
        status: legacy.status || 'draft',
        description: legacy.description ?? payload.description ?? '',
        subject: legacy.subject ?? payload.subject ?? '',
        level: legacy.level ?? payload.level ?? '',
        enrollmentCount: legacy.enrollmentCount ?? 0,
        updatedAt: legacy.updatedAt || new Date().toISOString(),
        modules: legacy.modules || [],
      },
    };
  });
}

export function createLessonNode(
  session: EducatorSession,
  courseId: string,
  payload: {
    parentId?: string;
    nodeType: 'section' | 'lesson' | 'quiz' | 'assignment';
    title: string;
    estimatedMinutes?: number;
  },
) {
  return requestNest<{ data: CourseTreeNode }>(
    `/courses/${courseId}/nodes`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    return request<{ data: CourseTreeNode }>(
      `/api/courses/${courseId}/nodes`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      session,
    );
  });
}

export function updateLessonNode(
  session: EducatorSession,
  nodeId: string,
  payload: {
    title?: string;
    estimatedMinutes?: number;
    isPublished?: boolean;
  },
) {
  return requestNest<{ data: { lessonNodeId: string } }>(
    `/lesson-nodes/${nodeId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    return request<{ data: { lessonNodeId: string } }>(
      `/api/courses/lesson-nodes/${nodeId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      session,
    );
  });
}

export function deleteLessonNode(session: EducatorSession, nodeId: string) {
  return requestNest<{ data: { lessonNodeId: string; deleted: boolean } }>(
    `/lesson-nodes/${nodeId}`,
    { method: 'DELETE' },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    return request<{ data: { lessonNodeId: string; deleted: boolean } }>(
      `/api/courses/lesson-nodes/${nodeId}`,
      { method: 'DELETE' },
      session,
    );
  });
}

export function upsertLessonContent(
  session: EducatorSession,
  nodeId: string,
  payload: {
    contentType: 'video' | 'article' | 'pdf' | 'external_link' | 'mixed';
    htmlContent?: string;
    plainText?: string;
  },
) {
  return requestNest<{ data: { id: string; lessonNodeId: string } }>(
    `/lesson-nodes/${nodeId}/content`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) throw error;
    return request<{ data: { id: string; lessonNodeId: string } }>(
      `/api/courses/lesson-nodes/${nodeId}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      session,
    );
  });
}

export function createLessonAsset(
  session: EducatorSession,
  nodeId: string,
  payload: {
    assetType: 'pdf' | 'link' | 'image' | 'attachment' | 'assignment';
    title: string;
    fileUrl?: string;
    externalUrl?: string;
    mimeType?: string;
    sizeBytes?: number;
  },
) {
  return requestNest<{ data: { id: string; lessonNodeId: string } }>(
    `/lesson-nodes/${nodeId}/assets`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function saveLessonAssetFile(
  session: EducatorSession,
  nodeId: string,
  payload: {
    file: File;
    title: string;
    assetType?: 'pdf' | 'link' | 'image' | 'attachment' | 'assignment';
  },
  options?: {
    onProgress?: (progress: number) => void;
  },
) {
  const formData = new FormData();
  formData.set('title', payload.title);
  formData.set('file', payload.file);
  if (payload.assetType) {
    formData.set('assetType', payload.assetType);
  }

  return new Promise<{ data: { id: string | null; lessonNodeId: string; assetType: string; title: string; fileUrl: string | null; externalUrl: string | null; mimeType: string | null; sizeBytes: number | null } }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getApiBase()}/api/lesson-nodes/${nodeId}/assets/upload`);

    if (session?.token) {
      xhr.setRequestHeader('Authorization', `Bearer ${session.token}`);
    }
    xhr.upload.onprogress = (event) => {
      if (!options?.onProgress) return;
      if (!event.lengthComputable || event.total <= 0) {
        options.onProgress(0);
        return;
      }
      options.onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };

    xhr.onload = () => {
      const text = xhr.responseText || '';
      const data = text ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })() : null;

      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = typeof data === 'object' && data && 'error' in data ? String((data as { error?: string }).error || '') : '';
        const message = detail
          ? `Upload failed ${xhr.responseURL || `/api/lesson-nodes/${nodeId}/assets/upload`} (${xhr.status}): ${detail}`
          : `Upload failed ${xhr.responseURL || `/api/lesson-nodes/${nodeId}/assets/upload`} (${xhr.status})`;
        reject(new ApiError(message, xhr.status));
        return;
      }

      resolve(data as { data: { id: string | null; lessonNodeId: string; assetType: string; title: string; fileUrl: string | null; externalUrl: string | null; mimeType: string | null; sizeBytes: number | null } });
    };

    xhr.onerror = () => {
      reject(new ApiError(`Upload failed ${xhr.responseURL || `/api/lesson-nodes/${nodeId}/assets/upload`} (0)`, 0));
    };

    xhr.send(formData);
  });
}

export function deleteLessonAsset(
  session: EducatorSession,
  nodeId: string,
  assetId: string,
) {
  return requestNest<{ data: { lessonNodeId: string; assetId: string; deleted: boolean } }>(
    `/lesson-nodes/${nodeId}/assets/${assetId}`,
    {
      method: 'DELETE',
    },
    session,
  ).catch(async (error) => {
    if (!shouldFallbackToLegacy(error)) {
      throw error;
    }

    return request<{ data: { lessonNodeId: string; assetId: string; deleted: boolean } }>(
      `/api/lesson-nodes/${nodeId}/assets/${assetId}`,
      {
        method: 'DELETE',
      },
      session,
    );
  });
}

export function upsertLessonTranscript(
  session: EducatorSession,
  nodeId: string,
  payload: {
    language?: string;
    status?: 'ready' | 'processing' | 'failed' | 'uploading';
    fullText?: string;
    segments: Array<{
      seek: string;
      progress: number;
      text: string;
    }>;
  },
) {
  return requestNest<{ data: { id: string; lessonNodeId: string } }>(
    `/lesson-nodes/${nodeId}/transcript`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function createVideoUploadUrl(
  session: EducatorSession,
  nodeId: string,
  payload: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
  },
) {
  return requestNest<{
    data: {
      videoAssetId: string;
      lessonNodeId: string;
      fileName: string;
      uploadUrl: string;
      expiresAt: string;
    };
  }>(
    `/lesson-nodes/${nodeId}/videos/upload-url`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function createLegacyVideoUploadSession(
  session: EducatorSession,
  nodeId: string,
  payload: {
    originalFileName: string;
    originalMimeType: string;
    fileSize: number;
    totalChunks: number;
  },
  signal?: AbortSignal,
) {
  return request<{
    data: {
      uploadId: string;
      chunkSize: number;
      totalChunks: number;
    };
  }>(
    `/api/lesson-nodes/${nodeId}/videos/uploads/session`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    },
    session,
  );
}

export function uploadLegacyVideoChunk(
  session: EducatorSession,
  nodeId: string,
  uploadId: string,
  payload: FormData,
  signal?: AbortSignal,
) {
  return requestForm<{
    data?: {
      receivedChunkIndex?: number;
      uploadedChunks?: number;
      totalChunks?: number;
    };
  }>(
    `/api/lesson-nodes/${nodeId}/videos/uploads/session/${encodeURIComponent(uploadId)}/chunk`,
    {
      method: 'POST',
      body: payload,
      signal,
    },
    session,
  );
}

export function finalizeLegacyVideoUpload(session: EducatorSession, nodeId: string, uploadId: string, signal?: AbortSignal) {
  return request<{
    data: {
      mediaId: string;
      moduleId: string;
      status: string;
    };
  }>(
    `/api/lesson-nodes/${nodeId}/videos/uploads/session/${encodeURIComponent(uploadId)}/finalize`,
    {
      method: 'POST',
      body: JSON.stringify({}),
      signal,
    },
    session,
  );
}

export function cancelLegacyVideoUpload(
  session: EducatorSession,
  nodeId: string,
  uploadId: string,
  payload: {
    mediaId?: string | null;
  } = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (payload.mediaId) {
    query.set('mediaId', payload.mediaId);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{
    data: {
      cancelled: boolean;
      uploadId: string | null;
      mediaId: string | null;
    };
  }>(
    `/api/lesson-nodes/${nodeId}/videos/uploads/session/${encodeURIComponent(uploadId)}${suffix}`,
    {
      method: 'DELETE',
      signal,
    },
    session,
  );
}

export function startLegacyVideoTranscode(session: EducatorSession, nodeId: string, mediaId: string, signal?: AbortSignal) {
  return request<{
    data: {
      mediaId: string;
      moduleId: string;
      status: string;
      progress?: number;
      jobId?: string;
    };
  }>(
    `/api/lesson-nodes/${nodeId}/videos/transcode?mediaId=${encodeURIComponent(mediaId)}`,
    {
      method: 'POST',
      body: JSON.stringify({}),
      signal,
    },
    session,
  );
}

export function fetchLegacyVideoStatus(session: EducatorSession, nodeId: string, mediaId: string, signal?: AbortSignal) {
  return request<{
    data: {
      mediaId: string;
      status?: string;
      stage?: string;
      progress?: number;
      error?: string | null;
      playbackUrl?: string | null;
      r2?: {
        masterUrl?: string | null;
        posterUrl?: string | null;
      } | null;
      timedOut?: boolean;
    };
  }>(
    `/api/lesson-nodes/${nodeId}/videos/status?mediaId=${encodeURIComponent(mediaId)}`,
    { method: 'GET', signal },
    session,
  );
}

export function fetchVideoTranscript(session: EducatorSession, videoAssetId: string) {
  return requestNest<TranscriptResponse>(`/videos/${videoAssetId}/transcript`, { method: 'GET' }, session);
}

export function createPaymentSession(session: EducatorSession, courseId: string) {
  return request<PaymentSessionResult>(
    '/api/payments/create-session',
    {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    },
    session,
  );
}

export function confirmPaymentSession(
  session: EducatorSession,
  payload: {
    courseId: string;
    sessionId: string;
  },
) {
  return request<PaymentConfirmResult>(
    '/api/payments/confirm',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function createTutor(session: EducatorSession, payload: CreateTutorPayload) {
  return request<TutorCreateResult>(
    '/api/admin/tutors',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function fetchTutors(session: EducatorSession) {
  return request<TutorDirectory>('/api/admin/tutors', { method: 'GET' }, session);
}

export function fetchPricingConfig(session: EducatorSession) {
  return request<PricingConfig>('/api/admin/pricing', { method: 'GET' }, session);
}

export function savePricingConfig(session: EducatorSession, payload: PricingConfig) {
  return request<PricingConfig>(
    '/api/admin/pricing',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function fetchTenantCommerceConfig(session: EducatorSession) {
  return request<{ commerce: CommerceConfig }>('/api/tenant/commerce', { method: 'GET' }, session);
}

export function saveTenantCommerceConfig(session: EducatorSession, payload: CommerceConfig) {
  return request<{ commerce: CommerceConfig }>(
    '/api/tenant/commerce',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function fetchCoursePricing(session: EducatorSession, courseId: string) {
  return request<CoursePricingResponse>(`/api/courses/${courseId}/pricing`, { method: 'GET' }, session);
}

export function saveCoursePricing(
  session: EducatorSession,
  courseId: string,
  payload: {
    priceMinor: number;
    compareAtPriceMinor?: number | null;
    currency?: string;
    allowCoupons?: boolean;
    allowPromotions?: boolean;
    showPricePublicly?: boolean;
    salesStartsAt?: string | null;
    salesEndsAt?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  return request<{ course: CoursePricingResponse['course']; pricing: CoursePricing }>(
    `/api/courses/${courseId}/pricing`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function createCourseDiscount(
  session: EducatorSession,
  courseId: string,
  payload: {
    mode?: 'AUTO' | 'CODE';
    code?: string | null;
    name: string;
    description?: string | null;
    discountType?: 'PERCENT' | 'AMOUNT' | 'FREE';
    discountValue?: number | null;
    discountAmountMinor?: number | null;
    currency?: string;
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
    stackable?: boolean;
    priority?: number;
    maxRedemptions?: number | null;
    maxRedemptionsPerStudent?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  return request<{ course: CoursePricingResponse['course']; campaign: CourseDiscountCampaign }>(
    `/api/courses/${courseId}/discounts`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function updateCourseDiscount(
  session: EducatorSession,
  courseId: string,
  discountId: string,
  payload: {
    name?: string;
    description?: string | null;
    code?: string | null;
    discountType?: 'PERCENT' | 'AMOUNT' | 'FREE';
    discountValue?: number | null;
    discountAmountMinor?: number | null;
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
    stackable?: boolean;
    priority?: number;
    maxRedemptions?: number | null;
    maxRedemptionsPerStudent?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  return request<{ campaign: CourseDiscountCampaign }>(
    `/api/courses/${courseId}/discounts/${discountId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function deleteCourseDiscount(session: EducatorSession, courseId: string, discountId: string) {
  return request<{ deleted: boolean; discountId: string }>(
    `/api/courses/${courseId}/discounts/${discountId}`,
    {
      method: 'DELETE',
    },
    session,
  );
}
