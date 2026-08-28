
let cachedFeed: any = null;
let cachedSchedule: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function fetchLatestUpdated(page = 1, perPage = 24) {
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


    // Create a map for quick schedule lookup
    const scheduleMap = new Map();
    for (const anime of schedule) {
      scheduleMap.set(anime.id, anime);
    }

    // Extract unique anime from the feed
    const uniqueAnimeIds = new Set();
    const latestAnime = [];

    for (const item of feed) {
      if (uniqueAnimeIds.has(item.id)) continue;
      
      const details = scheduleMap.get(item.id);
      if (details && !details.isAdult) {
        uniqueAnimeIds.add(item.id);
        
        // Map to AnimeMedia format
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
          episodes: item.episode.aired, // Use the aired episode count as the episode number for the card
          nextAiringEpisode: {
            episode: item.episode.aired + 1, // The UI usually subtracts 1 to show latest, or we just set it up carefully
            airingAt: Math.floor(new Date(item.episode.airedAt).getTime() / 1000)
          },
          // Or we can just set episode directly if UI supports it, wait, what does LatestGrid use?
        });
      }
    }

    // Pagination
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
    console.error("Error fetching latest from AniSchedule:", error);
    throw error;
  }
}
