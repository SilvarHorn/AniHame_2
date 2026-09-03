const fs = require('fs');

let anilist = fs.readFileSync('src/api/anilist.ts', 'utf8');

if (!anilist.includes('isHanimeMode')) {
  anilist = anilist.replace(
    "export const ANILIST_API_URL = '/api/anilist';",
    "export const ANILIST_API_URL = '/api/anilist';\n\n" +
    "export function isHanimeMode() {\n" +
    "  if (typeof localStorage !== 'undefined') {\n" +
    "    try {\n" +
    "      const stored = localStorage.getItem('app_user_profile_data');\n" +
    "      if (stored) {\n" +
    "        const profile = JSON.parse(stored);\n" +
    "        if (profile.displayName?.toLowerCase() === 'hanime') return true;\n" +
    "      }\n" +
    "    } catch(e) {}\n" +
    "  }\n" +
    "  return false;\n" +
    "}\n"
  );
}

anilist = anilist.replace(
  "const cacheKey = query + JSON.stringify(variables);",
  "let finalQuery = query;\n" +
  "  if (isHanimeMode()) {\n" +
  "    finalQuery = finalQuery.replace(/isAdult:\\s*false/g, 'isAdult: true');\n" +
  "  }\n" +
  "  const cacheKey = finalQuery + JSON.stringify(variables);"
);

anilist = anilist.replace(
  "body: JSON.stringify({ query, variables })",
  "body: JSON.stringify({ query: finalQuery, variables })"
);

fs.writeFileSync('src/api/anilist.ts', anilist);

let animeDetails = fs.readFileSync('src/pages/AnimeDetails.tsx', 'utf8');
if (!animeDetails.includes('isHanimeMode')) {
  animeDetails = animeDetails.replace(
    "import { fetchAnilist, ANIME_DETAILS_QUERY } from '../api/anilist';",
    "import { fetchAnilist, ANIME_DETAILS_QUERY, isHanimeMode } from '../api/anilist';"
  );
  animeDetails = animeDetails.replace(
    "if (data.Media.isAdult) {",
    "if (data.Media.isAdult && !isHanimeMode()) {"
  );
  fs.writeFileSync('src/pages/AnimeDetails.tsx', animeDetails);
}

let watch = fs.readFileSync('src/pages/Watch.tsx', 'utf8');
if (!watch.includes('isHanimeMode')) {
  watch = watch.replace(
    "import { fetchAnilist, ANIME_DETAILS_QUERY } from '../api/anilist';",
    "import { fetchAnilist, ANIME_DETAILS_QUERY, isHanimeMode } from '../api/anilist';"
  );
  watch = watch.replace(
    "if (data.Media.isAdult) {",
    "if (data.Media.isAdult && !isHanimeMode()) {"
  );
  fs.writeFileSync('src/pages/Watch.tsx', watch);
}

let schedule = fs.readFileSync('src/pages/Schedule.tsx', 'utf8');
if (!schedule.includes('isHanimeMode')) {
  schedule = schedule.replace(
    "import { fetchAnilist, AIRING_SCHEDULE_QUERY } from '../api/anilist';",
    "import { fetchAnilist, AIRING_SCHEDULE_QUERY, isHanimeMode } from '../api/anilist';"
  );
  schedule = schedule.replace(
    "const filtered = data.Page.airingSchedules.filter((s: any) => !s.media?.isAdult);",
    "const filtered = data.Page.airingSchedules.filter((s: any) => isHanimeMode() ? s.media?.isAdult : !s.media?.isAdult);"
  );
  fs.writeFileSync('src/pages/Schedule.tsx', schedule);
}

let timetable = fs.readFileSync('src/components/home/Timetable.tsx', 'utf8');
if (!timetable.includes('isHanimeMode')) {
  timetable = timetable.replace(
    "import { fetchAnilist, AIRING_SCHEDULE_QUERY } from '../../api/anilist';",
    "import { fetchAnilist, AIRING_SCHEDULE_QUERY, isHanimeMode } from '../../api/anilist';"
  );
  timetable = timetable.replace(
    "const filtered = data.Page.airingSchedules.filter((s: any) => !s.media?.isAdult);",
    "const filtered = data.Page.airingSchedules.filter((s: any) => isHanimeMode() ? s.media?.isAdult : !s.media?.isAdult);"
  );
  fs.writeFileSync('src/components/home/Timetable.tsx', timetable);
}

console.log('done');
