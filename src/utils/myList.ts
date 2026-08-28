import { AnimeMedia } from '../types';

export type MyListStatus = 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_WATCH';

export interface MyListItem {
  animeId: number;
  status: MyListStatus;
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
};

export const addOrUpdateToList = (anime: AnimeMedia, status: MyListStatus) => {
  const list = getMyList();
  const existingIndex = list.findIndex(item => item.animeId === anime.id);
  
  const newItem: MyListItem = {
    animeId: anime.id,
    status,
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
};

export const removeFromList = (animeId: number) => {
  const list = getMyList();
  const filtered = list.filter(item => item.animeId !== animeId);
  saveMyList(filtered);
};

export const getAnimeListStatus = (animeId: number): MyListStatus | null => {
  const list = getMyList();
  const item = list.find(i => i.animeId === animeId);
  return item ? item.status : null;
};
