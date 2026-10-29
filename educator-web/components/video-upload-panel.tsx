'use client';

import Script from 'next/script';
import { useState, type DragEvent as ReactDragEvent } from 'react';
import { useEffect, useRef } from 'react';
import type { VideoUploadFlow } from './use-video-upload-flow';

type SelectedModuleSummary = {
  videoStatus?: string | null;
  videoHlsUrl?: string | null;
  videoPosterUrl?: string | null;
  videoMediaId?: string | null;
  videoAssetId?: string | null;
  videoUrl?: string | null;
  transcriptSegments?: Array<{
    seek: string;
    progress: number;
    text: string;
  }>;
};

type VideoUploadPanelProps = {
  flow: VideoUploadFlow;
  selectedModule: SelectedModuleSummary | null;
  selectedLessonTitle?: string | null;
  sessionReady: boolean;
  showHeader?: boolean;
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
      new (options?: Record<string, unknown>): HlsInstance;
    };
  }
}

const VIDEO_UPLOAD_STEPS = [
  { key: 'uploading', label: 'Upload' },
  { key: 'transcoding', label: 'Transcode' },
  { key: 'syncing', label: 'Sync' },
  { key: 'done', label: 'Ready' },
] as const;

const DEFAULT_PLAYER_VOLUME = 0.4;

function formatBytes(value: string) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let next = bytes;
  let unit = 0;
  while (next >= 1024 && unit < units.length - 1) {
    next /= 1024;
    unit += 1;
  }
  return `${next >= 10 || unit === 0 ? Math.round(next) : next.toFixed(1)} ${units[unit]}`;
}

function formatDuration(ms: number | null) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '-';
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function seekToSeconds(seek: string) {
  const trimmed = seek.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatSeek(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ensurePlayerSpeed(video: HTMLVideoElement | null, speed: number) {
  if (!video) return;
  video.playbackRate = speed;
}

function ensurePlayerAudio(video: HTMLVideoElement | null) {
  if (!video) return;
  video.defaultMuted = false;
  video.muted = false;
  video.volume = DEFAULT_PLAYER_VOLUME;
}

function attemptAutoplay(video: HTMLVideoElement | null) {
  if (!video) return;
  void video.play().catch(() => undefined);
}

function getStatusLabel(step: VideoUploadFlow['videoUploadState']['step']) {
  if (step === 'uploading') return 'กำลังอัปโหลด';
  if (step === 'transcoding') return 'กำลังแปลงวิดีโอ';
  if (step === 'syncing') return 'กำลัง sync ไฟล์';
  if (step === 'done') return 'พร้อมใช้งาน';
  if (step === 'error') return 'อัปโหลดไม่สำเร็จ';
  return 'สถานะวิดีโอ';
}

function VideoUploadStatusCard({
  state,
  elapsedMs,
}: {
  state: VideoUploadFlow['videoUploadState'];
  elapsedMs: number | null;
}) {
  if (!state.note) return null;

  return (
    <div className={`result-card video-session-card${state.step === 'error' ? ' is-error' : ''}`}>
      <div className="video-step-row">
        {VIDEO_UPLOAD_STEPS.map((step) => {
          const isCurrent = state.step === step.key;
          const isDone =
            (step.key === 'uploading' && ['transcoding', 'syncing', 'done'].includes(state.step)) ||
            (step.key === 'transcoding' && ['syncing', 'done'].includes(state.step)) ||
            (step.key === 'syncing' && state.step === 'done') ||
            (step.key === 'done' && state.step === 'done');

          return (
            <span key={step.key} className={`video-step-chip${isCurrent ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}>
              {step.label}
            </span>
          );
        })}
      </div>

      <div className="video-progress-track" aria-hidden="true">
        <span className="video-progress-fill" style={{ width: `${Math.max(0, Math.min(100, state.progress))}%` }} />
      </div>

      <strong>{getStatusLabel(state.step)}</strong>
      <p>{state.note}</p>
      <div className="video-status-meta">
        <span>{state.progress}%</span>
        <span>เวลา {formatDuration(elapsedMs ?? state.durationMs)}</span>
        {state.mediaId ? <span>mediaId {state.mediaId}</span> : null}
      </div>
    </div>
  );
}

function VideoTranscriptCard({ transcript }: { transcript: string }) {
  if (!transcript) return null;

  return (
    <section className="transcript-preview transcript-preview-compact">
      <div className="panel-head compact-head">
        <div>
          <span className="section-label">Video transcript preview</span>
          <h3>ข้อความล่าสุดจาก video asset</h3>
        </div>
      </div>
      <pre className="transcript-preview-body">{transcript}</pre>
    </section>
  );
}

function VideoTranscriptSeekList({
  segments,
  activeTimeSeconds,
  onSeek,
}: {
  segments: Array<{
    seek: string;
    progress: number;
    text: string;
  }>;
  activeTimeSeconds: number;
  onSeek: (seek: string) => void;
}) {
  if (!segments.length) return null;

  const activeIndex = segments.findIndex((segment, index) => {
    const start = seekToSeconds(segment.seek);
    const next = seekToSeconds(segments[index + 1]?.seek || '');
    if (start === null) return false;
    return activeTimeSeconds >= start && (next === null ? true : activeTimeSeconds < next);
  });

  return (
    <section className="transcript-seek-card">
      <div className="panel-head compact-head">
        <div>
          <span className="section-label">Transcript</span>
          <h3>คลิกบรรทัดเพื่อข้ามเวลา</h3>
        </div>
      </div>
      <div className="transcript-seek-list">
        {segments.map((segment, index) => (
          <button
            key={`${segment.seek}-${index}`}
            type="button"
            className={`transcript-seek-item${index === activeIndex ? ' is-active' : ''}`}
            onClick={() => onSeek(segment.seek)}
          >
            <span className="transcript-seek-time">{segment.seek}</span>
            <span className="transcript-seek-text">{segment.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function VideoUploadRail({
  selectedModule,
  state,
  elapsedMs,
  transcript,
}: {
  selectedModule: SelectedModuleSummary | null;
  state: VideoUploadFlow['videoUploadState'];
  elapsedMs: number | null;
  transcript: string;
}) {
  return (
    <aside className="node-video-rail">
      <div className="detail-grid node-overview-grid node-video-overview">
        <div className="detail-card">
          <span>Status</span>
          <strong>
            <span className={`status-pill ${selectedModule?.videoStatus === 'ready' ? 'is-ready' : ''}`}>
              {selectedModule?.videoStatus === 'ready' ? 'พร้อม' : selectedModule?.videoStatus || 'none'}
            </span>
          </strong>
        </div>
        <div className="detail-card">
          <span>Playback</span>
          <strong>{selectedModule?.videoHlsUrl ? 'สตรีม' : selectedModule?.videoUrl ? 'legacy url' : 'not set'}</strong>
        </div>
        <div className="detail-card">
          <span>Media ID</span>
          <strong className="url-break">{selectedModule?.videoMediaId || 'ยังไม่มี'}</strong>
        </div>
      </div>

      {selectedModule?.videoPosterUrl ? (
        <div className="preview-links">
          {selectedModule?.videoPosterUrl ? (
            <a href={selectedModule.videoPosterUrl} target="_blank" rel="noreferrer">
              เปิดภาพตัวอย่าง
            </a>
          ) : null}
        </div>
      ) : null}

      <VideoUploadStatusCard state={state} elapsedMs={elapsedMs} />
      <VideoTranscriptCard transcript={transcript} />
    </aside>
  );
}

export function VideoUploadPanel({ flow, selectedModule, selectedLessonTitle, sessionReady, showHeader = true }: VideoUploadPanelProps) {
  const { videoFile, setVideoFile, videoUploadState, videoTranscriptPreview, videoTranscriptSegments, uploadVideo, cancelUpload } = flow;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [hlsScriptReady, setHlsScriptReady] = useState(false);
  const [, setPlayerNotice] = useState('พร้อมเล่นวิดีโอ');
  const [playerSpeed, setPlayerSpeed] = useState(1);
  const [clockTick, setClockTick] = useState(Date.now());
  const [playerTimeSeconds, setPlayerTimeSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<HlsInstance | null>(null);
  const transcriptSegments = videoTranscriptSegments.length ? videoTranscriptSegments : selectedModule?.transcriptSegments || [];

  function applySelectedFile(nextFile: File | null) {
    setVideoFile(nextFile);
    setIsDragOver(false);
  }

  function handleFileDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0] || null;
    applySelectedFile(nextFile);
  }

  function handlePlayerSpeedChange(speed: number) {
    setPlayerSpeed(speed);
    ensurePlayerSpeed(videoRef.current, speed);
  }

  useEffect(() => {
    if (!isPlayerOpen) return;
    const video = videoRef.current;
    if (!video) return;

    ensurePlayerAudio(video);

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

    if (!isLikelyHls) {
      video.src = source;
      setPlayerNotice('เล่นไฟล์วิดีโอจากแหล่งที่มา');
      ensurePlayerAudio(video);
      attemptAutoplay(video);
      return cleanup;
    }

    if (canPlayNativeHls) {
      video.src = source;
      setPlayerNotice('เล่นผ่าน HLS ของ browser');
      ensurePlayerAudio(video);
      attemptAutoplay(video);
      return cleanup;
    }

    if (!hlsAvailable) {
      setPlayerNotice('กำลังโหลดตัวเล่นวิดีโอ');
      return cleanup;
    }

    if (typeof window !== 'undefined' && window.Hls?.isSupported?.()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsInstanceRef.current = hls;
      hls.on(window.Hls.Events?.MANIFEST_PARSED || 'MANIFEST_PARSED', () => {
        ensurePlayerAudio(video);
        attemptAutoplay(video);
      });
      hls.loadSource(source);
      hls.attachMedia(video);
      setPlayerNotice('เล่นผ่านตัวเล่น HLS เพื่อรองรับ browser ส่วนใหญ่');
      return cleanup;
    }

    video.src = source;
    setPlayerNotice('browser นี้รองรับได้บางส่วน จึงลองเปิดจากลิงก์วิดีโอโดยตรง');
    ensurePlayerAudio(video);
    attemptAutoplay(video);
    return cleanup;
  }, [hlsScriptReady, isPlayerOpen, selectedModule]);

  useEffect(() => {
    ensurePlayerSpeed(videoRef.current, playerSpeed);
  }, [playerSpeed, isPlayerOpen]);

  useEffect(() => {
    if (!isPlayerOpen) return;
    const video = videoRef.current;
    if (!video) return;

    const syncTime = () => {
      setPlayerTimeSeconds(Number.isFinite(video.currentTime) ? video.currentTime : 0);
    };

    syncTime();
    video.addEventListener('timeupdate', syncTime);
    video.addEventListener('seeked', syncTime);
    video.addEventListener('loadedmetadata', syncTime);
    return () => {
      video.removeEventListener('timeupdate', syncTime);
      video.removeEventListener('seeked', syncTime);
      video.removeEventListener('loadedmetadata', syncTime);
    };
  }, [isPlayerOpen, selectedModule]);

  useEffect(() => {
    if (!['uploading', 'transcoding', 'syncing'].includes(videoUploadState.step)) {
      setClockTick(Date.now());
      return;
    }
    setClockTick(Date.now());
    const interval = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [videoUploadState.durationMs, videoUploadState.startedAt, videoUploadState.step]);

  const uploadElapsedMs =
    videoUploadState.startedAt != null
      ? videoUploadState.durationMs ?? (['uploading', 'transcoding', 'syncing'].includes(videoUploadState.step) ? clockTick - videoUploadState.startedAt : null)
      : null;

  function handleSeekTranscript(seek: string) {
    const video = videoRef.current;
    const seconds = seekToSeconds(seek);
    if (!video || seconds === null) return;
    video.currentTime = seconds;
    setPlayerTimeSeconds(seconds);
    void video.play().catch(() => undefined);
  }

  return (
    <section className="section-card node-video-card">
      <Script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js" strategy="afterInteractive" onLoad={() => setHlsScriptReady(true)} />
      {showHeader ? (
        <div className="panel-head compact-head">
          <div>
            <span className="section-label">Video</span>
            <h3>อัปโหลดและเช็กสถานะวิดีโอ</h3>
          </div>
        </div>
      ) : null}

      <div className="node-video-layout">
        <div className="node-video-main">
          <form className="editor-form node-video-form" onSubmit={uploadVideo}>
            <div
              className={`video-file-card${isDragOver ? ' is-drag-over' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
            >
              <label className="field">
                <span>ไฟล์วิดีโอ</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => {
                    applySelectedFile(event.target.files?.[0] || null);
                  }}
                />
              </label>

              <div className="video-file-summary">
                <strong>{videoFile ? videoFile.name : 'ยังไม่ได้เลือกไฟล์'}</strong>
                <span>{videoFile ? `${formatBytes(String(videoFile.size))} · ${videoFile.type || 'video/mp4'}` : 'เลือกไฟล์หรือลากและวางไฟล์วิดีโอที่นี่'}</span>
              </div>

              <div className="inline-note video-requirements-note">
                <strong>ข้อกำหนดวิดีโอขั้นต่ำ</strong>
                <span>รองรับการลากและวางไฟล์ได้, ความละเอียดอย่างน้อย 720p, ภาพคมชัด, เสียงชัด, และควรใช้ไฟล์ MP4 เพื่อให้แปลงและสตรีมได้เสถียร</span>
              </div>
            </div>

              <div className="action-row action-row-split">
                <div className="action-cluster">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={!sessionReady || !videoFile}
                  >
                    อัปโหลดวิดีโอ
                  </button>
                  {['uploading', 'transcoding', 'syncing'].includes(videoUploadState.step) ? (
                    <button className="secondary-button" type="button" onClick={cancelUpload}>
                      ยกเลิกการอัปโหลด
                    </button>
                  ) : null}
                </div>
                <div className="action-row action-row-quiet">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsPlayerOpen(true)}
                  disabled={!selectedModule?.videoHlsUrl && !selectedModule?.videoUrl}
                >
                  เปิดวิดีโอ
                </button>
              </div>
            </div>
          </form>
        </div>

      <VideoUploadRail
        selectedModule={selectedModule}
        state={videoUploadState}
        elapsedMs={uploadElapsedMs}
        transcript={videoTranscriptPreview}
      />
      </div>
      {isPlayerOpen ? (
        <div className="video-manager-backdrop" role="presentation" onClick={() => setIsPlayerOpen(false)}>
          <div className="video-player-sheet" role="dialog" aria-modal="true" aria-labelledby="video-player-title" onClick={(event) => event.stopPropagation()}>
            <div className="video-manager-header">
              <div className="video-player-header-spacer" aria-hidden="true" />
              <button className="secondary-button video-player-close-button" type="button" onClick={() => setIsPlayerOpen(false)}>
                ปิด
              </button>
            </div>
            {selectedModule?.videoHlsUrl || selectedModule?.videoUrl ? (
            <div className="video-player-shell">
              {selectedLessonTitle ? (
                <div className="player-lesson-label">
                  <span>กำลังเล่นบทเรียน</span>
                  <strong>{selectedLessonTitle}</strong>
                </div>
              ) : null}
              <div className="video-player-grid">
                <div className="video-player-main">
                  <video
                    ref={videoRef}
                    className="video-player-stage"
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    poster={selectedModule?.videoPosterUrl || undefined}
                  />
                  <div className="player-badge-row">
                    <span className="status-pill is-ready">{selectedModule?.videoStatus === 'ready' ? 'พร้อม' : selectedModule?.videoStatus || 'ready'}</span>
                    <label className="player-speed-inline" htmlFor="video-player-speed">
                      <span>Speed</span>
                      <strong aria-live="polite">{playerSpeed.toFixed(2).replace(/\.00$/, '')}x</strong>
                      <input
                        id="video-player-speed"
                        className="player-speed-slider is-compact"
                        type="range"
                        min={1}
                        max={5}
                        step={0.25}
                        value={playerSpeed}
                        onInput={(event) => handlePlayerSpeedChange((event.currentTarget as HTMLInputElement).valueAsNumber)}
                        onChange={(event) => handlePlayerSpeedChange((event.currentTarget as HTMLInputElement).valueAsNumber)}
                        aria-label="Playback speed"
                      />
                    </label>
                  </div>
                </div>
                <div className="video-player-side">
                  <VideoTranscriptSeekList segments={transcriptSegments} activeTimeSeconds={playerTimeSeconds} onSeek={handleSeekTranscript} />
                </div>
              </div>
            </div>
            ) : (
              <div className="empty-state compact-empty">
                <strong>ยังไม่มีวิดีโอ</strong>
                <p>อัปโหลดวิดีโอก่อน แล้วจึงจะเปิดดูตัวอย่างได้</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
