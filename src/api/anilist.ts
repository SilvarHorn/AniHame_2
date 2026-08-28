export const ANILIST_API_URL = 'https://graphql.anilist.co';


const requestCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache

export async function fetchAnilist<T = any>(query: string, variables: any = {}, retries = 5): Promise<T> {
  const cacheKey = query + JSON.stringify(variables);
  const cached = requestCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data as T;
  }

  for (let i = 0; i < retries; i++) {

    try {
      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables })
      });
      
      const json = await response.json().catch(()=>null);
      if (json && json.errors) {
        throw new Error(json.errors[0].message);
      }

      if (response.ok && json && !json.errors) {
        requestCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
      }
      
      if (!response.ok) {
        if (response.status === 429) {
          const delay = parseInt(response.headers.get('Retry-After') || '0') * 1000 || (1000 * Math.pow(2, i) + Math.random() * 1000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error('HTTP Error ' + response.status);
      }
      return json.data;
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i) + Math.random() * 1000));
    }
  }
  throw new Error('Failed to fetch from AniList API');
}

export const TRENDING_ANIME_QUERY = `
  query($page: Int = 1, $perPage: Int = 10, $countryOfOrigin: CountryCode) {
    Page(page: $page, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false, countryOfOrigin: $countryOfOrigin) {
        id
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
  query($page: Int = 1, $perPage: Int = 20, $search: String, $genre_in: [String], $status_in: [MediaStatus], $seasonYear: Int, $season: MediaSeason, $format_in: [MediaFormat], $sort: [MediaSort] = [POPULARITY_DESC]) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, genre_in: $genre_in, status_in: $status_in, seasonYear: $seasonYear, season: $season, format_in: $format_in, type: ANIME, isAdult: false, sort: $sort) {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
        }
        averageScore
        episodes
        genres
        status
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
