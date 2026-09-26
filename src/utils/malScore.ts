import { useState, useEffect } from 'react';

// In-memory cache for fast lookups
const malScoreCache = new Map<number, number>();
const listeners = new Map<number, Set<(score: number) => void>>();

// Load initial cache from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('kamyroll_mal_scores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          const numKey = Number(k);
          const numVal = Number(v);
          if (!isNaN(numKey) && !isNaN(numVal) && numVal > 0) {
            malScoreCache.set(numKey, numVal);
          }
        }
      }
    }
  } catch {}
}

function persistCache() {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<number, number> = {};
    for (const [k, v] of malScoreCache.entries()) {
      obj[k] = v;
    }
    localStorage.setItem('kamyroll_mal_scores', JSON.stringify(obj));
  } catch {}
}

export function setMalScoreInCache(malId: number, score: number) {
  if (!malId || isNaN(malId) || isNaN(score) || score <= 0) return;
  malScoreCache.set(malId, score);
  
  // Notify listeners
  const set = listeners.get(malId);
  if (set) {
    set.forEach(cb => cb(score));
  }

  // Debounced persist
  if (persistTimer === null) {
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistCache();
    }, 2000);
  }
}

let persistTimer: NodeJS.Timeout | null = null;

// Batch queue
const pendingIds = new Set<number>();
let batchTimer: NodeJS.Timeout | null = null;

function flushBatch() {
  if (pendingIds.size === 0) return;
  const ids = Array.from(pendingIds).slice(0, 40);
  ids.forEach(id => pendingIds.delete(id));

  fetch(`/api/mal/scores?ids=${ids.join(',')}`)
    .then(res => res.ok ? res.json() : {})
    .then((data: Record<string, number>) => {
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          const mId = Number(k);
          const s = Number(v);
          if (!isNaN(mId) && !isNaN(s) && s > 0) {
            setMalScoreInCache(mId, s);
          }
        }
      }
    })
    .catch(() => {});
}

export function requestMalScore(malId: number, callback?: (score: number) => void): number | null {
  if (!malId || isNaN(malId)) return null;

  if (malScoreCache.has(malId)) {
    const cached = malScoreCache.get(malId)!;
    if (callback) callback(cached);
    return cached;
  }

  if (callback) {
    if (!listeners.has(malId)) {
      listeners.set(malId, new Set());
    }
    listeners.get(malId)!.add(callback);
  }

  pendingIds.add(malId);
  if (batchTimer === null) {
    batchTimer = setTimeout(() => {
      batchTimer = null;
      flushBatch();
    }, 60);
  }

  return null;
}

export function formatScoreToFixed(score: number | null | undefined): string | null {
  if (score == null || isNaN(score) || score <= 0) return null;
  return Number(score).toFixed(2);
}

export function useMalScore(anime?: { idMal?: number; averageScore?: number; malScore?: number } | null): {
  malScore: number | null;
  formattedScore: string | null;
  isMal: boolean;
} {
  const malId = anime?.idMal;
  const directScore = anime?.malScore;
  const averageScore = anime?.averageScore;

  const [score, setScore] = useState<number | null>(() => {
    if (directScore != null && !isNaN(directScore)) return directScore;
    if (malId && malScoreCache.has(malId)) return malScoreCache.get(malId)!;
    return null;
  });

  useEffect(() => {
    if (directScore != null && !isNaN(directScore)) {
      setScore(directScore);
      if (malId) setMalScoreInCache(malId, directScore);
      return;
    }

    if (!malId) return;

    if (malScoreCache.has(malId)) {
      setScore(malScoreCache.get(malId)!);
      return;
    }

    const handleUpdate = (newScore: number) => {
      setScore(newScore);
    };

    requestMalScore(malId, handleUpdate);

    return () => {
      const set = listeners.get(malId);
      if (set) {
        set.delete(handleUpdate);
        if (set.size === 0) listeners.delete(malId);
      }
    };
  }, [malId, directScore]);

  if (score != null && !isNaN(score) && score > 0) {
    return {
      malScore: score,
      formattedScore: Number(score).toFixed(2),
      isMal: true
    };
  }

  if (averageScore != null && !isNaN(averageScore) && averageScore > 0) {
    return {
      malScore: null,
      formattedScore: (averageScore / 10).toFixed(2),
      isMal: false
    };
  }

  return {
    malScore: null,
    formattedScore: null,
    isMal: false
  };
}
