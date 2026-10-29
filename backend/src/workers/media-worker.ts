import dotenv from 'dotenv';
import { startMediaCleanupScheduler, startMediaJobProcessor } from '../routes/media';

dotenv.config();

const MEDIA_JOB_POLL_MS = Number(process.env.MEDIA_JOB_POLL_MS || 5000);

let pollTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;

async function runCycle() {
  if (isShuttingDown) return;
  try {
    await startMediaJobProcessor();
  } catch (error) {
    console.error('[media-worker] job processing failed:', error);
  }
}

function scheduleNextRun() {
  if (isShuttingDown) return;
  pollTimer = setTimeout(async () => {
    await runCycle();
    scheduleNextRun();
  }, MEDIA_JOB_POLL_MS);
}

function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  console.log(`[media-worker] received ${signal}, shutting down`);
  process.exit(0);
}

async function main() {
  console.log(`[media-worker] starting with poll interval ${MEDIA_JOB_POLL_MS}ms`);
  startMediaCleanupScheduler();
  await runCycle();
  scheduleNextRun();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

void main();
