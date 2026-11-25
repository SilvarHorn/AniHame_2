import { AnimeMedia } from '../types';

export type MyListStatus = 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_WATCH';

export interface MyListItem {
  animeId: number;
  status: MyListStatus;
  episodesWatched?: number;
  addedAt: number;
  anime: {
    id: number;
    title: { romaji: string; english: string | null };
    coverImage: { extraLarge: string; large: string };
    averageScore: number;
    episodes: number | null;
    status: string;
    genres: string[];
  };
}

const STORAGE_KEY = 'anime_my_list';

export const getMyList = (): MyListItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveMyList = (list: MyListItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('my-list-updated'));
};

export const getAnimeListItem = (animeId: number): MyListItem | null => {
  const list = getMyList();
  return list.find(i => i.animeId === animeId) || null;
};

/**
 * Counts how many contiguous episodes starting from Ep 1 have already been watched
 * (e.g. [1, 2, 3, 7] -> 3; [5] -> 0). Never counts skipped episodes.
 */
function getContiguousWatchedFromStart(watchedEpisodes: number[]): number {
  const set = new Set(watchedEpisodes);
  let count = 0;
  while (set.has(count + 1)) {
    count += 1;
  }
  return count;
}

export const addOrUpdateToList = (
  anime: AnimeMedia,
  status: MyListStatus,
  episodesWatched?: number
): MyListItem => {
  const list = getMyList();
  const existingIndex = list.findIndex(item => item.animeId === anime.id);
  const existing = existingIndex >= 0 ? list[existingIndex] : null;

  let resolvedEpisodesWatched: number | undefined;
  if (status === 'WATCHING') {
    if (typeof episodesWatched === 'number' && Number.isFinite(episodesWatched)) {
      resolvedEpisodesWatched = Math.max(0, Math.floor(episodesWatched));
    } else if (existing && typeof existing.episodesWatched === 'number') {
      resolvedEpisodesWatched = Math.max(0, Math.floor(existing.episodesWatched));
    } else {
      resolvedEpisodesWatched = getContiguousWatchedFromStart(getWatchedEpisodes(anime.id));
    }
  }

  const newItem: MyListItem = {
    animeId: anime.id,
    status,
    ...(resolvedEpisodesWatched !== undefined ? { episodesWatched: resolvedEpisodesWatched } : {}),
    addedAt: Date.now(),
    anime: {
      id: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      averageScore: anime.averageScore,
      episodes: anime.episodes,
      status: anime.status,
      genres: anime.genres || []
    }
  };

  if (existingIndex >= 0) {
    list[existingIndex] = newItem;
  } else {
    list.push(newItem);
  }

  saveMyList(list);
  return newItem;
};

export const updateListEpisodesWatched = (animeId: number, episodesWatched: number): MyListItem | null => {
  const list = getMyList();
  const idx = list.findIndex(item => item.animeId === animeId);
  if (idx < 0) return null;

  const prevCount = typeof list[idx].episodesWatched === 'number' ? list[idx].episodesWatched! : 0;
  const safeCount = Math.max(0, Math.floor(Number(episodesWatched) || 0));
  const updated: MyListItem = {
    ...list[idx],
    episodesWatched: safeCount,
  };
  list[idx] = updated;
  saveMyList(list);

  // Only when explicitly lowering "watched up to", clear watched flags above the new selection
  // (never erase higher individually watched episodes when increasing the counter).
  if (safeCount < prevCount) {
    const currentWatched = getWatchedEpisodes(animeId);
    const trimmed = currentWatched.filter(ep => ep <= safeCount);
    if (trimmed.length !== currentWatched.length) {
      localStorage.setItem(getWatchedKey(animeId), JSON.stringify(trimmed));
      window.dispatchEvent(new CustomEvent('watched-episodes-updated', { detail: { animeId } }));
    }
  }

  return updated;
};

export const removeFromList = (animeId: number) => {
  const list = getMyList();
  const filtered = list.filter(item => item.animeId !== animeId);
  saveMyList(filtered);
};

export const getAnimeListStatus = (animeId: number): MyListStatus | null => {
  const item = getAnimeListItem(animeId);
  return item ? item.status : null;
};

// -----------------------------------------------------------------------------
// Per-episode watched tracking (individually started episodes only)
// -----------------------------------------------------------------------------
const getWatchedKey = (animeId: number) => `watched_eps_${animeId}`;

export const getWatchedEpisodes = (animeId: number): number[] => {
  try {
    const raw = localStorage.getItem(getWatchedKey(animeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
};

export const markEpisodeWatched = (animeId: number, episodeNum: number): number[] => {
  if (!animeId || !episodeNum || episodeNum < 1) return getWatchedEpisodes(animeId);
  const watchedSet = new Set<number>(getWatchedEpisodes(animeId));
  watchedSet.add(Math.floor(episodeNum));
  const updated = Array.from(watchedSet).sort((a, b) => a - b);
  localStorage.setItem(getWatchedKey(animeId), JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('watched-episodes-updated', { detail: { animeId } }));
  return updated;
};

export const clearWatchedEpisodes = (animeId: number): void => {
  localStorage.removeItem(getWatchedKey(animeId));
  window.dispatchEvent(new CustomEvent('watched-episodes-updated', { detail: { animeId } }));
};

/**
 * Only gray out an episode if:
 *  1. The anime is in the COMPLETED list, OR
 *  2. The anime is in the WATCHING list and epNum <= user-selected episodesWatched, OR
 *  3. The user has individually watched/started that specific episode (and the anime is
 *     either in a list or still in Continue Watching).
 */
export const isEpisodeGrayedOut = (
  epNum: number,
  listItem: MyListItem | null,
  watchedEpisodes: number[],
  inContinueWatching: boolean = true
): boolean => {
  if (listItem?.status === 'COMPLETED') {
    return true;
  }
  if (
    listItem?.status === 'WATCHING' &&
    typeof listItem.episodesWatched === 'number' &&
    listItem.episodesWatched > 0 &&
    epNum <= listItem.episodesWatched
  ) {
    return true;
  }
  if (!listItem && !inContinueWatching) {
    return false;
  }
  return watchedEpisodes.includes(epNum);
};
