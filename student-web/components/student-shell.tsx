'use client';

import Script from 'next/script';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  enrollInCourse,
  fetchCourseDetail,
  fetchCourses,
  fetchMyEnrollments,
  fetchMyOrders,
  fetchTenantContext,
  login,
  type CourseItem,
  type EducatorSession,
  type LoginPayload,
  type MyEnrollment,
  type StudentOrder,
  type TenantContext,
} from '../lib/api';

type CourseModule = NonNullable<CourseItem['modules']>[number];

type PresetId = 'student-a' | 'student-b' | 'student-c';

type ProfilePreset = {
  id: PresetId;
  label: string;
  description: string;
  payload: LoginPayload;
};

type HlsInstance = {
  loadSource: (source: string) => void;
  attachMedia: (media: HTMLVideoElement) => void;
  on: (event: string, handler: () => void) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    Hls?: {
      isSupported?: () => boolean;
      Events?: {
        MANIFEST_PARSED: string;
        ERROR: string;
      };
      ErrorTypes?: {
        NETWORK_ERROR?: string;
      };
      new (options?: Record<string, unknown>): HlsInstance;
    };
  }
}

const SESSION_KEY = 'coursechic.student.session.v1';
const SERVER_TIME_ZONE = 'Asia/Bangkok';
const SERVER_UTC_OFFSET_HOURS = 7;

const PRESETS: ProfilePreset[] = [
  {
    id: 'student-a',
    label: 'Ploy Student',
    description: 'บัญชีตัวอย่างสำหรับติดตามคอร์สและ progress ต่อเนื่อง',
    payload: { email: 'student@example.com', password: 'password123' },
  },
  {
    id: 'student-b',
    label: 'Mint Student',
    description: 'ใช้ลองสลับคอร์สและดู resume state ของผู้เรียน',
    payload: { email: 'student2@example.com', password: 'password123' },
  },
  {
    id: 'student-c',
    label: 'Beam Student',
    description: 'ใช้ดูเส้นทางเรียนของบัญชีสาธิตอีกราย',
    payload: { email: 'student3@example.com', password: 'password123' },
  },
];

function getLoginTenantSlug() {
  if (typeof window === 'undefined') {
    return 'coursechic';
  }

  const hostname = window.location.hostname.toLowerCase();
  const rootDomain = 'coursechic.com';
  const isSubdomain = hostname.endsWith(`.${rootDomain}`) && hostname !== rootDomain;

  if (isSubdomain) {
    return hostname.slice(0, -(rootDomain.length + 1));
  }

  return 'coursechic';
}

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EducatorSession>;
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      !parsed.user ||
      typeof parsed.user.email !== 'string' ||
      typeof parsed.user.name !== 'string' ||
      typeof parsed.user.role !== 'string' ||
      !parsed.user.tenant ||
      typeof parsed.user.tenant.slug !== 'string' ||
      typeof parsed.user.tenant.name !== 'string'
    ) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed as EducatorSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(session: EducatorSession | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function normalizeServerTimestamp(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const isoLike = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?Z$/,
  );

  if (isoLike) {
    const [, year, month, day, hour, minute, second = '0', ms = '0'] = isoLike;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour) - SERVER_UTC_OFFSET_HOURS,
        Number(minute),
        Number(second),
        Number(ms.padEnd(3, '0')),
      ),
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'ยังไม่มีข้อมูล';
  const date = normalizeServerTimestamp(value);
  if (!date) return 'ยังไม่มีข้อมูล';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SERVER_TIME_ZONE,
  }).format(date);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0%';
  return `${Math.round(Number(value))}%`;
}

function formatBaht(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0 บาท';
  return `${new Intl.NumberFormat('th-TH').format(Math.round(Number(value)))} บาท`;
}

function statusTone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value.includes('published') || value.includes('active') || value.includes('ready') || value.includes('good')) return 'good';
  if (value.includes('draft') || value.includes('trial') || value.includes('watch')) return 'warn';
  if (value.includes('expired') || value.includes('failed')) return 'bad';
  return 'neutral';
}

function truncate(value?: string | null, length = 120) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'ยังไม่มีข้อมูล';
  return text.length > length ? `${text.slice(0, length).trimEnd()}...` : text;
}

function parseSeekSeconds(value?: string | null) {
  if (!value) return 0;
  const parts = value.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function readModuleText(module?: CourseModule) {
  if (!module) return 'ยังไม่มีเนื้อหา';
  return module.content || module.transcriptFullText || module.asset?.externalUrl || module.asset?.fileUrl || module.asset?.url || 'ยังไม่มีเนื้อหา';
}

function ensurePlayerSpeed(video: HTMLVideoElement | null, speed: number) {
  if (!video) return;
  video.playbackRate = speed;
}

function attemptAutoplay(video: HTMLVideoElement | null) {
  if (!video) return;
  void video.play().catch(() => undefined);
}

function compareEnrollments(a: MyEnrollment, b: MyEnrollment) {
  const progressDelta = Number(b.progress || 0) - Number(a.progress || 0);
  if (progressDelta !== 0) return progressDelta;
  const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return dateB - dateA;
}

export function StudentShell() {
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>('student-a');
  const loginTenantSlug = getLoginTenantSlug();
  const [form, setForm] = useState<LoginPayload>({ ...PRESETS[0].payload, tenantSlug: loginTenantSlug });
  const [session, setSession] = useState<EducatorSession | null>(null);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [catalog, setCatalog] = useState<CourseItem[]>([]);
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [currentCourse, setCurrentCourse] = useState<CourseItem | null>(null);
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseLoading, setCourseLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceTick, setWorkspaceTick] = useState(0);
  const [playerSpeed, setPlayerSpeed] = useState(1);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('');
  const [seekNote, setSeekNote] = useState<string>('แตะข้อความในทรานสคริปต์เพื่อข้ามไปยังจุดนั้น');
  const [hlsScriptReady, setHlsScriptReady] = useState(false);
  const [playerNotice, setPlayerNotice] = useState<string>('พร้อมเล่นบทเรียน');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<HlsInstance | null>(null);

  useEffect(() => {
    const saved = readSession();
    if (saved) {
      setSession(saved);
      const preset = PRESETS.find((item) => item.payload.email === saved.user.email) || PRESETS[0];
      setSelectedPresetId(preset.id);
      setForm({ email: saved.user.email, password: 'password123', tenantSlug: saved.user.tenant.slug || loginTenantSlug });
    }
    setHydrated(true);
  }, [loginTenantSlug]);

  useEffect(() => {
    if (!session) return;
    const currentSession = session;
    let cancelled = false;
    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      try {
        const [tenant, courseList, myEnrollments] = await Promise.all([
          fetchTenantContext(currentSession).catch(() => null),
          fetchCourses(currentSession).catch(() => []),
          fetchMyEnrollments(currentSession).catch((fetchError) => {
            if (fetchError instanceof ApiError && fetchError.status === 403) return [];
            throw fetchError;
          }),
        ]);
        if (cancelled) return;
        setTenantContext(tenant);
        setCatalog(courseList);
        setEnrollments(myEnrollments);
        const primaryEnrollment = [...myEnrollments].sort(compareEnrollments)[0] || null;
        const initialCourseId = selectedCourseId
          || (primaryEnrollment ? String(primaryEnrollment.courseId) : null)
          || (courseList[0] ? String(courseList[0].id) : null);
        if (initialCourseId) setSelectedCourseId(initialCourseId);
      } catch (workspaceError) {
        if (!cancelled) setError(workspaceError instanceof Error ? workspaceError.message : 'โหลด workspace ไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [session, workspaceTick]);

  useEffect(() => {
    if (!session || !selectedCourseId) return;
    const currentSession = session;
    const currentCourseId = selectedCourseId;
    let cancelled = false;
    async function loadCourse() {
      setCourseLoading(true);
      try {
        const result = await fetchCourseDetail(currentSession, currentCourseId);
        if (cancelled) return;
        setCurrentCourse(result);
      } catch (courseError) {
        if (!cancelled) {
          setCurrentCourse(null);
          setError(courseError instanceof Error ? courseError.message : 'โหลดข้อมูลคอร์สไม่สำเร็จ');
        }
      } finally {
        if (!cancelled) setCourseLoading(false);
      }
    }
    void loadCourse();
    return () => {
      cancelled = true;
    };
  }, [session, selectedCourseId]);

  useEffect(() => {
    if (!session) return;
    const currentSession = session;
    let cancelled = false;
    async function loadOrders() {
      try {
        const result = await fetchMyOrders(currentSession);
        if (cancelled) return;
        setOrders(result.orders || []);
      } catch {
        if (!cancelled) setOrders([]);
      }
    }
    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [session, workspaceTick]);

  const selectedEnrollment = useMemo(
    () => enrollments.find((item) => String(item.courseId) === String(selectedCourseId))
      || [...enrollments].sort(compareEnrollments)[0]
      || null,
    [enrollments, selectedCourseId],
  );
  const modules = currentCourse?.modules || [];
  const selectedModule = modules.find((module) => String(module.id) === String(selectedLessonId)) || modules[0] || null;
  const enrolledCount = enrollments.length;
  const averageProgress = enrolledCount
    ? Math.round(enrollments.reduce((sum, item) => sum + Number(item.progress || 0), 0) / enrolledCount)
    : 0;
  const catalogCount = catalog.length;
  const featureCount = Object.values(tenantContext?.features || session?.features || {}).filter(Boolean).length;
  const currentCourseProgress = selectedEnrollment?.progress || 0;
  const currentCourseTitle = currentCourse?.title || selectedEnrollment?.course.title || catalog.find((course) => String(course.id) === String(selectedCourseId))?.title || 'เลือกคอร์ส';
  const lessonLabel = selectedModule?.title || 'ยังไม่มีบทเรียนให้เล่น';
  const lessonsThisCourse = modules.length;
  const statusLabel = tenantContext?.license.status || session?.license?.status || 'active';
  const planLabel = tenantContext?.license.plan || session?.license?.plan || 'starter';
  const currentCoursePriceMinor = currentCourse?.pricing?.priceMinor ?? null;
  const currentCourseCompareAtMinor = currentCourse?.pricing?.compareAtPriceMinor ?? null;
  const selectedCourseOrders = useMemo(
    () => orders.filter((order) => String(order.courseId) === String(selectedCourseId)),
    [orders, selectedCourseId],
  );

  useEffect(() => {
    if (!modules.length) {
      setSelectedLessonId(null);
      return;
    }
    if (!selectedLessonId || !modules.some((module) => String(module.id) === String(selectedLessonId))) {
      setSelectedLessonId(String(modules[0].id));
    }
  }, [modules, selectedLessonId]);

  useEffect(() => {
    ensurePlayerSpeed(videoRef.current, playerSpeed);
  }, [playerSpeed, selectedModule]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const source = selectedModule?.videoHlsUrl || selectedModule?.videoUrl || null;
    const cleanup = () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      video.removeAttribute('src');
      video.load();
    };

    cleanup();

    if (!source) {
      setPlayerNotice('ยังไม่มีวิดีโอสำหรับบทนี้');
      return;
    }

    const isLikelyHls = Boolean(selectedModule?.videoHlsUrl || source.includes('.m3u8'));
    const canPlayNativeHls =
      typeof video.canPlayType === 'function' &&
      video.canPlayType('application/vnd.apple.mpegurl') !== '';
    const hlsAvailable = hlsScriptReady || (typeof window !== 'undefined' && Boolean(window.Hls));

    if (isLikelyHls && !canPlayNativeHls && !hlsAvailable) {
      setPlayerNotice('กำลังโหลด hls.js เพื่อเล่นวิดีโอ');
      return;
    }

    if (!isLikelyHls) {
      video.src = source;
      setPlayerNotice('เล่นไฟล์วิดีโอตรงจากแหล่งที่มา');
      attemptAutoplay(video);
      return;
    }

    if (canPlayNativeHls) {
      video.src = source;
      setPlayerNotice('เล่นผ่าน HLS native ของ browser');
      attemptAutoplay(video);
      return;
    }

    if (typeof window !== 'undefined' && window.Hls?.isSupported?.()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsInstanceRef.current = hls;
      hls.on(window.Hls.Events?.MANIFEST_PARSED || 'MANIFEST_PARSED', () => {
        attemptAutoplay(video);
      });
      hls.loadSource(source);
      hls.attachMedia(video);
      setPlayerNotice('เล่นผ่าน hls.js เพื่อรองรับ browser ส่วนใหญ่');
      return () => {
        hls.destroy();
        if (hlsInstanceRef.current === hls) {
          hlsInstanceRef.current = null;
        }
      };
    }

    video.src = source;
    setPlayerNotice('browser นี้ไม่รองรับ HLS แบบเต็ม จึงใช้ direct source แทน');
    attemptAutoplay(video);
    return undefined;
  }, [selectedModule, hlsScriptReady]);

  function applyPreset(presetId: PresetId) {
    const preset = PRESETS.find((item) => item.id === presetId) || PRESETS[0];
    setSelectedPresetId(preset.id);
    setForm({ ...preset.payload, tenantSlug: loginTenantSlug });
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextSession = await login(form);
      setSession(nextSession);
      writeSession(nextSession);
      setWorkspaceTick((tick) => tick + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ลงชื่อเข้าใช้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setTenantContext(null);
    setCatalog([]);
    setEnrollments([]);
    setSelectedCourseId(null);
    setSelectedLessonId(null);
    setCurrentCourse(null);
    setError(null);
    setEnrollError(null);
    writeSession(null);
  }

  async function handleEnroll(courseId: string, couponCode?: string) {
    if (!session) return;
    setEnrollingCourseId(courseId);
    setEnrollError(null);
    try {
      await enrollInCourse(session, courseId, couponCode?.trim() || undefined);
      setWorkspaceTick((tick) => tick + 1);
      setSelectedCourseId(courseId);
    } catch (enrollSubmitError) {
      setEnrollError(enrollSubmitError instanceof Error ? enrollSubmitError.message : 'ลงทะเบียนคอร์สไม่สำเร็จ');
    } finally {
      setEnrollingCourseId(null);
    }
  }

  function handleSeek(seek: string, label: string) {
    setSeekNote(label);
    setPlayerNotice(`กำลังข้ามไปยัง ${seek}`);
    const video = videoRef.current;
    if (!video) return;
    const seconds = parseSeekSeconds(seek);
    video.currentTime = seconds;
    void video.play().catch(() => undefined);
  }

  function handleSpeedChange(speed: number) {
    setPlayerSpeed(speed);
    ensurePlayerSpeed(videoRef.current, speed);
  }

  const activeFeatures = Object.entries(tenantContext?.features || session?.features || {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return (
    <main className="student-app">
      <div className="halo halo-a" />
      <div className="halo halo-b" />

      {!session ? (
        <section className="student-hero">
          <div className="student-hero-copy">
            <span className="hero-kicker">Student Workspace</span>
            <h1>เรียนต่อจากจุดเดิม, เห็นคอร์สและทรานสคริปต์ในหน้าที่อ่านง่าย</h1>
            <p>หน้าใหม่ `/student` ใช้ backend เดิม, ดึง course catalog, progress, transcript, และคำแนะนำเรียนต่อไว้ในพื้นที่เดียวโดยไม่ต้องกลับไปใช้หน้าผู้เรียนแบบเก่า.</p>
            <div className="hero-rail">
              <article className="hero-note">
                <strong>กลับมาเรียนต่อได้</strong>
                <span>เห็นบทล่าสุด, progress, และ lesson outline โดยไม่ต้องไล่หลายหน้า</span>
              </article>
              <article className="hero-note">
                <strong>ใช้บัญชีจริง</strong>
                <span>ล็อกอินด้วยบัญชี seeded เช่น `student@example.com` และ `password123`</span>
              </article>
            </div>
          </div>
          <div className="login-panel student-login-panel">
            <div className="profile-switcher" role="tablist" aria-label="Student preset">
              {PRESETS.map((preset) => (
                <button key={preset.id} className={`profile-chip${selectedPresetId === preset.id ? ' is-active' : ''}`} type="button" onClick={() => applyPreset(preset.id)}>
                  <span>{preset.label}</span>
                  <small>{preset.description}</small>
                </button>
              ))}
            </div>
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="section-label">Sign in</div>
              <label className="field">
                <span>อีเมล</span>
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
              </label>
              <label className="field">
                <span>รหัสผ่าน</span>
                <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
              </label>
              <p className="login-hint">Tenant จะถูกอ่านจากโดเมนโดยอัตโนมัติ: <strong>{loginTenantSlug === 'coursechic' ? 'coursechic.com' : `${loginTenantSlug}.coursechic.com`}</strong></p>
              <button className="primary-button" type="submit" disabled={loading}>{loading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ student workspace'}</button>
              {error ? <p className="form-error">{error}</p> : null}
            </form>
          </div>
        </section>
      ) : (
        <section className="student-shell">
          <header className="student-topbar">
            <div>
              <span className="hero-kicker">Student Workspace</span>
              <h2>{tenantContext?.tenant.name || session.user.tenant.name}</h2>
              <p>เรียนต่อจากจุดเดิม, ดู progress, และเปิด outline ของคอร์สที่กำลังเรียน</p>
            </div>
            <div className="student-topbar-actions">
              <div className="session-pill">
                <strong>{session.user.name}</strong>
                <span>{session.user.email}</span>
              </div>
              <button className="secondary-button" type="button" onClick={handleLogout}>ออกจากระบบ</button>
            </div>
          </header>

          <section className="metrics-row student-metrics">
            <article className="metric">
              <span>Enrolled courses</span>
              <strong>{hydrated ? enrolledCount : '--'}</strong>
              <small>{catalogCount} courses available</small>
            </article>
            <article className="metric">
              <span>Average progress</span>
              <strong>{hydrated ? formatPercent(averageProgress) : '--'}</strong>
              <small>ดูจากคอร์สที่ลงทะเบียนอยู่</small>
            </article>
            <article className="metric">
              <span>License</span>
              <strong>{statusLabel}</strong>
              <small>{planLabel} plan</small>
            </article>
            <article className="metric">
              <span>Feature flags</span>
              <strong>{featureCount}</strong>
              <small>{activeFeatures.slice(0, 3).join(' • ') || 'ยังไม่มี flag ที่เปิดใช้'}</small>
            </article>
          </section>

          <section className="student-layout">
            <div className="student-main">
              <article className="content-panel player-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Now learning</span>
                    <h3>{currentCourseTitle}</h3>
                  </div>
                  <span className={`badge tone-${statusTone(selectedEnrollment ? 'active' : 'draft')}`}>{selectedEnrollment ? 'enrolled' : 'browse'}</span>
                </div>
                <p className="detail-copy">{truncate(currentCourse?.description || selectedEnrollment?.course.description || 'เลือกคอร์สจากรายการด้านขวาหรือ enroll คอร์สใหม่เพื่อเริ่มเรียน', 220)}</p>
                <div className="detail-grid student-course-meta">
                  <div className="detail-card">
                    <span>Lesson count</span>
                    <strong>{lessonsThisCourse}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Selected lesson</span>
                    <strong>{lessonLabel}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Course progress</span>
                    <strong>{formatPercent(currentCourseProgress)}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Course price</span>
                    <strong>{currentCoursePriceMinor !== null ? formatBaht(currentCoursePriceMinor / 100) : 'ยังไม่ตั้งราคา'}</strong>
                  </div>
                </div>
                {currentCourse?.pricing ? (
                  <div className="pricing-inline-note">
                    <strong>ราคาคอร์ส</strong>
                    <span>
                      {currentCourseCompareAtMinor !== null && currentCoursePriceMinor !== null && currentCourseCompareAtMinor > currentCoursePriceMinor
                        ? `ราคาเดิม ${formatBaht(currentCourseCompareAtMinor / 100)}`
                        : 'ยังไม่มีราคาเปรียบเทียบ'}
                    </span>
                    <label className="field">
                      <span>รหัสคูปอง</span>
                      <input
                        value={checkoutCouponCode}
                        onChange={(event) => setCheckoutCouponCode(event.target.value.toUpperCase())}
                        placeholder="SAVE10"
                        disabled={!currentCourse?.pricing?.allowCoupons}
                      />
                    </label>
                    <div className="action-row action-row-split">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => void handleEnroll(String(currentCourse.id), checkoutCouponCode)}
                        disabled={!session || enrollingCourseId === String(currentCourse.id) || Boolean(selectedEnrollment)}
                      >
                        {selectedEnrollment ? 'ลงทะเบียนแล้ว' : enrollingCourseId === String(currentCourse.id) ? 'กำลัง enroll...' : 'Enroll with coupon'}
                      </button>
                      <span className="action-caption">
                        {currentCourse?.pricing?.showPricePublicly === false ? 'ราคาถูกซ่อนจากหน้าสาธารณะ แต่ยัง enroll ได้จากหน้านี้' : 'ราคานี้มาจาก pricing ของ tutor'}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="student-player-stage">
                  {selectedModule?.videoHlsUrl || selectedModule?.videoUrl ? (
                    <div className="student-video-shell">
                      <video
                        ref={videoRef}
                        className="student-video"
                        controls
                        autoPlay
                        muted
                        playsInline
                        preload="metadata"
                        poster={selectedModule?.videoPosterUrl || undefined}
                      />
                      <div className="player-badge-row">
                        <span className={`status-pill is-ready tone-${statusTone(selectedModule?.videoStatus || 'ready')}`}>{selectedModule?.videoStatus || 'ready'}</span>
                        <span className="player-source-label">{playerNotice}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="student-player-empty">
                      <strong>ยังไม่มีวิดีโอสำหรับบทนี้</strong>
                      <p>บทเรียนนี้มีเนื้อหาและ transcript ให้ทบทวนได้ก่อน</p>
                    </div>
                  )}
                  <div className="student-player-toolbar">
                    <div className="player-speed-control">
                      <label className="player-speed-label" htmlFor="player-speed">
                        <span>Speed</span>
                        <strong aria-live="polite">{playerSpeed.toFixed(2).replace(/\.00$/, '')}x</strong>
                      </label>
                        <input
                          id="player-speed"
                          className="player-speed-slider"
                          type="range"
                          min={1}
                          max={5}
                          step={0.25}
                          value={playerSpeed}
                        onInput={(event) => handleSpeedChange((event.currentTarget as HTMLInputElement).valueAsNumber)}
                        onChange={(event) => handleSpeedChange((event.currentTarget as HTMLInputElement).valueAsNumber)}
                          aria-label="Playback speed"
                        />
                    </div>
                    <span className="student-seek-note">{seekNote}</span>
                  </div>
                </div>
              </article>

              <article className="content-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Lesson outline</span>
                    <h3>โครงบทเรียนของคอร์สนี้</h3>
                  </div>
                  {courseLoading ? <span className="status-pill">loading</span> : null}
                </div>
                {modules.length ? (
                  <div className="module-stack">
                    {modules.map((module) => (
                      <button
                        key={module.id}
                        className={`module-item module-select${String(module.id) === String(selectedLessonId) ? ' is-selected' : ''}`}
                        type="button"
                        onClick={() => {
                          setSelectedLessonId(String(module.id));
                          setSeekNote(`เลือกบท ${module.title}`);
                        }}
                      >
                        <div>
                          <strong>{module.title}</strong>
                          <p>{truncate(readModuleText(module), 110)}</p>
                        </div>
                        <span>{module.transcriptStatus || (module.videoUrl || module.videoHlsUrl ? 'video' : 'draft')}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <strong>ยังไม่มี lesson ในคอร์สนี้</strong>
                    <p>ถ้าคอร์สยังว่าง หน้าเรียนจะแสดง catalog ด้านขวาเพื่อ enroll ก่อน</p>
                  </div>
                )}
              </article>

              <article className="content-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Transcript</span>
                    <h3>แตะบรรทัดเพื่อข้ามไปยังจุดนั้น</h3>
                  </div>
                </div>
                {selectedModule?.transcriptSegments?.length ? (
                  <div className="seek-list">
                    {selectedModule.transcriptSegments.map((segment, index) => (
                      <button
                        key={`${segment.seek}-${index}`}
                        type="button"
                        className="seek-row"
                        onClick={() => handleSeek(segment.seek, segment.text)}
                      >
                        <span>{segment.seek}</span>
                        <strong>{segment.text}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <strong>ยังไม่มี transcript segments</strong>
                    <p>{truncate(selectedModule?.transcriptFullText || 'ถ้าคอร์สนี้มี transcript จะเห็นบรรทัดให้แตะเพื่อข้ามเวลา', 140)}</p>
                  </div>
                )}
              </article>
            </div>

            <aside className="student-rail">
              <article className="content-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Resume</span>
                    <h3>กลับไปบทที่เรียนค้างไว้</h3>
                  </div>
                </div>
                {selectedEnrollment ? (
                  <div className="result-card">
                    <strong>{selectedEnrollment.course.title}</strong>
                    <p>{truncate(selectedEnrollment.course.description || 'มีคอร์สนี้ในรายการเรียนของคุณ', 150)}</p>
                    <div className="identity-grid compact-grid">
                      <div><dt>Progress</dt><dd>{formatPercent(selectedEnrollment.progress)}</dd></div>
                      <div><dt>Instructor</dt><dd>{selectedEnrollment.course.instructor?.name || 'CourseChic'}</dd></div>
                    </div>
                    <button className="secondary-button resume-button" type="button" onClick={() => setSelectedCourseId(String(selectedEnrollment.courseId))}>
                      เรียนต่อคอร์สนี้
                    </button>
                  </div>
                ) : (
                  <div className="empty-state compact-empty">
                    <strong>ยังไม่มีคอร์สที่ enroll</strong>
                    <p>เลือกคอร์สจาก catalog ด้านล่างแล้วกด enroll ได้เลย</p>
                  </div>
                )}
              </article>

              <article className="content-panel">
                <div className="panel-head compact-head">
                  <div>
                    <span className="section-label">Lesson files</span>
                    <h3>ไฟล์ประกอบบทเรียน</h3>
                  </div>
                </div>
                {selectedModule?.assets?.length ? (
                  <div className="attached-assets-list">
                    {selectedModule.assets.map((asset) => (
                      <article key={asset.id} className="attached-asset-row">
                        <div>
                          <strong>{asset.title || asset.fileName || 'ไฟล์ประกอบบทเรียน'}</strong>
                          <p>
                            {asset.mimeType || asset.assetType || 'attachment'}
                            {asset.sizeBytes ? ` · ${Number(asset.sizeBytes).toLocaleString()} bytes` : ''}
                          </p>
                        </div>
                        {asset.fileUrl || asset.url ? (
                          <button
                            className="secondary-button attached-asset-button"
                            type="button"
                            onClick={() => window.open(asset.fileUrl || asset.url || '#', '_blank', 'noopener,noreferrer')}
                          >
                            เปิด
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact-empty">
                    <strong>ยังไม่มีไฟล์ประกอบบทเรียน</strong>
                    <p>ถ้าบทนี้มีไฟล์แนบ จะเห็นรายการและเปิดได้จากตรงนี้</p>
                  </div>
                )}
              </article>

              <article className="content-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Course catalog</span>
                    <h3>คอร์สที่เปิดให้เรียนใน tenant นี้</h3>
                  </div>
                </div>
                {catalog.length ? (
                  <div className="table-list">
                    {catalog.map((course) => {
                      const courseId = String(course.id);
                      const isEnrolled = enrollments.some((item) => String(item.courseId) === courseId);
                      return (
                        <article key={course.id} className={`table-row student-catalog-row${String(selectedCourseId) === courseId ? ' is-selected' : ''}`}>
                          <div>
                            <strong>{course.title}</strong>
                            <p>{truncate(course.description || 'ยังไม่มีคำอธิบายคอร์ส', 110)}</p>
                          </div>
                          <div className={`badge tone-${isEnrolled ? 'good' : statusTone(course.status)}`}>{isEnrolled ? 'enrolled' : course.status || 'available'}</div>
                          <div className="row-meta">
                            <span>{course.slug || `course-${course.id}`}</span>
                            <span>{formatDate(course.updatedAt)}</span>
                            <span>{course.pricing?.priceMinor !== undefined && course.pricing?.priceMinor !== null ? formatBaht(course.pricing.priceMinor / 100) : 'free'}</span>
                          </div>
                          <div className="student-catalog-actions">
                            <button className="secondary-button" type="button" onClick={() => setSelectedCourseId(courseId)}>ดูคอร์ส</button>
                            <button className="primary-button" type="button" onClick={() => handleEnroll(courseId)} disabled={enrollingCourseId === courseId || isEnrolled}>
                              {isEnrolled ? 'แล้ว' : enrollingCourseId === courseId ? 'กำลัง enroll...' : 'Enroll'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <strong>ยังไม่มี catalog</strong>
                    <p>ถ้าคอร์สยังไม่ถูกสร้าง ระบบจะโชว์ข้อมูลว่างตรงนี้</p>
                  </div>
                )}
                {enrollError ? <p className="form-error">{enrollError}</p> : null}
              </article>

              <article className="content-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Study plan</span>
                    <h3>สิ่งที่ควรทำต่อในวันนี้</h3>
                  </div>
                </div>
                <div className="queue-list">
                  <div className="queue-item queue-item-stack">
                    <strong>บทล่าสุด</strong>
                    <span>{lessonLabel}</span>
                  </div>
                  <div className="queue-item queue-item-stack">
                    <strong>Progress</strong>
                    <span>{formatPercent(currentCourseProgress)} ในคอร์สนี้</span>
                  </div>
                  <div className="queue-item queue-item-stack">
                    <strong>Next move</strong>
                    <span>{selectedModule?.transcriptSegments?.length ? 'แตะ transcript เพื่อข้ามจุดสำคัญ' : 'อ่าน outline และเลือกบทที่ต้องการต่อ'}</span>
                  </div>
                </div>
              </article>

              <article className="content-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Orders</span>
                    <h3>ประวัติการชำระเงินและ receipt</h3>
                  </div>
                </div>
                {selectedCourseOrders.length ? (
                  <div className="table-list">
                    {selectedCourseOrders.map((order) => (
                      <article key={order.id} className="table-row">
                        <div>
                          <strong>{order.course.title}</strong>
                          <p>
                            {order.status} · {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className={`badge tone-${statusTone(order.status)}`}>{order.status}</div>
                        <div className="row-meta">
                          <span>gross {formatBaht(order.grossAmountMinor / 100)}</span>
                          <span>discount {formatBaht(order.discountAmountMinor / 100)}</span>
                          <span>net {formatBaht(order.netAmountMinor / 100)}</span>
                        </div>
                        <div className="row-meta">
                          <span>{order.currency}</span>
                          <span>{order.providerSessionId || 'local'}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <strong>ยังไม่มี order สำหรับคอร์สนี้</strong>
                    <p>เมื่อกด enroll ระบบจะบันทึก order และ receipt ไว้ตรงนี้</p>
                  </div>
                )}
              </article>

              <article className="content-panel">
                <div className="panel-head">
                  <div>
                    <span className="section-label">Account</span>
                    <h3>บริบทบัญชี</h3>
                  </div>
                </div>
                <dl className="identity-grid compact-grid">
                  <div><dt>Tenant</dt><dd>{tenantContext?.tenant.name || session.user.tenant.name}</dd></div>
                  <div><dt>Slug</dt><dd>{tenantContext?.tenant.slug || session.user.tenant.slug}</dd></div>
                  <div><dt>License</dt><dd>{statusLabel}</dd></div>
                  <div><dt>Plan</dt><dd>{planLabel}</dd></div>
                </dl>
                <div className="tag-list">
                  {activeFeatures.length ? activeFeatures.map((feature) => (
                    <span key={feature} className="feature-tag">{feature}</span>
                  )) : <span className="feature-tag">no feature flags</span>}
                </div>
              </article>
            </aside>
          </section>

          {error ? <p className="form-error student-global-error">{error}</p> : null}
        </section>
      )}

      <Script
        src="https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js"
        strategy="afterInteractive"
        onLoad={() => setHlsScriptReady(true)}
        onError={() => setHlsScriptReady(false)}
      />
    </main>
  );
}
