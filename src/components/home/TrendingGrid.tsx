import React, { useRef, useState, MouseEvent } from 'react';
import { AnimeMedia } from '../../types';
import AnimeCard from '../ui/AnimeCard';
import AnimeCardSkeleton from '../ui/AnimeCardSkeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TrendingGridProps {
  trending: AnimeMedia[];
  country: string;
  onCountryChange: (country: string) => void;
  isLoading?: boolean;
}

export default function TrendingGrid({ trending, country, onCountryChange, isLoading = false }: TrendingGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scroll = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!scrollRef.current) return;
    
    // Ignore if clicking on the scrollbar (bottom 15px of the element)
    const rect = scrollRef.current.getBoundingClientRect();
    if (e.clientY >= rect.bottom - 15) return;
    
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleClickCapture = (e: MouseEvent) => {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll fast
    if (Math.abs(x - startX) > 5) {
      setHasDragged(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  if (!isLoading && (!trending || trending.length === 0)) return null;

  return (
    <div className="flex flex-col w-full relative group/trending">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Trending Now</h2>
        <div className="flex items-center gap-3">
          <select 
            value={country} 
            onChange={(e) => onCountryChange(e.target.value)}
            className="bg-[#151F2E] border border-gray-700 text-gray-400 text-[10px] uppercase font-bold rounded px-2 py-0.5 focus:outline-none focus:border-primary"
          >
            <option value="">All Regions</option>
            <option value="JP">Japanese</option>
            <option value="CN">Chinese</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => scroll(-300)} disabled={isLoading} className="p-1 bg-gray-800 rounded hover:bg-primary hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-gray-800 disabled:hover:text-white">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => scroll(300)} disabled={isLoading} className="p-1 bg-gray-800 rounded hover:bg-primary hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-gray-800 disabled:hover:text-white">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative w-full">
        <button 
          onClick={() => scroll(-400)} 
          disabled={isLoading}
          className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover/trending:opacity-100 hover:bg-primary hover:text-black transition-all hidden sm:block disabled:hidden"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClickCapture={handleClickCapture}
          className={`flex gap-3 overflow-x-auto hide-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab snap-x snap-mandatory'}`}
        >
          {isLoading 
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="snap-start shrink-0 w-24 sm:w-28 md:w-32 lg:w-36">
                  <AnimeCardSkeleton />
                </div>
              ))
            : trending.map((anime) => (
                <div key={anime.id} className="snap-start shrink-0 w-24 sm:w-28 md:w-32 lg:w-36">
                  <AnimeCard anime={anime} />
                </div>
              ))}
        </div>
        
        <button 
          onClick={() => scroll(400)} 
          disabled={isLoading}
          className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover/trending:opacity-100 hover:bg-primary hover:text-black transition-all hidden sm:block disabled:hidden"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
