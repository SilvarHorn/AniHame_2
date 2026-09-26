import { isHanimeMode } from "../../api/anilist";
import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Play, Film } from 'lucide-react';
import { AnimeMedia } from '../../types';
import { MarqueeText } from '../MarqueeText';
import { useAuth } from '../../contexts/AuthContext';

interface AnimeCardProps {
  key?: React.Key;
  anime: AnimeMedia;
  showProgress?: boolean;
  progressEpisode?: number;
  orientation?: 'portrait' | 'landscape';
  index?: number;
  batchReady?: boolean;
}

function AnimeCardComponent({ 
  anime, 
  showProgress, 
  progressEpisode, 
  orientation = 'portrait', 
  index,
  batchReady = true
}: AnimeCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const { profile } = useAuth();

  const isLandscape = orientation === 'landscape';
  const imageSrc = (isLandscape && anime.bannerImage ? anime.bannerImage : (anime.coverImage?.large || anime.coverImage?.extraLarge || anime.coverImage?.medium || '')) || '';

  // Synchronously detect if the image is already downloaded and cached in browser memory
  const [isImageLoaded, setIsImageLoaded] = React.useState(() => {
    if (typeof window !== 'undefined' && imageSrc) {
      const test = new Image();
      test.src = imageSrc;
      return Boolean(test.complete && test.naturalWidth > 0);
    }
    return false;
  });
  const [hasImageError, setHasImageError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsImageLoaded(true);
    }
  }, [imageSrc]);

  const cardBorder = profile?.preferences?.cardBorder;
  const isCustomBorder = cardBorder?.mode === 'custom' && Boolean(cardBorder?.color);

  const title = isHanimeMode() ? (anime.title?.romaji || anime.title?.english || 'Unknown') : (anime.title?.english || anime.title?.romaji || 'Unknown');
  const formatStr = anime.format ? anime.format.replace('_', ' ') : 'TV';
  const epStr = progressEpisode 
    ? `Ep ${progressEpisode}` 
    : (anime.episodes ? `Ep ${anime.episodes}` : '');
  const subtitle = [formatStr, epStr].filter(Boolean).join(' • ');

  const borderStyle: React.CSSProperties = isCustomBorder ? {
    borderColor: cardBorder.color,
    borderWidth: `${Math.max(1, Math.min(10, cardBorder.width || 2))}px`,
    borderStyle: 'solid',
    boxShadow: isHovered 
      ? `0 12px 28px -4px ${cardBorder.color}40, 0 8px 12px -6px ${cardBorder.color}30` 
      : undefined
  } : {};

  // Card entrance stagger delay for grid loading
  const cardStyle: React.CSSProperties = {
    ...borderStyle,
    ...(index !== undefined ? { animationDelay: `${(index % 24) * 25}ms` } : {})
  };

  const isThumbnailShown = Boolean(batchReady && isImageLoaded);

  return (
    <Link 
      to={showProgress && progressEpisode ? `/watch/${anime.id}/${progressEpisode}` : `/anime/${anime.id}`}
      style={cardStyle}
      className={`flex flex-col group cursor-pointer bg-[#0F1115] rounded-2xl overflow-hidden shadow-lg transition-all duration-200 hover:-translate-y-1 ${
        index !== undefined ? 'animate-card-enter' : ''
      } ${
        isCustomBorder ? '' : 'border border-white/5 hover:shadow-xl hover:shadow-primary/10'
      }`} 
      draggable={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`${isLandscape ? 'aspect-[16/9]' : 'aspect-[3/4]'} relative overflow-hidden bg-gradient-to-b from-[#181B23] via-[#13151D] to-[#0F1115]`}>
        {/* Placeholder shimmer while batch or individual image finishes loading */}
        {(!isThumbnailShown && !hasImageError) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Film size={26} className="text-white/[0.08]" />
            <div 
              className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none"
              style={{ animationDelay: `${((index || 0) % 12) * 80}ms` }}
            />
          </div>
        )}

        {/* Fallback art if image fails to load */}
        {hasImageError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1D26] to-[#0E1015] flex flex-col items-center justify-center p-3 text-center">
            <Film size={28} className="text-gray-600 mb-2 opacity-60" />
            <span className="text-[10px] text-gray-400 font-medium line-clamp-2 leading-tight">{title}</span>
          </div>
        ) : (
          <img 
            ref={imgRef}
            src={imageSrc} 
            alt={title}
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              setHasImageError(true);
              setIsImageLoaded(true);
            }}
            className={`object-cover w-full h-full transition-all duration-300 group-hover:scale-105 ${
              isThumbnailShown ? 'opacity-100' : 'opacity-0'
            }`} 
            draggable={false}
          />
        )}
        
        {/* Soft bottom gradient to blend with the card background */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-90 pointer-events-none" />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-[#0B0C0F] shadow-[0_0_20px_rgba(83,131,232,0.4)]">
            <Play size={24} fill="currentColor" className="ml-1" />
          </div>
        </div>
        
        {/* Rating - Position unchanged (top-left) as requested, but styled to match the image's pill */}
        {anime.averageScore && (
          <div className="absolute top-2 left-2 bg-[#050505]/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/5">
            <Star size={12} fill="currentColor" className="text-primary" />
            <span className="text-[11px] font-black text-primary leading-none mt-[1px]">
              {(anime.averageScore / 10).toFixed(1)}
            </span>
          </div>
        )}
      </div>
      
      <div className="p-3 pt-2 pb-4 flex flex-col gap-1 z-10 relative bg-[#0F1115]">
        <MarqueeText
          text={title}
          className="text-[11px] font-bold text-[#EDF1F5] group-hover:text-primary transition-colors"
          align="left"
          hoverOnly={true}
          isHovered={isHovered}
        />
        
        <p className="text-[10px] font-medium text-gray-400">
          {subtitle || 'Anime'}
        </p>
      </div>
    </Link>
  );
}

export default memo(AnimeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.anime.id === nextProps.anime.id &&
    prevProps.showProgress === nextProps.showProgress &&
    prevProps.progressEpisode === nextProps.progressEpisode &&
    prevProps.orientation === nextProps.orientation &&
    prevProps.index === nextProps.index &&
    prevProps.batchReady === nextProps.batchReady
  );
});
