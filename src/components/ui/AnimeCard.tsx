import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { AnimeMedia } from '../../types';
import { MarqueeText } from '../MarqueeText';

interface AnimeCardProps {
  key?: React.Key;
  anime: AnimeMedia;
  showProgress?: boolean;
  progressEpisode?: number;
  orientation?: 'portrait' | 'landscape';
}

function AnimeCardComponent({ anime, showProgress, progressEpisode, orientation = 'portrait' }: AnimeCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const title = anime.title.english || anime.title.romaji;
  
  const isLandscape = orientation === 'landscape';
  const imageSrc = isLandscape && anime.bannerImage ? anime.bannerImage : anime.coverImage.large;
  const formatStr = anime.format ? anime.format.replace('_', ' ') : 'TV';
  const epStr = progressEpisode 
    ? `Ep ${progressEpisode}` 
    : (anime.episodes ? `Ep ${anime.episodes}` : '');
  const subtitle = [formatStr, epStr].filter(Boolean).join(' • ');

  return (
    <Link 
      to={showProgress && progressEpisode ? `/watch/${anime.id}/${progressEpisode}` : `/anime/${anime.id}`}
      className="flex flex-col group cursor-pointer bg-[#0F1115] rounded-2xl overflow-hidden border border-white/5 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10" 
      draggable={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`${isLandscape ? 'aspect-[16/9]' : 'aspect-[3/4]'} relative overflow-hidden bg-gray-900`}>
        <img 
          src={imageSrc} 
          alt={title}
          loading="lazy"
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" 
          draggable={false}
        />
        
        {/* Soft bottom gradient to blend with the card background */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-90" />
        
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
    prevProps.orientation === nextProps.orientation
  );
});
