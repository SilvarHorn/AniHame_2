import React from 'react';
import { AnimeMedia } from '../../types';
import AnimeCard from '../ui/AnimeCard';
import AnimeCardSkeleton from '../ui/AnimeCardSkeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LatestGridProps {
  latest: AnimeMedia[];
  country: string;
  onCountryChange: (country: string) => void;
  page?: number;
  hasNextPage?: boolean;
  isLoading?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export default function LatestGrid({ 
  latest, 
  country, 
  onCountryChange,
  page = 1,
  hasNextPage = false,
  isLoading = false,
  onNextPage,
  onPrevPage
}: LatestGridProps) {
  if (!isLoading && (!latest || latest.length === 0)) return null;

  const cols = {
    base: 3,
    sm: 4,
    md: 6,
    lg: 6,
    xl: 8,
    '2xl': 8
  };

  const gridCols: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12' };
  const smGridCols: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6', 7: 'sm:grid-cols-7', 8: 'sm:grid-cols-8', 9: 'sm:grid-cols-9', 10: 'sm:grid-cols-10', 11: 'sm:grid-cols-11', 12: 'sm:grid-cols-12' };
  const mdGridCols: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6', 7: 'md:grid-cols-7', 8: 'md:grid-cols-8', 9: 'md:grid-cols-9', 10: 'md:grid-cols-10', 11: 'md:grid-cols-11', 12: 'md:grid-cols-12' };
  const lgGridCols: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6', 7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8', 9: 'lg:grid-cols-9', 10: 'lg:grid-cols-10', 11: 'lg:grid-cols-11', 12: 'lg:grid-cols-12' };
  const xlGridCols: Record<number, string> = { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6', 7: 'xl:grid-cols-7', 8: 'xl:grid-cols-8', 9: 'xl:grid-cols-9', 10: 'xl:grid-cols-10', 11: 'xl:grid-cols-11', 12: 'xl:grid-cols-12' };
  const xxlGridCols: Record<number, string> = { 1: '2xl:grid-cols-1', 2: '2xl:grid-cols-2', 3: '2xl:grid-cols-3', 4: '2xl:grid-cols-4', 5: '2xl:grid-cols-5', 6: '2xl:grid-cols-6', 7: '2xl:grid-cols-7', 8: '2xl:grid-cols-8', 9: '2xl:grid-cols-9', 10: '2xl:grid-cols-10', 11: '2xl:grid-cols-11', 12: '2xl:grid-cols-12' };

  const gridClasses = [
    'grid gap-4 md:gap-6',
    gridCols[cols.base],
    smGridCols[cols.sm],
    mdGridCols[cols.md],
    lgGridCols[cols.lg],
    xlGridCols[cols.xl],
    xxlGridCols[cols['2xl']]
  ].join(' ');

  const maxItemsToShow = cols['2xl'] * 2;
  const dataKey = isLoading ? `loading-${page}` : latest.map(a => a?.id).join('-');

  return (
    <div className="flex flex-col h-full w-full mt-6">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Latest Updated</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 mr-2">
            <button 
              onClick={onPrevPage}
              disabled={page <= 1 || isLoading}
              className="p-1 rounded bg-[#151F2E] text-gray-400 hover:text-primary disabled:opacity-50 disabled:hover:text-gray-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-500 min-w-[20px] text-center">{page}</span>
            <button 
              onClick={onNextPage}
              disabled={!hasNextPage || isLoading}
              className="p-1 rounded bg-[#151F2E] text-gray-400 hover:text-primary disabled:opacity-50 disabled:hover:text-gray-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex gap-2">
             <span className="w-2 h-2 rounded-full bg-primary"></span>
             <span className="w-2 h-2 rounded-full bg-gray-700"></span>
          </div>
        </div>
      </div>
      
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={dataKey}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={gridClasses}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (isLoading) return;
              const swipe = offset.x;
              if (swipe < -50 && hasNextPage) {
                onNextPage?.();
              } else if (swipe > 50 && page > 1) {
                onPrevPage?.();
              }
            }}
          >
            {Array.from({ length: maxItemsToShow }).map((_, index) => {
              const visibilityClass = [
                index < cols.base * 2 ? 'block' : 'hidden',
                index < cols.sm * 2 ? 'sm:block' : 'sm:hidden',
                index < cols.md * 2 ? 'md:block' : 'md:hidden',
                index < cols.lg * 2 ? 'lg:block' : 'lg:hidden',
                index < cols.xl * 2 ? 'xl:block' : 'xl:hidden',
                index < cols['2xl'] * 2 ? '2xl:block' : '2xl:hidden'
              ].join(' ');

              if (isLoading) {
                return (
                  <div key={`skeleton-${index}`} className={visibilityClass}>
                    <AnimeCardSkeleton />
                  </div>
                );
              }

              const anime = latest[index];
              if (anime) {
                let latestEp = anime.episodes || 1;
                if (anime.nextAiringEpisode) {
                  latestEp = Math.max(1, anime.nextAiringEpisode.episode - 1);
                }
                return (
                  <div key={anime.id} className={visibilityClass}>
                    <AnimeCard anime={anime} showProgress={true} progressEpisode={latestEp} />
                  </div>
                );
              }

              return (
                <div key={`empty-${index}`} className={visibilityClass}>
                  <div 
                    className="w-full h-full min-h-[160px] rounded-lg border border-white/5 opacity-[0.15] bg-[#151F2E]"
                    style={{
                      backgroundImage: 'radial-gradient(var(--theme-color) 2px, transparent 2px)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: 'center'
                    }}
                  />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
