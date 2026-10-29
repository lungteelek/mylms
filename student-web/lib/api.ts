export type LoginPayload = {
  email: string;
  password: string;
  tenantSlug?: string;
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
  features: Record<string, boolean>;
};

export type CourseItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  description?: string;
  subject?: string;
  level?: string;
  updatedAt?: string;
  pricing?: {
    priceMinor: number;
    compareAtPriceMinor?: number | null;
    currency?: string;
    allowCoupons?: boolean;
    allowPromotions?: boolean;
    showPricePublicly?: boolean;
    salesStartsAt?: string | null;
    salesEndsAt?: string | null;
  } | null;
  modules?: Array<{
    id: string;
    title: string;
    content?: string;
    path?: string;
    depth?: number;
    nodeType?: string;
    videoUrl?: string;
    videoStatus?: string | null;
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

export type MyEnrollment = {
  id: number;
  tenantId: number;
  userId: number;
  courseId: number;
  progress: number;
  createdAt?: string;
  updatedAt?: string;
  course: {
    id: number;
    title: string;
    description?: string | null;
    instructor?: {
      name: string;
    } | null;
  };
};

export type CourseCatalogItem = {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  status?: string;
  instructor?: {
    name?: string;
    email?: string;
  };
  updatedAt?: string;
};

export type PaymentSessionResult = {
  sessionId: string;
  orderId?: number;
  courseTitle: string;
  amount: number;
  amountMinor?: number;
  grossAmountMinor?: number;
  discountAmountMinor?: number;
  currency: string;
  couponCode?: string | null;
  pricing?: {
    priceMinor: number;
    compareAtPriceMinor?: number | null;
    currency?: string;
    allowCoupons?: boolean;
    allowPromotions?: boolean;
    showPricePublicly?: boolean;
  } | null;
};

export type PaymentConfirmResult = {
  message: string;
  order?: {
    id: number;
    status: string;
    grossAmountMinor: number;
    discountAmountMinor: number;
    netAmountMinor: number;
    currency: string;
  } | null;
  enrollment: {
    id?: number;
    tenantId?: number;
    userId?: number;
    courseId?: number;
  };
};

export type StudentOrder = {
  id: number;
  tenantId: number;
  courseId: number;
  userId: number;
  billingModel: 'MONTHLY' | 'REVENUE_SHARE';
  checkoutOwner: 'PLATFORM' | 'TUTOR';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELED';
  grossAmountMinor: number;
  discountAmountMinor: number;
  netAmountMinor: number;
  currency: string;
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  course: {
    id: number;
    title: string;
    description?: string | null;
    slug?: string;
    instructor?: {
      name: string;
    } | null;
  };
  discountRedemptions?: Array<{
    id: number;
    campaign: {
      id: number;
      name: string;
      code?: string | null;
      discountType: 'PERCENT' | 'AMOUNT' | 'FREE';
    };
    discountAmountMinor: number | null;
  }>;
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
  if (session?.user.tenant.slug) {
    headers.set('x-tenant-slug', session.user.tenant.slug);
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
  if (session?.user.tenant.slug) {
    headers.set('x-tenant-slug', session.user.tenant.slug);
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

export async function login(payload: LoginPayload): Promise<EducatorSession> {
  const tenantSlug = payload.tenantSlug?.trim();
  const tenantHeaders: HeadersInit = {};
  if (tenantSlug) {
    (tenantHeaders as Record<string, string>)['x-tenant-slug'] = tenantSlug;
  }
  const [data, nestData] = await Promise.all([
    request<{
      user: EducatorSession['user'];
      token: string;
      license?: EducatorSession['license'];
      features?: Record<string, boolean>;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: tenantHeaders,
    }),
    requestNest<{
      data: {
        accessToken: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: tenantHeaders,
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

export function fetchMyEnrollments(session: EducatorSession) {
  return request<MyEnrollment[]>('/api/enrollments/my', { method: 'GET' }, session);
}

export function fetchMyOrders(session: EducatorSession) {
  return request<{ total: number; orders: StudentOrder[] }>('/api/payments/my/orders', { method: 'GET' }, session);
}

export async function enrollInCourse(session: EducatorSession, courseId: string, couponCode?: string) {
  const payment = await createPaymentSession(session, courseId, couponCode);
  await confirmPaymentSession(session, {
    courseId,
    sessionId: payment.sessionId,
  });
  const existing = await fetchMyEnrollments(session);
  const matched = existing.find((item) => String(item.courseId) === String(courseId));
  if (!matched) {
    throw new ApiError('ลงทะเบียนคอร์สสำเร็จแต่ไม่พบรายการ enrollment ล่าสุด', 500);
  }
  return matched;
}

export function fetchStudents(session: EducatorSession) {
  return request<StudentSummary>('/api/admin/students', { method: 'GET' }, session);
}

export function fetchTenantContext(session: EducatorSession) {
  return request<TenantContext>('/api/tenant/context', { method: 'GET' }, session);
}

export function fetchCourseDetail(session: EducatorSession, courseId: string) {
  return request<CourseItem>(`/api/courses/${courseId}`, { method: 'GET' }, session);
}

export function fetchNestCourses(session: EducatorSession) {
  return requestNest<NestCourseListResponse>('/courses', { method: 'GET' }, session).then((data) => data.data.items || []);
}

export function fetchCourseTree(session: EducatorSession, courseId: string) {
  return requestNest<NestCourseTree>(`/courses/${courseId}/tree`, { method: 'GET' }, session);
}

export function publishCourse(session: EducatorSession, courseId: string) {
  return requestNest<{ data: { id: string; status: string; publishedAt: string } }>(
    `/courses/${courseId}/publish`,
    { method: 'POST' },
    session,
  );
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
  );
}

export function updateCourse(session: EducatorSession, courseId: string, payload: Partial<Pick<CourseItem, 'title' | 'description' | 'subject' | 'level'>>) {
  return requestNest<{ data: CourseItem }>(
    `/courses/${courseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function createCourse(session: EducatorSession, payload: Required<Pick<CourseItem, 'title' | 'slug'>> & Partial<Pick<CourseItem, 'description' | 'subject' | 'level'>>) {
  return requestNest<{ data: CourseItem }>(
    '/courses',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    session,
  );
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
  );
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
  );
}

export function deleteLessonNode(session: EducatorSession, nodeId: string) {
  return requestNest<{ data: { lessonNodeId: string; deleted: boolean } }>(
    `/lesson-nodes/${nodeId}`,
    { method: 'DELETE' },
    session,
  );
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
  );
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

export function fetchVideoTranscript(session: EducatorSession, videoAssetId: string) {
  return requestNest<TranscriptResponse>(`/videos/${videoAssetId}/transcript`, { method: 'GET' }, session);
}

export function createPaymentSession(session: EducatorSession, courseId: string, couponCode?: string) {
  return request<PaymentSessionResult>(
    '/api/payments/create-session',
    {
      method: 'POST',
      body: JSON.stringify({ courseId, couponCode }),
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
