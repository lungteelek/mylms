(function () {
  const STORAGE_KEY = 'coursechic.auth.session';
  const LESSON_PREVIEW_KEY = 'coursechic.courseBuilder.lessonPreview';
  const UI_VIEW_KEY = 'coursechic.ui.view';
  const DEFAULT_TENANT_SLUG = 'coursechic';

  function getHostTenantSlug() {
    try {
      const host = window.location.hostname.toLowerCase();
      const appDomain = 'coursechic.com';
      if (!host.endsWith(`.${appDomain}`) || host === appDomain) {
        return null;
      }
      return host.slice(0, -(appDomain.length + 1));
    } catch {
      return null;
    }
  }
  window.ASTRA_NEST_API_BASE = window.ASTRA_NEST_API_BASE || 'http://localhost:3001/api';

  function readSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function formatRequestError(message, scope = 'request') {
    const text = String(message || '').trim();
    if (!text) {
      return scope === 'nest' ? 'เชื่อมต่อกับ backend ไม่สำเร็จ' : 'เชื่อมต่อไม่สำเร็จ';
    }
    return text;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function hasSession() {
    return Boolean(readSession()?.token);
  }

  async function request(path, options = {}) {
    const session = readSession();
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (session?.token) {
      headers.set('Authorization', `Bearer ${session.token}`);
    }

    if (session?.tenantSlug) {
      headers.set('x-tenant-slug', session.tenantSlug);
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(formatRequestError(data?.error || `Request failed (${response.status})`));
    }

    return data;
  }

  async function requestNest(path, options = {}) {
    const session = readSession();
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (session?.nestToken) {
      headers.set('Authorization', `Bearer ${session.nestToken}`);
    }

    if (session?.tenantSlug) {
      headers.set('x-tenant-slug', session.tenantSlug);
    }

    const response = await fetch(`${window.ASTRA_NEST_API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(formatRequestError(data?.error || `Nest request failed (${response.status})`, 'nest'));
    }

    return data;
  }

  async function login({ email, password, tenantSlug = null }) {
    const effectiveTenantSlug = tenantSlug || readSession()?.tenantSlug || getHostTenantSlug() || null;
    const loginPayload = {
      email,
      password,
      ...(effectiveTenantSlug ? { tenantSlug: effectiveTenantSlug } : {}),
    };
    const [expressData, nestData] = await Promise.all([
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginPayload),
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveTenantSlug ? { 'x-tenant-slug': effectiveTenantSlug } : {}),
        },
      }),
      requestNest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginPayload),
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveTenantSlug ? { 'x-tenant-slug': effectiveTenantSlug } : {}),
        },
      }).catch(() => null),
    ]);

    writeSession({
      token: expressData.token,
      nestToken: nestData?.data?.accessToken || nestData?.accessToken || null,
      nestApiBase: window.ASTRA_NEST_API_BASE,
      tenantSlug: expressData.user?.tenant?.slug || effectiveTenantSlug || null,
      user: expressData.user,
      license: expressData.license || null,
      features: expressData.features || {},
    });

    return {
      express: expressData,
      nest: nestData,
    };
  }

  async function loginWithGoogle({ idToken, tenantSlug = null }) {
    const effectiveTenantSlug = tenantSlug || readSession()?.tenantSlug || getHostTenantSlug() || null;
    const expressData = await request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
        ...(effectiveTenantSlug ? { tenantSlug: effectiveTenantSlug } : {}),
      }),
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveTenantSlug ? { 'x-tenant-slug': effectiveTenantSlug } : {}),
      },
    });

    writeSession({
      token: expressData.token,
      nestToken: null,
      nestApiBase: window.ASTRA_NEST_API_BASE,
      tenantSlug: expressData.user?.tenant?.slug || effectiveTenantSlug || null,
      user: expressData.user,
      license: expressData.license || null,
      features: expressData.features || {},
      provider: 'google',
      google: expressData.google || null,
    });

    return {
      express: expressData,
      nest: null,
    };
  }

  function logout() {
    clearSession();
  }

  function getSession() {
    return readSession();
  }

  function updateSessionSelection(partial) {
    const session = readSession();
    if (!session) return null;
    const next = {
      ...session,
      ...partial,
    };
    writeSession(next);
    return next;
  }

  function setLessonPreview(preview) {
    localStorage.setItem(LESSON_PREVIEW_KEY, JSON.stringify(preview));
  }

  function getLessonPreview() {
    try {
      const raw = localStorage.getItem(LESSON_PREVIEW_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearLessonPreview() {
    localStorage.removeItem(LESSON_PREVIEW_KEY);
  }

  function setUiView(viewKey, viewValue) {
    try {
      const current = JSON.parse(localStorage.getItem(UI_VIEW_KEY) || '{}');
      localStorage.setItem(UI_VIEW_KEY, JSON.stringify({
        ...current,
        [viewKey]: viewValue,
      }));
    } catch {
      localStorage.setItem(UI_VIEW_KEY, JSON.stringify({ [viewKey]: viewValue }));
    }
  }

  function getUiView(viewKey, fallback = null) {
    try {
      const current = JSON.parse(localStorage.getItem(UI_VIEW_KEY) || '{}');
      return current[viewKey] ?? fallback;
    } catch {
      return fallback;
    }
  }

  function formatCurrency(amount) {
    return `฿${Number(amount || 0).toLocaleString('en-US')}`;
  }

  function slugifyCourseTitle(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function resolveRemoteCourseId(baseCourse, remoteCourses, preferredId) {
    const items = Array.isArray(remoteCourses) ? remoteCourses : [];
    if (!items.length) return preferredId || null;

    const preferred = preferredId
      ? items.find((item) => String(item.id) === String(preferredId))
      : null;
    if (preferred) {
      return String(preferred.id);
    }

    const title = String(baseCourse?.title || '').trim().toLowerCase();
    const slug = slugifyCourseTitle(baseCourse?.title || '');
    const byTitle = items.find((item) => String(item.title || '').trim().toLowerCase() === title);
    if (byTitle) {
      return String(byTitle.id);
    }

    const bySlug = items.find((item) => String(item.slug || '').trim().toLowerCase() === slug);
    return bySlug ? String(bySlug.id) : null;
  }

  async function attachRemoteCourseTree(baseCourse, remoteCourseId, requestNestFn) {
    if (!remoteCourseId || typeof requestNestFn !== 'function') {
      return {
        ...baseCourse,
        remoteCourseId: remoteCourseId || null,
      };
    }

    try {
      const courseTree = await requestNestFn(`/courses/${remoteCourseId}/tree`);
      const treeNodes = Array.isArray(courseTree?.data?.nodes) ? courseTree.data.nodes : [];
      if (!treeNodes.length) {
        return {
          ...baseCourse,
          remoteCourseId,
        };
      }

      return {
        ...baseCourse,
        remoteCourseId,
        modules: flattenLessonTree(treeNodes).map((node) => nodeToModule(node)),
        tree: treeNodes,
      };
    } catch {
      return {
        ...baseCourse,
        remoteCourseId,
      };
    }
  }

  function buildTranscriptFromModule(module) {
    const text = (module?.content || module?.title || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) {
      return [
        { seek: '00:00', progress: 18, text: 'Open the lesson content to load the transcript preview.' },
      ];
    }

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .slice(0, 4);

    return sentences.map((sentence, index) => ({
      seek: `${12 + index}:${(18 + index * 24).toString().padStart(2, '0')}`,
      progress: 42 + index * 4,
      text: sentence,
    }));
  }

  function buildTranscriptFromSegments(segments) {
    if (!Array.isArray(segments) || !segments.length) {
      return [];
    }

    const total = segments.length;
    return segments.map((segment, index) => ({
      seek: segment.seek || '00:00',
      progress: segment.progress || Math.max(1, Math.round(((index + 1) / total) * 100)),
      text: segment.text || '',
    }));
  }

  function buildPlannerFromCourse(course) {
    const modules = Array.isArray(course?.modules) ? course.modules : [];
    const baseHour = 19;
    return [
      ...modules.slice(0, 2).map((module, index) => {
        const startHour = baseHour + index;
        return {
          time: `${String(startHour).padStart(2, '0')}:30 - ${String(startHour).padStart(2, '0')}:55`,
          text: `ทบทวน ${module.title}`,
        };
      }),
      {
        time: '21:00 - 21:15',
        text: `รีวิวสรุปบทเรียนจาก ${course?.title || 'คอร์สนี้'}`,
      },
    ];
  }

  function flattenLessonTree(nodes, depth = 1, prefix = []) {
    const list = [];
    (Array.isArray(nodes) ? nodes : []).forEach((node, index) => {
      const nextPrefix = [...prefix, index + 1];
      list.push({
        ...node,
        depth: node.depth || depth,
        path: node.path || nextPrefix.join('.'),
      });
      if (Array.isArray(node.children) && node.children.length) {
        list.push(...flattenLessonTree(node.children, depth + 1, nextPrefix));
      }
    });
    return list;
  }

  function nodeToModule(node) {
    const asset = node?.asset || {};
    return {
      id: node?.id,
      title: node?.title || 'Untitled lesson',
      content: node?.plainText || node?.description || node?.htmlContent || '',
      videoUrl: asset.type === 'url' ? asset.url || asset.externalUrl || '' : '',
      asset,
      transcriptSegments: Array.isArray(node?.transcriptSegments) ? node.transcriptSegments : [],
      path: node?.path || '',
      depth: node?.depth || 1,
      nodeType: node?.nodeType || 'lesson',
    };
  }

  function pickPrimaryLesson(nodes) {
    const flat = flattenLessonTree(nodes);
    const priority = flat.find((node) => Array.isArray(node.transcriptSegments) && node.transcriptSegments.length)
      || flat.find((node) => String(node.plainText || node.description || node.htmlContent || '').trim())
      || flat.find((node) => node.asset && node.asset.type && node.asset.type !== 'none')
      || flat[0]
      || null;
    return priority;
  }

  function buildStudentPreview(lesson, course) {
    const selectedLesson = lesson || {};
    const parentTitle = course?.title || 'Course preview';
    const nodes = Array.isArray(course?.nodes) ? course.nodes : [];
    const path = selectedLesson.path || selectedLesson.trail?.join('.') || '1';
    const title = selectedLesson.title || 'Preview lesson';
    const content = selectedLesson.plainText || selectedLesson.description || selectedLesson.htmlContent || 'Lesson preview is empty.';
    const transcript = buildTranscriptFromSegments(selectedLesson.transcriptSegments?.length ? selectedLesson.transcriptSegments : buildTranscriptFromModule({
      title,
      content,
    }).map((segment) => ({
      seek: segment.seek,
      progress: segment.progress,
      text: segment.text,
    })));
    const asset = selectedLesson.asset || {};
    const files = [];
    if (asset.type === 'pdf' || asset.fileUrl) {
      files.push({
        title: asset.fileName || `${title}.pdf`,
        label: 'download',
        href: asset.fileUrl || asset.url || '#',
        external: false,
      });
    }
    if (asset.type === 'url' || asset.externalUrl || asset.url) {
      files.push({
        title: asset.externalUrl || asset.url || 'External resource',
        label: 'open link',
        href: asset.externalUrl || asset.url || '#',
        external: true,
      });
    }

    return {
      mode: 'preview',
      user: {
        name: 'Lesson preview',
        email: 'preview@astra.local',
      },
      tenant: {
        name: 'Preview workspace',
      },
      progress: 0,
      lessonsThisWeek: Math.max(1, nodes.length || 1),
      daysLeft: 999,
      resumeAt: '00:00',
      selectedCourse: {
        title: parentTitle,
        slug: slugifyCourseTitle(parentTitle) || 'course-preview',
        modules: nodes,
      },
      selectedModuleTitle: title,
      lessonPath: path,
      transcript,
      files,
      planner: buildPlannerFromCourse({ title: parentTitle, modules: nodes }),
      courseMap: [parentTitle, ...nodes.map((node) => node.title)],
      aiSummary: content ? `Preview summary: ${content}` : 'Preview lesson has no content yet.',
      aiExercise: asset.type !== 'none'
        ? 'This preview lesson already has a resource attached.'
        : 'Attach a PDF or link to see the preview become more complete.',
      previewBadges: [
        selectedLesson.nodeType || 'lesson',
        `~${selectedLesson.estimatedMinutes || 0} min`,
        selectedLesson.contentType || 'article',
      ],
      selectedLesson,
    };
  }

  async function loadAdminDashboard(options = {}) {
    const session = readSession();
    if (!session?.token) {
      throw new Error('No active session');
    }

    const [tenantContext, instructorCourses, students, knowledgeBases, remoteCoursesResponse] = await Promise.all([
      request('/api/tenant/context'),
      request('/api/courses/instructor'),
      request('/api/admin/students'),
      session?.nestToken ? requestNest('/knowledge-bases').catch(() => ({ data: { items: [] } })) : Promise.resolve({ data: { items: [] } }),
      session?.nestToken ? requestNest('/courses').catch(() => ({ data: { items: [] } })) : Promise.resolve({ data: { items: [] } }),
    ]);

    const courses = Array.isArray(instructorCourses) ? instructorCourses : [];
    const courseId = options.courseId || session?.lastSelectedCourseId || courses[0]?.id || null;
    const selectedKnowledgeBaseId = options.knowledgeBaseId || session?.lastSelectedKnowledgeBaseId || knowledgeBases?.data?.items?.[0]?.id || null;
    const baseSelectedCourse = courseId
      ? {
          ...(await request(`/api/courses/${courseId}?tenantSlug=${encodeURIComponent(session.tenantSlug || DEFAULT_TENANT_SLUG)}`)),
        }
      : { title: 'ยังไม่มีคอร์ส', modules: [] };
    const remoteCourses = remoteCoursesResponse?.data?.items || [];
    const resolvedRemoteCourseId = resolveRemoteCourseId(baseSelectedCourse, remoteCourses, session?.lastSelectedRemoteCourseId);
    const selectedCourse = await attachRemoteCourseTree(baseSelectedCourse, resolvedRemoteCourseId, session?.nestToken ? requestNest : null);
    const selectedKnowledgeBase = Array.isArray(knowledgeBases?.data?.items)
      ? knowledgeBases.data.items.find((item) => String(item.id) === String(selectedKnowledgeBaseId)) || knowledgeBases.data.items[0] || null
      : null;
    const knowledgeBaseDocuments = selectedKnowledgeBase?.id && session?.nestToken
      ? await requestNest(`/knowledge-bases/${selectedKnowledgeBase.id}/documents`).catch(() => ({ data: { items: [] } }))
      : { data: { items: [] } };

    return {
      user: session.user,
      tenant: tenantContext.tenant,
      license: tenantContext.license,
      features: tenantContext.features || {},
      courses,
      selectedCourse,
      selectedCourseId: courseId,
      selectedKnowledgeBase,
      selectedKnowledgeBaseId,
      selectedKnowledgeBaseDocuments: knowledgeBaseDocuments?.data?.items || [],
      remoteCourses,
      students: {
        summary: {
          total: students.total || 0,
          active: students.active || 0,
          expiring: students.expiring || 0,
          expired: students.expired || 0,
        },
        items: students.students || [],
      },
      knowledgeBases: knowledgeBases?.data?.items || [],
    };
  }

  async function loadStudentDashboard() {
    const session = readSession();
    if (!session?.token) {
      throw new Error('No active session');
    }

    const [tenantContext, enrollments, remoteCoursesResponse] = await Promise.all([
      request('/api/tenant/context'),
      request('/api/enrollments/my'),
      session?.nestToken ? requestNest('/courses').catch(() => ({ data: { items: [] } })) : Promise.resolve({ data: { items: [] } }),
    ]);

    const enrollmentList = Array.isArray(enrollments) ? enrollments : [];
    const firstEnrollment = enrollmentList[0];
    const selectedCourseId = firstEnrollment?.course?.id;
    const baseCourse = selectedCourseId
      ? await request(`/api/courses/${selectedCourseId}?tenantSlug=${encodeURIComponent(session.tenantSlug || DEFAULT_TENANT_SLUG)}`)
      : { title: 'ยังไม่มีคอร์ส', modules: [] };

    const remoteCourseId = resolveRemoteCourseId(baseCourse, remoteCoursesResponse?.data?.items || [], session?.lastSelectedRemoteCourseId);
    const selectedCourse = await attachRemoteCourseTree(baseCourse, remoteCourseId, session?.nestToken ? requestNest : null);
    const treeNodes = Array.isArray(selectedCourse?.tree) ? selectedCourse.tree : [];
    const flattenedTree = flattenLessonTree(treeNodes);
    const selectedModuleNode = pickPrimaryLesson(treeNodes);
    const selectedModule = selectedModuleNode ? nodeToModule(selectedModuleNode) : (baseCourse.modules?.[0] || null);

    const transcript = selectedModule?.transcriptSegments?.length
      ? buildTranscriptFromSegments(selectedModule.transcriptSegments)
      : buildTranscriptFromModule(selectedModule);
    const planner = buildPlannerFromCourse(selectedCourse);
    const files = (selectedModuleNode?.asset && selectedModuleNode.asset.type && selectedModuleNode.asset.type !== 'none'
      ? [selectedModuleNode.asset]
      : selectedCourse.modules || []
    ).slice(0, 3).map((moduleOrAsset, index) => {
      const moduleTitle = moduleOrAsset.title || moduleOrAsset.fileName || moduleOrAsset.url || `Resource ${index + 1}`;
      const asset = moduleOrAsset.asset || moduleOrAsset;
      const href = asset.fileUrl || asset.externalUrl || asset.url || `/api/courses/${selectedCourseId}?tenantSlug=${encodeURIComponent(session.tenantSlug || DEFAULT_TENANT_SLUG)}`;
      const external = Boolean(asset.externalUrl || asset.url);
      return {
        title: `${moduleTitle}${external ? '' : '.pdf'}`,
        label: index === 0 ? 'download' : 'view',
        href,
        external,
      };
    });

    return {
      user: session.user,
      tenant: tenantContext.tenant,
      progress: Math.round(firstEnrollment?.progress || 0),
      lessonsThisWeek: Math.max(1, (selectedCourse.modules || []).length),
      daysLeft: Math.max(7, 30 - Math.round((firstEnrollment?.progress || 0) / 4)),
      resumeAt: firstEnrollment?.progress ? `${String(12 + Math.floor(firstEnrollment.progress / 20)).padStart(2, '0')}:40` : (selectedModuleNode?.transcriptSegments?.[0]?.seek || '--:--'),
      selectedCourse,
      selectedModuleTitle: selectedModule?.title || selectedCourse.title,
      transcript,
      files,
      planner,
      courseMap: [
        selectedCourse.title,
        ...(selectedCourse.modules || []).map((module) => `${'•'.repeat(Math.max(0, (module.depth || 1) - 1))} ${module.title}`),
      ],
      aiSummary: selectedModule
        ? `สรุปจากเนื้อหาจริงของ "${selectedModule.title}" คือ ${selectedModule.content || 'lesson note'}`
        : `สรุปจาก ${selectedCourse.title} ยังไม่มีข้อมูลโมดูล`,
      aiExercise: selectedModule
        ? `โจทย์จากคอร์สนี้จะอิง ${selectedModule.title} และใช้ knowledge base ของ tenant เท่านั้น`
        : `โจทย์จะถูกสร้างจาก ${selectedCourse.title}`,
    };
  }

  function loadStudentPreview() {
    const preview = getLessonPreview();
    if (!preview) {
      throw new Error('No preview available');
    }

    return buildStudentPreview(preview.lesson, preview.course);
  }

  window.CourseChic = {
    login,
    loginWithGoogle,
    logout,
    hasSession,
    getSession,
    updateSessionSelection,
    request,
    requestNest,
    loadAdminDashboard,
    loadStudentDashboard,
    loadStudentPreview,
    setLessonPreview,
    getLessonPreview,
    clearLessonPreview,
    setUiView,
    getUiView,
    formatCurrency,
  };
})();
