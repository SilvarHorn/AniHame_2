import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Fade from 'embla-carousel-fade';
import { AnimeMedia } from '../../types';
import { Play, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BannerProps {
  trending: AnimeMedia[];
}

export default function Banner({ trending }: BannerProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', watchDrag: false }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
    Fade()
  ]);
  
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!trending || trending.length === 0) return null;

  // Ensure we have up to 10 for the banner
  const bannerAnime = trending.slice(0, 10);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 w-full mt-4 md:mt-6">
      <div 
        className="relative w-full h-[40vh] md:h-[32vh] min-h-[320px] md:min-h-[304px] lg:min-h-[336px] overflow-hidden shrink-0 group rounded-2xl shadow-2xl border border-gray-800"
        style={{ transform: 'translateZ(0)', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
      >
        <div className="h-full" ref={emblaRef}>
          <div className="flex h-full">
            {bannerAnime.map((anime, index) => (
              <div key={anime.id} className="relative flex-[0_0_100%] h-full bg-[#0B0C0F] overflow-hidden">
                {/* Background Image (Covering the box with slight overflow) */}
                <div className="absolute inset-0">
                  <img
                    src={anime.bannerImage || anime.coverImage.extraLarge}
                    alt={anime.title.english || anime.title.romaji}
                    fetchPriority="high"
                    className="w-full h-full object-cover object-center scale-[1.15]"
                  />
                </div>

                {/* Gradients for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0F] via-[#0B0C0F]/90 md:via-[#0B0C0F]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0F] via-[#0B0C0F]/60 to-transparent md:hidden" />
                
                {/* 4. Content */}
                <div className="relative h-full flex flex-col justify-center px-6 md:px-12 gap-3 w-full md:w-2/3 lg:w-1/2">
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-primary text-[#0B0C0F] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        TRENDING #{index + 1}
                      </span>
                      {anime.averageScore && (
                        <span className="text-primary text-xs font-semibold drop-shadow-md">
                          ★ {(anime.averageScore / 10).toFixed(1)} Score
                        </span>
                      )}
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 line-clamp-2 leading-tight drop-shadow-lg">
                      {anime.title.english || anime.title.romaji}
                    </h1>
                    
                    <p className="text-gray-300 text-sm md:text-base mb-6 line-clamp-2 max-w-lg drop-shadow-md">
                      {anime.description?.replace(/<[^>]*>?/gm, '') || 'No description available.'}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <Link 
                        to={`/watch/${anime.id}/1`}
                        className="bg-primary hover:bg-primary-hover text-[#0B0C0F] font-bold py-2.5 px-6 rounded-md flex items-center gap-2 transition-colors text-sm"
                      >
                        <Play size={16} fill="currentColor" />
                        Watch Now
                      </Link>
                      <Link 
                        to={`/anime/${anime.id}`}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-2.5 px-6 rounded-md flex items-center gap-2 transition-colors text-sm"
                      >
                        <Info size={16} />
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
          
        {/* Dot Indicators */}
        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2 z-10 px-4">
          {bannerAnime.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`transition-all duration-300 rounded-full ${
                index === selectedIndex
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
