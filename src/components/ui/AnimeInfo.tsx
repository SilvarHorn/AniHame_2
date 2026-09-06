import { isHanimeMode } from "../../api/anilist";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimeMedia } from '../../types';
import { Star, MonitorPlay, Calendar, Clock, PlayCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AnimeInfo({ anime, className, hideTitle = false }: { anime: AnimeMedia, className?: string, hideTitle?: boolean }) {
  const title = isHanimeMode() ? (anime.title.romaji || anime.title.english) : (anime.title.english || anime.title.romaji);
  
  const [kitsuScore, setKitsuScore] = useState<number | null>(null);
  const [malScore, setMalScore] = useState<number | null>(null);
  const [ageRating, setAgeRating] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);

  const [tags, setTags] = useState<{ name: string; isMediaSpoiler?: boolean }[]>(() => {
    return (anime.tags || []).map((t: any) =>
      typeof t === 'string' ? { name: t, isMediaSpoiler: false } : t
    ).filter((t: any) => t && t.name);
  });

  useEffect(() => {
    if (Array.isArray(anime.tags) && anime.tags.length > 0) {
      const normalized = anime.tags
        .map((t: any) => (typeof t === 'string' ? { name: t, isMediaSpoiler: false } : t))
        .filter((t: any) => t && t.name);
      setTags(normalized);
    }
  }, [anime.tags]);

  useEffect(() => {
    if (anime.idMal) {
      import('../../api/kitsu').then(({ kitsuClient }) => {
        kitsuClient.getKitsuIdByMalId(anime.idMal).then(kitsuId => {
          if (kitsuId) {
            kitsuClient.getAnime(kitsuId).then(data => {
              if (data?.attributes?.averageRating) {
                setKitsuScore(parseFloat(data.attributes.averageRating));
              }
              if (data?.attributes?.ageRating) {
                let rating = data.attributes.ageRating;
                if (data.attributes.ageRatingGuide) {
                  rating += ` (${data.attributes.ageRatingGuide})`;
                }
                setAgeRating(rating);
              }
              if (Array.isArray(data?.included)) {
                const cats = data.included
                  .filter((inc: any) => inc.type === 'categories')
                  .map((inc: any) => ({
                    name: inc.attributes?.title || inc.attributes?.name,
                    isMediaSpoiler: false
                  }))
                  .filter((t: any) => t.name);
                if (cats.length > 0) {
                  setTags(prev => (prev.length === 0 ? cats : prev));
                }
              }
            });
          }
        });
      }).catch(err => console.error("Failed to fetch Kitsu score", err));

      fetch(`https://api.jikan.moe/v4/anime/${anime.idMal}`)
        .then(res => res.json())
        .then(data => {
          if (data?.data?.score) {
            setMalScore(data.data.score);
          }
          if (data?.data?.rating && !ageRating) {
            setAgeRating(data.data.rating);
          }
          if (data?.data) {
            const themes = Array.isArray(data.data.themes) ? data.data.themes : [];
            const demographics = Array.isArray(data.data.demographics) ? data.data.demographics : [];
            const jikanTags = [...themes, ...demographics]
              .map((item: any) => ({ name: item.name, isMediaSpoiler: false }))
              .filter((item: any) => item.name);
            if (jikanTags.length > 0) {
              setTags(prev => (prev.length === 0 ? jikanTags : prev));
            }
          }
        })
        .catch(err => console.error("Failed to fetch MAL score", err));
    }
  }, [anime.idMal]);

  const formatFuzzyDate = (date?: { year: number | null; month: number | null; day: number | null }) => {
    if (!date || !date.year) return null;
    const month = date.month ? date.month.toString().padStart(2, '0') : '01';
    const day = date.day ? date.day.toString().padStart(2, '0') : '01';
    
    // Just return a friendly string, or simple format
    const d = new Date(date.year, (date.month || 1) - 1, date.day || 1);
    if (isNaN(d.getTime())) return `${date.year}`;
    
    return d.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: date.month ? 'short' : undefined, 
      day: date.day ? 'numeric' : undefined 
    });
  };

  const startDate = formatFuzzyDate(anime.startDate);
  const endDate = formatFuzzyDate(anime.endDate);
  
  let airedString = startDate || 'Unknown';
  if (endDate && endDate !== startDate) {
    airedString += ` to ${endDate}`;
  } else if (startDate && anime.status === 'RELEASING') {
    airedString += ' to Present';
  }

  const studios = anime.studios?.edges?.map(e => e.node.name).join(', ') || 'Unknown';
  // Capitalize status
  const formattedStatus = anime.status ? anime.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';

  return (
    <div className={cn("bg-gray-800/30 rounded-xl p-4 sm:p-6 border border-white/5", className)}>
      {!hideTitle && <h2 className="text-2xl font-bold text-[#EDF1F5] mb-4">About {title}</h2>}
      
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-6 font-medium">
        <div className="flex items-center gap-1.5 text-primary">
          <Star size={16} fill="currentColor" />
          <span>{anime.averageScore}%</span>
        </div>
        
        {ageRating && (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <div className="flex items-center gap-1.5 text-gray-300">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-gray-600 uppercase tracking-wider">{ageRating}</span>
            </div>
          </>
        )}

        {kitsuScore && (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <div className="flex items-center gap-1.5 text-[#FD755C] drop-shadow-sm">
              <Star size={16} fill="currentColor" />
              <span>Kitsu: {kitsuScore}%</span>
            </div>
          </>
        )}

        {malScore && (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <div className="flex items-center gap-1.5 text-[#5383E8] drop-shadow-sm">
              <Star size={16} fill="currentColor" />
              <span>MAL: {malScore}</span>
            </div>
          </>
        )}

        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        <div className="flex items-center gap-1.5">
          <MonitorPlay size={16} />
          <span>{anime.format?.replace(/_/g, ' ') || 'ANIME'}</span>
        </div>

        {anime.episodes && (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <div className="flex items-center gap-1.5">
              <PlayCircle size={16} />
              <span>{anime.episodes} Episodes</span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <span className="text-gray-500 font-semibold">Aired:</span>
          <span className="text-gray-300 ml-2">{airedString}</span>
        </div>
        <div>
          <span className="text-gray-500 font-semibold">Status:</span>
          <span className="text-gray-300 ml-2">{formattedStatus}</span>
        </div>
        <div className="md:col-span-2">
          <span className="text-gray-500 font-semibold">Studios:</span>
          <span className="text-gray-300 ml-2">{studios}</span>
        </div>
      </div>

      {/* Genres Section - Used strictly for genre filtering */}
      {anime.genres && anime.genres.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>Genres</span>
            <span className="text-[11px] text-gray-500 font-normal lowercase tracking-normal">(filters by genre)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {anime.genres.map(genre => (
              <Link
                key={genre}
                to={`/explore?genre=${encodeURIComponent(genre)}`}
                title={`Filter explore by ${genre}`}
                className="px-3 py-1 bg-primary/10 text-primary border border-primary/25 rounded-full text-xs font-semibold hover:bg-primary hover:text-[#0B0C0F] transition-all duration-150"
              >
                {genre}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tags Section - Separate from genres; clicking puts tag in the search bar */}
      {(() => {
        const safeTags = tags.filter(t => !t.isMediaSpoiler);
        if (safeTags.length === 0) return null;
        
        const displayedTags = showAllTags ? safeTags : safeTags.slice(0, 10);
        const hasMoreTags = safeTags.length > 10;

        return (
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>Tags</span>
              <span className="text-[11px] text-gray-500 font-normal lowercase tracking-normal">(click to search keyword)</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {displayedTags.map(tag => (
                <Link
                  key={tag.name}
                  to={`/explore?search=${encodeURIComponent(tag.name)}`}
                  title={`Search for "${tag.name}" in Explore`}
                  className="px-2.5 py-1 bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md text-xs border border-white/5 transition-colors inline-flex items-center gap-1"
                >
                  <span className="text-gray-500 text-[11px]">#</span>
                  <span>{tag.name}</span>
                </Link>
              ))}
              {hasMoreTags && (
                <button
                  type="button"
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="px-2.5 py-1 text-gray-400 hover:text-primary text-xs font-medium transition-colors cursor-pointer"
                >
                  {showAllTags ? 'Show less' : `+${safeTags.length - 10} more`}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <div 
        className="text-gray-400 text-sm leading-relaxed prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: anime.description || 'No description available.' }}
      />
    </div>
  );
}
