import { AnimeMedia } from '../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SEASON_LABELS: Record<string, string> = {
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer',
  FALL: 'Fall',
};

/**
 * Returns true when an anime has not aired its first episode yet.
 */
export function isUpcomingAnime(anime: AnimeMedia | null | undefined): boolean {
  if (!anime) return false;

  if (anime.status === 'NOT_YET_RELEASED') {
    return true;
  }

  // Episode 1 is still scheduled in the future
  if (
    anime.nextAiringEpisode &&
    anime.nextAiringEpisode.episode <= 1 &&
    anime.nextAiringEpisode.airingAt * 1000 > Date.now()
  ) {
    return true;
  }

  // Fallback check on concrete future startDate when status isn't FINISHED/RELEASING
  if (
    anime.status !== 'FINISHED' &&
    anime.status !== 'RELEASING' &&
    anime.startDate?.year &&
    anime.startDate?.month &&
    anime.startDate?.day
  ) {
    const startTs = new Date(
      anime.startDate.year,
      anime.startDate.month - 1,
      anime.startDate.day
    ).getTime();
    if (!Number.isNaN(startTs) && startTs > Date.now()) {
      return true;
    }
  }

  return false;
}

/**
 * Formats the known premiere/airing date for an upcoming anime, or null if TBA.
 * Exact dates use DD/MM/YYYY to match episode release dates across the site.
 */
export function getUpcomingAirDateText(anime: AnimeMedia | null | undefined): string | null {
  if (!anime) return null;

  // 1. Exact Episode 1 airing timestamp from AniList
  if (anime.nextAiringEpisode?.airingAt && anime.nextAiringEpisode.episode <= 1) {
    const d = new Date(anime.nextAiringEpisode.airingAt * 1000);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `Airing on ${dd}/${mm}/${yyyy}`;
    }
  }

  // 2. AniList startDate (full DD/MM/YYYY, Month YYYY, or YYYY)
  const sd = anime.startDate;
  if (sd?.year) {
    if (sd.month && sd.day) {
      const dd = String(sd.day).padStart(2, '0');
      const mm = String(sd.month).padStart(2, '0');
      return `Airing on ${dd}/${mm}/${sd.year}`;
    }
    if (sd.month && sd.month >= 1 && sd.month <= 12) {
      return `Airing in ${MONTH_NAMES[sd.month - 1]} ${sd.year}`;
    }
    if (anime.season && SEASON_LABELS[anime.season]) {
      return `Airing in ${SEASON_LABELS[anime.season]} ${sd.year}`;
    }
    return `Airing in ${sd.year}`;
  }

  // 3. AniList seasonYear + season fallback
  if (anime.seasonYear) {
    if (anime.season && SEASON_LABELS[anime.season]) {
      return `Airing in ${SEASON_LABELS[anime.season]} ${anime.seasonYear}`;
    }
    return `Airing in ${anime.seasonYear}`;
  }

  return null;
}
