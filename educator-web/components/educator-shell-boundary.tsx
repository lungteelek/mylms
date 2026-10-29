'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
};

type State = {
  hasError: boolean;
};

export class EducatorShellBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Educator shell failed to render', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="educator-app" data-theme="dark" data-route="error" data-workspace="tutor" data-screen="dashboard">
          <div className="halo halo-a" />
          <div className="halo halo-b" />
          <section className="hero-panel login-screen">
            <div className="hero-copy">
              <div className="hero-head">
                <span className="hero-kicker">Workspace error</span>
              </div>
              <h1>{this.props.title || 'หน้านี้มีปัญหาตอนแสดงผล'}</h1>
              <p>
                {this.props.description || 'ระบบจับ error ระหว่าง render ได้แล้ว แทนที่จะปล่อยให้หน้าว่าง คุณสามารถรีโหลดหน้าเพื่อลองใหม่ได้ทันที.'}
              </p>
            </div>
            <div className="login-panel">
              <div className="empty-state">
                <strong>Render fallback</strong>
                <p>กด reload หรือกลับไปหน้า dashboard เพื่อให้ shell โหลดใหม่</p>
              </div>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={() => window.location.reload()}>
                  Reload page
                </button>
                <button className="secondary-button" type="button" onClick={() => window.history.back()}>
                  Go back
                </button>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
