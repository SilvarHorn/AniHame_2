import type { AnimeMedia } from '../types';

export const ANILIST_API_URL = '/api/anilist';

export function isHanimeMode() {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('app_user_profile_data');
      if (stored) {
        const profile = JSON.parse(stored);
        if (profile.displayName?.toLowerCase() === 'hanime') return true;
      }
    } catch(e) {}
  }
  return false;
}



const requestCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes cache
const inflightPromises = new Map<string, Promise<any>>();

export async function fetchAnilist<T = any>(query: string, variables: any = {}, retries = 2): Promise<T> {
  let finalQuery = query;
  if (isHanimeMode()) {
    finalQuery = finalQuery.replace(/isAdult:\s*false/g, 'isAdult: true');
  }
  const cacheKey = finalQuery + JSON.stringify(variables);
  const cached = requestCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data as T;
  }

  if (inflightPromises.has(cacheKey)) {
    return inflightPromises.get(cacheKey)!;
  }

  const promise = (async () => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(ANILIST_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ query: finalQuery, variables })
        });
        
        const json = await response.json().catch(() => null);
        if (json && json.errors && !json.data) {
          throw new Error(json.errors[0].message);
        }

        if (response.ok && json && json.data) {
          requestCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
          return json.data as T;
        }
        
        if (!response.ok) {
          if (response.status === 429) {
            const delay = parseInt(response.headers.get('Retry-After') || '1', 10) * 1000;
            await new Promise(r => setTimeout(r, Math.min(delay, 2000)));
            continue;
          }
          throw new Error('HTTP Error ' + response.status);
        }
        return json.data;
      } catch (err: any) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 300 * (i + 1)));
      }
    }
    throw new Error('Failed to fetch from AniList API');
  })().finally(() => {
    inflightPromises.delete(cacheKey);
  });

  inflightPromises.set(cacheKey, promise);
  return promise;
}

export const TRENDING_ANIME_QUERY = `
  query($page: Int = 1, $perPage: Int = 10, $countryOfOrigin: CountryCode) {
    Page(page: $page, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false, countryOfOrigin: $countryOfOrigin) {
        id
        format
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
        }
        bannerImage
        averageScore
        description(asHtml: false)
        episodes
        status
        genres
        nextAiringEpisode {
          airingAt
          timeUntilAiring
          episode
        }
      }
    }
  }
`;

export const AIRING_SCHEDULE_QUERY = `
  query($page: Int = 1, $perPage: Int = 50, $airingAt_greater: Int, $airingAt_lesser: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
      }
      airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
        id
        airingAt
        episode
        media {
          id
          format
          countryOfOrigin
          isAdult
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
        }
      }
    }
  }
`;

export const MEDIA_FRAGMENT = `
  fragment MediaFragment on Media {
    id
    idMal
    type
    format
    title {
      romaji
      english
    }
    coverImage {
      extraLarge
      large
      medium
    }
    bannerImage
    averageScore
    isAdult
    description(asHtml: true)
    episodes
    status
    genres
    tags {
      name
      isMediaSpoiler
    }
    nextAiringEpisode {
      airingAt
      episode
    }
  }
`;

export const ANIME_DETAILS_QUERY = `
  ${MEDIA_FRAGMENT}
  query($id: Int) {
    Media(id: $id, type: ANIME) {
      ...MediaFragment
      startDate { year month day }
      endDate { year month day }
      studios(isMain: true) { edges { isMain node { name } } }
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
      relations {
        edges {
          relationType(version: 2)
          node {
            ...MediaFragment
            relations {
              edges {
                relationType(version: 2)
                node {
                  ...MediaFragment
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const SEARCH_ANIME_QUERY = `
  query($page: Int = 1, $perPage: Int = 24, $search: String, $genre_in: [String], $status_in: [MediaStatus], $seasonYear: Int, $season: MediaSeason, $format_in: [MediaFormat], $sort: [MediaSort] = [POPULARITY_DESC]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
      }
      media(search: $search, genre_in: $genre_in, status_in: $status_in, seasonYear: $seasonYear, season: $season, format_in: $format_in, type: ANIME, isAdult: false, sort: $sort) {
        id
        idMal
        format
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          medium
        }
        bannerImage
        averageScore
        popularity
        trending
        updatedAt
        startDate {
          year
          month
          day
        }
        episodes
        genres
        status
        nextAiringEpisode {
          airingAt
          timeUntilAiring
          episode
        }
      }
    }
  }
`;

export const LATEST_UPDATED_ANIME_QUERY = `
  query($page: Int = 1, $perPage: Int = 10, $countryOfOrigin: CountryCode) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
      }
      media(sort: UPDATED_AT_DESC, type: ANIME, isAdult: false, status: RELEASING, countryOfOrigin: $countryOfOrigin) {
        id
        format
        title {
          romaji
          english
        }
        coverImage {
          large
          extraLarge
        }
        averageScore
        episodes
        genres
        nextAiringEpisode {
          airingAt
          timeUntilAiring
          episode
        }
      }
    }
  }
`;

export interface SearchAnimeOptions {
  search?: string;
  genres?: string[];
  genreOperator?: 'and' | 'or';
  status_in?: string[];
  seasonYear?: number;
  season?: string;
  format_in?: (string | number)[];
  sort?: string[];
  page: number;
  perPage?: number;
}

interface OrSearchPoolEntry {
  items: AnimeMedia[];
  itemIds: Set<number>;
  genrePages: Record<string, { page: number; hasNext: boolean }>;
}

const orSearchPool = new Map<string, OrSearchPoolEntry>();

function compareAnimeMedia(a: AnimeMedia, b: AnimeMedia, sort?: string[]): number {
  const s = sort?.[0] || 'POPULARITY_DESC';
  if (s === 'SCORE_DESC') return (b.averageScore ?? 0) - (a.averageScore ?? 0);
  if (s === 'TRENDING_DESC') return (b.trending ?? 0) - (a.trending ?? 0);
  if (s === 'UPDATED_AT_DESC') return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  if (s === 'START_DATE_DESC') {
    const toDate = (d?: { year: number | null; month: number | null; day: number | null }) =>
      (d?.year || 0) * 10000 + (d?.month || 0) * 100 + (d?.day || 0);
    return toDate(b.startDate) - toDate(a.startDate);
  }
  return (b.popularity ?? 0) - (a.popularity ?? 0);
}

async function searchAnimeMediaOr(options: SearchAnimeOptions): Promise<{
  media: AnimeMedia[];
  hasNextPage: boolean;
}> {
  const {
    search,
    genres = [],
    status_in,
    seasonYear,
    season,
    format_in,
    sort = ['POPULARITY_DESC'],
    page = 1,
    perPage = 24
  } = options;

  const key = JSON.stringify({
    search: search ? search.trim() : '',
    genres: [...genres].sort(),
    status_in: status_in || [],
    seasonYear: seasonYear || null,
    season: season || null,
    format_in: format_in || [],
    sort: sort || ['POPULARITY_DESC']
  });

  let entry = orSearchPool.get(key);
  if (!entry) {
    if (orSearchPool.size > 20) {
      const firstKey = orSearchPool.keys().next().value;
      if (firstKey) orSearchPool.delete(firstKey);
    }
    entry = {
      items: [],
      itemIds: new Set<number>(),
      genrePages: {}
    };
    genres.forEach(g => {
      entry!.genrePages[g] = { page: 1, hasNext: true };
    });
    orSearchPool.set(key, entry);
  }

  const neededCount = page * perPage;
  let attempts = 0;
  while (entry.items.length < neededCount && attempts < 8) {
    const activeGenres = Object.keys(entry.genrePages).filter(g => entry!.genrePages[g].hasNext);
    if (activeGenres.length === 0) break;
    attempts++;

    const batchPerGenre = activeGenres.length >= 8 ? 12 : (activeGenres.length >= 5 ? 16 : 24);

    const subQueries = activeGenres.map((g, idx) => `
      g${idx}: Page(page: ${entry!.genrePages[g].page}, perPage: ${batchPerGenre}) {
        pageInfo { hasNextPage }
        media(genre: "${g}", search: $search, status_in: $status_in, seasonYear: $seasonYear, season: $season, format_in: $format_in, type: ANIME, isAdult: false, sort: $sort) {
          id
          idMal
          format
          title { romaji english native }
          coverImage { extraLarge large medium }
          bannerImage
          averageScore
          popularity
          trending
          updatedAt
          startDate { year month day }
          episodes
          genres
          status
          nextAiringEpisode { airingAt timeUntilAiring episode }
        }
      }
    `).join('\n');

    const query = `
      query($search: String, $status_in: [MediaStatus], $seasonYear: Int, $season: MediaSeason, $format_in: [MediaFormat], $sort: [MediaSort] = [POPULARITY_DESC]) {
        ${subQueries}
      }
    `;

    const variables = {
      search: search ? search.trim() : undefined,
      status_in,
      seasonYear,
      season,
      format_in,
      sort
    };

    const data = await fetchAnilist(query, variables);
    if (!data) break;

    activeGenres.forEach((g, idx) => {
      const pageData = data[`g${idx}`];
      if (pageData?.media && Array.isArray(pageData.media)) {
        for (const m of pageData.media) {
          if (!entry!.itemIds.has(m.id)) {
            entry!.itemIds.add(m.id);
            entry!.items.push(m);
          }
        }
      }
      entry!.genrePages[g].hasNext = Boolean(pageData?.pageInfo?.hasNextPage);
      entry!.genrePages[g].page += 1;
    });

    entry.items.sort((a, b) => compareAnimeMedia(a, b, sort));
  }

  const start = (page - 1) * perPage;
  const end = start + perPage;
  const media = entry.items.slice(start, end);
  const hasNextPage = entry.items.length > end || Object.values(entry.genrePages).some(gp => gp.hasNext);

  return { media, hasNextPage };
}

export async function searchAnimeMedia(options: SearchAnimeOptions): Promise<{
  media: AnimeMedia[];
  hasNextPage: boolean;
}> {
  const {
    search,
    genres = [],
    genreOperator = 'and',
    status_in,
    seasonYear,
    season,
    format_in,
    sort = ['POPULARITY_DESC'],
    page = 1,
    perPage = 24
  } = options;

  // Case 1: AND mode, 1 genre, or no genres
  if (genres.length <= 1 || genreOperator === 'and') {
    const data = await fetchAnilist(SEARCH_ANIME_QUERY, {
      search: search ? search.trim() : undefined,
      genre_in: genres.length > 0 ? genres : undefined,
      status_in,
      seasonYear,
      season,
      format_in: format_in && format_in.length > 0 ? format_in : undefined,
      sort,
      page,
      perPage
    });

    const media: AnimeMedia[] = data?.Page?.media || [];
    const hasNextPage = data?.Page?.pageInfo?.hasNextPage !== undefined
      ? Boolean(data.Page.pageInfo.hasNextPage)
      : (media.length >= perPage);

    return { media, hasNextPage };
  }

  // Case 2: OR mode with 2 or more genres
  return searchAnimeMediaOr({
    search,
    genres,
    genreOperator: 'or',
    status_in,
    seasonYear,
    season,
    format_in,
    sort,
    page,
    perPage
  });
}

export const RANDOM_ANIME_PAGE_QUERY = `
  query($page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        lastPage
      }
      media(type: ANIME, isAdult: false, sort: $sort) {
        id
        format
        status
        episodes
        genres
        averageScore
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
        }
        bannerImage
        description(asHtml: false)
      }
    }
  }
`;

/**
 * Fetches a random existing anime with automated validation and reroll mechanism.
 * If a selected anime does not exist or has incomplete data, it automatically rerolls
 * until a verified, existing anime is retrieved.
 */
export async function getRandomAnimeWithReroll(maxAttempts = 12): Promise<AnimeMedia> {
  const SORTS = ['POPULARITY_DESC', 'SCORE_DESC', 'TRENDING_DESC', 'FAVOURITES_DESC', 'ID_DESC'];
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const randomSort = SORTS[Math.floor(Math.random() * SORTS.length)];
      // Select from active pages
      const randomPage = Math.floor(Math.random() * 150) + 1;
      
      const data = await fetchAnilist(RANDOM_ANIME_PAGE_QUERY, {
        page: randomPage,
        perPage: 10,
        sort: [randomSort]
      });

      const mediaList: AnimeMedia[] = data?.Page?.media || [];
      if (!Array.isArray(mediaList) || mediaList.length === 0) {
        console.warn(`[RandomAnime] Attempt ${attempt}: No anime on page ${randomPage}, rerolling...`);
        continue;
      }

      // Ensure each candidate actually exists and has necessary fields
      const validMedia = mediaList.filter(item => 
        item && 
        typeof item.id === 'number' && 
        item.id > 0 &&
        Boolean(item.title?.english || item.title?.romaji || item.title?.native) &&
        Boolean(item.coverImage?.large || item.coverImage?.extraLarge)
      );

      if (validMedia.length === 0) {
        console.warn(`[RandomAnime] Attempt ${attempt}: Candidates lacked complete data, rerolling...`);
        continue;
      }

      const picked = validMedia[Math.floor(Math.random() * validMedia.length)];
      return picked;
    } catch (err) {
      console.warn(`[RandomAnime] Attempt ${attempt} encountered error:`, err);
      if (attempt === maxAttempts) throw err;
      // Brief pause before rerolling
      await new Promise(r => setTimeout(r, 200));
    }
  }

  throw new Error('Unable to find an existing anime after multiple rerolls.');
}

