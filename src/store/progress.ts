import { WatchProgress } from '../types';
import { isHanimeMode } from '../api/anilist';

const getProgressKey = () => isHanimeMode() ? 'hanime_progress' : 'anime_progress';

export const getProgress = (): WatchProgress[] => {
  try {
    const data = localStorage.getItem(getProgressKey());
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveProgress = (progress: WatchProgress) => {
  const current = getProgress();
  const existing = current.findIndex(p => p.animeId === progress.animeId);
  
  if (existing >= 0) {
    current[existing] = progress;
  } else {
    current.unshift(progress);
  }
  
  // Keep only the most recent 50 instead of 10 to allow a dedicated page
  const updated = current.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  localStorage.setItem(getProgressKey(), JSON.stringify(updated));
};

export const removeProgress = (animeId: number) => {
  const current = getProgress();
  const updated = current.filter(p => p.animeId !== animeId);
  localStorage.setItem(getProgressKey(), JSON.stringify(updated));
};

export const getProgressForAnime = (animeId: number): WatchProgress | undefined => {
  return getProgress().find(p => p.animeId === animeId);
};
