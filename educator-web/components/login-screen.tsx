'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, type LoginPayload, type EducatorSession } from '../lib/api';

type WorkspaceMode = 'owner' | 'tutor';

type ProfilePreset = {
  label: string;
  description: string;
  payload: LoginPayload;
};

const PRESETS: Record<WorkspaceMode, ProfilePreset> = {
  owner: {
    label: 'Platform Owner',
    description: 'ใช้สำหรับดูภาพรวมและจัดการ tutor',
    payload: { email: 'coursechic@gmail.com', password: 'password123' },
  },
  tutor: {
    label: 'Educator',
    description: 'ใช้สำหรับพื้นที่จัดการคอร์สและนักเรียน',
    payload: { email: 'educator', password: 'password123' },
  },
};

function safeLocalStorageWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // login should continue even if storage is unavailable
  }
}

function getSessionKey(mode: WorkspaceMode) {
  return mode === 'owner'
    ? 'coursechic.educator.owner.session.v1'
    : 'coursechic.educator.tutor.session.v1';
}

export function LoginScreen({ mode }: { mode: WorkspaceMode }) {
  const router = useRouter();
  const preset = PRESETS[mode];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LoginPayload>({ ...preset.payload });

  function applyPreset() {
    setError(null);
    setForm({ ...preset.payload });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextSession: EducatorSession = await login(form);
      safeLocalStorageWrite(getSessionKey(mode), JSON.stringify(nextSession));
      router.push(mode === 'owner' ? '/growth' : '/educator');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ลงชื่อเข้าใช้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="educator-app" data-theme="dark" data-route="login" data-workspace={mode} data-screen="login">
      <div className="halo halo-a" />
      <div className="halo halo-b" />
      <section className="hero-panel login-screen">
        <div className="hero-copy">
          <div className="hero-head">
            <span className="hero-kicker">{mode === 'owner' ? 'เข้าสู่ระบบ owner' : 'เข้าสู่ระบบ tutor'}</span>
          </div>
          <h1>{mode === 'owner' ? 'ศูนย์ควบคุมสำหรับ owner' : 'พื้นที่ทำงานสำหรับ tutor'}</h1>
          <p>{mode === 'owner' ? 'หน้า owner แยกจาก tutor เพื่อจัดการ tenant และเครือข่าย tutor' : 'หน้า tutor แยกจากศูนย์ควบคุม เพื่อให้ทำงานกับคอร์สได้ตรงจุด'}</p>
          <div className="hero-rail">
            <article className="hero-note"><strong>{mode === 'owner' ? 'เข้าใช้งานที่ `/growth`' : 'เข้าใช้งานที่ `/educator`'}</strong><span>{mode === 'owner' ? 'ศูนย์ควบคุมของแพลตฟอร์ม' : 'พื้นที่ทำงานของ tutor'}</span></article>
            <article className="hero-note"><strong>{preset.label}</strong><span>{preset.description}</span></article>
          </div>
        </div>
        <div className="login-panel">
          <div className="profile-switcher" role="tablist" aria-label="Login profile">
            <button className="profile-chip is-active" type="button" onClick={applyPreset}>
              <span>{preset.label}</span>
              <small>{preset.description}</small>
            </button>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="section-label">เข้าสู่ระบบ</div>
            <label className="field"><span>อีเมลหรือชื่อผู้ใช้</span><input type="text" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label className="field"><span>รหัสผ่าน</span><input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></label>
            <p className="login-hint">เข้าสู่พื้นที่ทำงานกลางของ <strong>educator</strong> ได้จาก URL ใดก็ได้</p>
            {error ? <div className="empty-state"><strong>เข้าสู่ระบบไม่สำเร็จ</strong><p>{error}</p></div> : null}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่พื้นที่ทำงาน'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
