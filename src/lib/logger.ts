// Lightweight, deduplicated client logger to keep console output minimal and high-signal
const DEDUPE_WINDOW_MS = 30_000;
const MAX_KEYS = 100;

interface LogRecord {
  lastLoggedAt: number;
  suppressed: number;
}

const recentLogs = new Map<string, LogRecord>();

function summarizeError(err: unknown): string {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'object' && 'message' in (err as any)) {
    return String((err as any).message);
  }
  return String(err);
}

function emit(level: 'warn' | 'error', scope: string, err: unknown): void {
  const detail = summarizeError(err);
  const key = `${level}:${scope}:${detail}`;
  const now = Date.now();
  const prev = recentLogs.get(key);

  if (prev && now - prev.lastLoggedAt < DEDUPE_WINDOW_MS) {
    prev.suppressed += 1;
    return;
  }

  const suffix = prev && prev.suppressed > 0 ? ` (+${prev.suppressed} suppressed)` : '';
  if (recentLogs.size >= MAX_KEYS) {
    const oldestKey = recentLogs.keys().next().value;
    if (oldestKey) recentLogs.delete(oldestKey);
  }
  recentLogs.set(key, { lastLoggedAt: now, suppressed: 0 });

  const line = `[${scope}] ${detail}${suffix}`;
  if (level === 'error') {
    console.error(line);
  } else {
    console.warn(line);
  }
}

export const appLog = {
  warn: (scope: string, err: unknown) => emit('warn', scope, err),
  error: (scope: string, err: unknown) => emit('error', scope, err),
};
