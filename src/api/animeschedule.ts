import { isHanimeMode, fetchAnilist, TRENDING_ANIME_QUERY } from './anilist';

let cachedFeed: any = null;
let cachedSchedule: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

export async function fetchLatestUpdated(page = 1, perPage = 24) {
  // 1. Try lightning-fast server proxy first
  try {
    const isAdult = isHanimeMode();
    const res = await fetch(`/api/animeschedule/latest?page=${page}&perPage=${perPage}&isAdult=${isAdult}`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.media) && json.media.length > 0) {
        return json;
      }
    }
  } catch (serverErr) {
    console.warn("Server latest route unavailable, falling back to direct fetch", serverErr);
  }

  // 2. Direct client fetch fallback
  try {
    let feed, schedule;
    
    if (cachedFeed && cachedSchedule && (Date.now() - lastFetchTime < CACHE_TTL)) {
      feed = cachedFeed;
      schedule = cachedSchedule;
    } else {
      const [feedRes, scheduleRes] = await Promise.all([
        fetch('https://raw.githubusercontent.com/RockinChaos/AniSchedule/master/raw/sub-episode-feed.json'),
        fetch('https://raw.githubusercontent.com/RockinChaos/AniSchedule/master/raw/sub-schedule.json')
      ]);

      if (!feedRes.ok || !scheduleRes.ok) {
        throw new Error('Failed to fetch from AniSchedule raw JSON');
      }

      feed = await feedRes.json();
      schedule = await scheduleRes.json();
      
      cachedFeed = feed;
      cachedSchedule = schedule;
      lastFetchTime = Date.now();
    }

    const scheduleMap = new Map();
    for (const anime of schedule) {
      scheduleMap.set(anime.id, anime);
    }

    const uniqueAnimeIds = new Set();
    const latestAnime = [];

    for (const item of feed) {
      if (uniqueAnimeIds.has(item.id)) continue;
      
      const details = scheduleMap.get(item.id);
      if (details && (isHanimeMode() ? details.isAdult : !details.isAdult)) {
        uniqueAnimeIds.add(item.id);
        
        latestAnime.push({
          id: details.id,
          idMal: details.idMal,
          title: details.title,
          coverImage: {
            large: details.coverImage.extraLarge || details.coverImage.medium,
            extraLarge: details.coverImage.extraLarge,
            color: details.coverImage.color
          },
          bannerImage: details.bannerImage,
          format: details.format,
          genres: details.genres,
          seasonYear: details.seasonYear,
          isAdult: details.isAdult,
          episodes: item.episode.aired,
          nextAiringEpisode: {
            episode: item.episode.aired + 1,
            airingAt: Math.floor(new Date(item.episode.airedAt).getTime() / 1000)
          }
        });
      }
    }

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginated = latestAnime.slice(start, end);
    const hasNextPage = end < latestAnime.length;

    return {
      media: paginated,
      pageInfo: {
        hasNextPage
      }
    };
  } catch (error) {
    console.warn("AniSchedule fallback to Trending query:", error);
    // 3. Guaranteed graceful fallback: fetch trending so UI never breaks
    try {
      const fallbackData = await fetchAnilist(TRENDING_ANIME_QUERY, { page, perPage });
      if (fallbackData?.Page?.media) {
        return {
          media: fallbackData.Page.media,
          pageInfo: fallbackData.Page.pageInfo || { hasNextPage: false }
        };
      }
    } catch {}

    return { media: [], pageInfo: { hasNextPage: false } };
  }
}
