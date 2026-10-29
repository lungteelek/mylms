'use client';

import { FormEvent, useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ApiError,
  cancelLegacyVideoUpload,
  createLegacyVideoUploadSession,
  fetchLegacyVideoStatus,
  fetchVideoTranscript,
  finalizeLegacyVideoUpload,
  startLegacyVideoTranscode,
  uploadLegacyVideoChunk,
  type EducatorSession,
} from '../lib/api';

const RESUMABLE_CHUNK_SIZE_MB = 2;

const VIDEO_UPLOAD_STEPS = [
  { key: 'uploading', label: 'Upload' },
  { key: 'transcoding', label: 'Transcode' },
  { key: 'syncing', label: 'Sync' },
  { key: 'done', label: 'Ready' },
] as const;

export type VideoUploadStep = (typeof VIDEO_UPLOAD_STEPS)[number]['key'] | 'idle' | 'error';

export type VideoUploadState = {
  step: VideoUploadStep;
  progress: number;
  note: string;
  mediaId: string | null;
  startedAt: number | null;
  durationMs: number | null;
};

export type VideoUploadFlow = {
  videoFile: File | null;
  setVideoFile: Dispatch<SetStateAction<File | null>>;
  videoUploadState: VideoUploadState;
  videoTranscriptPreview: string;
  videoTranscriptSegments: Array<{
    seek: string;
    progress: number;
    text: string;
  }>;
  uploadVideo: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  cancelUpload: () => Promise<void>;
  resetUploadState: () => void;
  loadTranscript: () => Promise<void>;
};

type UseVideoUploadFlowArgs = {
  session: EducatorSession | null;
  selectedNodeId: string | null;
  selectedVideoAssetId: string | null | undefined;
  selectedVideoMediaId: string | null | undefined;
  selectedTranscriptFullText?: string | null;
  onRefreshCourse: () => Promise<void>;
  onRefreshTree: () => Promise<void>;
  onError: (message: string) => void;
};

export function useVideoUploadFlow({
  session,
  selectedNodeId,
  selectedVideoAssetId,
  selectedVideoMediaId,
  selectedTranscriptFullText,
  onRefreshCourse,
  onRefreshTree,
  onError,
}: UseVideoUploadFlowArgs): VideoUploadFlow {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploadState, setVideoUploadState] = useState<VideoUploadState>({
    step: 'idle',
    progress: 0,
    note: '',
    mediaId: null,
    startedAt: null,
    durationMs: null,
  });
  const [videoTranscriptPreview, setVideoTranscriptPreview] = useState<string>('');
  const [videoTranscriptSegments, setVideoTranscriptSegments] = useState<VideoUploadFlow['videoTranscriptSegments']>([]);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const currentUploadIdRef = useRef<string | null>(null);
  const currentMediaIdRef = useRef<string | null>(null);

  async function cancelUpload() {
    const abortController = uploadAbortRef.current;
    const uploadId = currentUploadIdRef.current;
    const mediaId = currentMediaIdRef.current;
    abortController?.abort();

    try {
      if (uploadId) {
        await cancelLegacyVideoUpload(session!, selectedNodeId!, uploadId, { mediaId: mediaId || undefined });
      } else if (mediaId) {
        await cancelLegacyVideoUpload(session!, selectedNodeId!, mediaId, { mediaId });
      }
    } catch {
      // best-effort cleanup; local abort already stops the UI flow
    } finally {
      uploadAbortRef.current = null;
      currentUploadIdRef.current = null;
      currentMediaIdRef.current = null;
      setVideoUploadState({
        step: 'idle',
        progress: 0,
        note: 'ยกเลิกการอัปโหลดแล้ว',
        mediaId: null,
        startedAt: null,
        durationMs: null,
      });
      setVideoTranscriptSegments([]);
    }
  }

  const resetUploadState = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    currentUploadIdRef.current = null;
    currentMediaIdRef.current = null;
    setVideoFile(null);
    setVideoTranscriptPreview('');
    setVideoTranscriptSegments([]);
    setVideoUploadState({
      step: 'idle',
      progress: 0,
      note: '',
      mediaId: null,
      startedAt: null,
      durationMs: null,
    });
  }, []);

  async function uploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedNodeId || !videoFile) return;
    if (['uploading', 'transcoding', 'syncing'].includes(videoUploadState.step)) return;

    uploadAbortRef.current?.abort();
    const abortController = new AbortController();
    const uploadStartedAt = Date.now();
    uploadAbortRef.current = abortController;
    currentUploadIdRef.current = null;
    currentMediaIdRef.current = null;

    setVideoUploadState({
      step: 'uploading',
      progress: 5,
      note: 'กำลังเตรียม resumable upload',
      mediaId: null,
      startedAt: uploadStartedAt,
      durationMs: null,
    });

    try {
      const requestedChunkSize = RESUMABLE_CHUNK_SIZE_MB * 1024 * 1024;
      const estimatedChunks = Math.max(1, Math.ceil(videoFile.size / requestedChunkSize));
      const sessionResponse = await createLegacyVideoUploadSession(session, selectedNodeId, {
        originalFileName: videoFile.name,
        originalMimeType: videoFile.type || 'video/mp4',
        fileSize: videoFile.size,
        totalChunks: estimatedChunks,
      }, abortController.signal);

      const uploadId = sessionResponse.data.uploadId;
      currentUploadIdRef.current = uploadId;
      const chunkSize = Number(sessionResponse.data.chunkSize || requestedChunkSize);
      const totalChunks = Number(sessionResponse.data.totalChunks || estimatedChunks);
      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(videoFile.size, start + chunkSize);
        const chunk = videoFile.slice(start, end);
        const formData = new FormData();
        formData.append('chunk', chunk, `${videoFile.name}.part`);
        formData.append('chunkIndex', String(index));
        formData.append('totalChunks', String(totalChunks));
        await uploadLegacyVideoChunk(session, selectedNodeId, uploadId, formData, abortController.signal);
        const progress = Math.min(55, Math.round(((index + 1) / totalChunks) * 55));
        setVideoUploadState({
          step: 'uploading',
          progress,
          note: `กำลังอัปโหลด chunk ${index + 1}/${totalChunks}`,
          mediaId: null,
          startedAt: uploadStartedAt,
          durationMs: null,
        });
      }

      const finalized = await finalizeLegacyVideoUpload(session, selectedNodeId, uploadId, abortController.signal);
      const mediaId = finalized.data.mediaId;
      currentMediaIdRef.current = mediaId;
      setVideoUploadState({
        step: 'transcoding',
        progress: 60,
        note: 'อัปโหลดเสร็จแล้ว กำลังสั่ง transcode',
        mediaId,
        startedAt: uploadStartedAt,
        durationMs: null,
      });

      await startLegacyVideoTranscode(session, selectedNodeId, mediaId, abortController.signal);

      let finalStatus: Awaited<ReturnType<typeof fetchLegacyVideoStatus>>['data'] | null = null;
      const startedAt = Date.now();
      while (true) {
        const statusResponse = await fetchLegacyVideoStatus(session, selectedNodeId, mediaId, abortController.signal);
        finalStatus = statusResponse.data;
        const progress = Math.max(60, Math.min(99, Math.round(Number(finalStatus.progress || 0))));
        const stage = String(finalStatus.stage || '');
        const isReady = finalStatus.status === 'ready' || Boolean(finalStatus.playbackUrl) || Boolean(finalStatus.r2?.masterUrl);
        setVideoUploadState({
          step: isReady ? 'done' : stage.includes('transcoding') ? 'transcoding' : 'syncing',
          progress: isReady ? 100 : progress,
          note:
            isReady
              ? 'อัปโหลดและแปลงวิดีโอแล้ว'
              : finalStatus.status === 'failed'
                ? String(finalStatus.error || 'ประมวลผลวิดีโอไม่สำเร็จ')
                : `กำลังประมวลผลวิดีโอ ${progress}%`,
          mediaId,
          startedAt: uploadStartedAt,
          durationMs: null,
        });
        if (isReady) break;
        if (finalStatus.status === 'failed') {
          throw new Error(finalStatus.error || 'ประมวลผลวิดีโอไม่สำเร็จ');
        }
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            abortController.signal.removeEventListener('abort', handleAbort);
            resolve();
          }, 2500);
          const handleAbort = () => {
            window.clearTimeout(timeout);
            abortController.signal.removeEventListener('abort', handleAbort);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          };
          abortController.signal.addEventListener('abort', handleAbort, { once: true });
        });
      }

      await onRefreshCourse();
      await onRefreshTree();
      setVideoUploadState((current) => ({
        ...current,
        step: 'done',
        progress: 100,
        note: finalStatus?.status === 'ready' ? 'อัปโหลดและแปลงวิดีโอแล้ว' : 'อัปโหลดเสร็จแล้ว ระบบกำลังประมวลผลต่อ',
        startedAt: uploadStartedAt,
        durationMs: Date.now() - uploadStartedAt,
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
      setVideoUploadState({
        step: 'idle',
        progress: 0,
        note: 'ยกเลิกการอัปโหลดแล้ว',
        mediaId: null,
        startedAt: null,
        durationMs: null,
      });
      setVideoTranscriptSegments([]);
      return;
    }
      const message = error instanceof Error ? error.message : 'อัปโหลดวิดีโอไม่สำเร็จ';
      setVideoUploadState((current) => ({
        ...current,
        step: 'error',
        note: message,
        startedAt: current.startedAt || uploadStartedAt,
        durationMs: Date.now() - (current.startedAt || uploadStartedAt),
      }));
      onError(message);
    } finally {
      if (uploadAbortRef.current === abortController) {
        uploadAbortRef.current = null;
      }
      currentUploadIdRef.current = null;
      currentMediaIdRef.current = null;
    }
  }

  async function loadTranscript() {
    const transcriptVideoId = selectedVideoAssetId || selectedVideoMediaId;
    if (!session || !transcriptVideoId) return;
    try {
      const result = await fetchVideoTranscript(session, transcriptVideoId);
      setVideoTranscriptPreview(result.data?.fullText || '');
      setVideoTranscriptSegments(result.data?.segments || []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setVideoTranscriptPreview(selectedTranscriptFullText || '');
        setVideoTranscriptSegments([]);
        return;
      }
      onError(error instanceof Error ? error.message : 'โหลด video transcript ไม่สำเร็จ');
    }
  }

  return {
    videoFile,
    setVideoFile,
    videoUploadState,
    videoTranscriptPreview,
    videoTranscriptSegments,
    uploadVideo,
    cancelUpload,
    resetUploadState,
    loadTranscript,
  };
}
