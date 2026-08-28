import React, { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { getProgress, removeProgress } from '../../store/progress';
import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ContinueWatching() {
  const [progress, setProgress] = useState(getProgress());
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  
  // Refresh when needed, but typically progress is loaded on mount
  useEffect(() => {
    setProgress(getProgress());
  }, []);

  if (progress.length === 0) return null;

  return (
    <section className="shrink-0 w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Continue Watching</h2>
        <Link to="/continue-watching" className="text-[10px] text-primary cursor-pointer hover:text-white transition-colors">View All</Link>
      </div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          <AnimatePresence mode="popLayout">
            {progress.map((item) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                key={item.animeId} 
                className="relative shrink-0 w-44 sm:w-48 md:w-56 lg:w-64 group"
              >
              <Link 
                to={`/watch/${item.animeId}/${item.lastEpisodeWatched}`}
                className="flex flex-col group/card cursor-pointer bg-[#0F1115] rounded-2xl overflow-hidden border border-white/5 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
                  <img 
                    src={item.coverImage} 
                    alt={item.animeTitle} 
                    className="absolute inset-0 w-full h-full object-cover object-[center_20%] transition-transform duration-500 group-hover/card:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-90" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-[#0B0C0F] shadow-[0_0_20px_rgba(83,131,232,0.4)]">
                      <Play size={24} fill="currentColor" className="ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-primary z-20" style={{ width: '75%', boxShadow: '0 0 10px var(--theme-color)' }}></div>
                </div>
                <div className="p-3 pt-2 pb-4 flex flex-col gap-1 z-10 relative bg-[#0F1115]">
                  <h3 className="text-[11px] font-bold text-[#EDF1F5] truncate group-hover/card:text-primary transition-colors">
                    {item.animeTitle}
                  </h3>
                  <p className="text-[10px] font-medium text-gray-400">
                    Ep {item.lastEpisodeWatched}
                  </p>
                </div>
              </Link>
              <button 
                className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeProgress(item.animeId);
                  setProgress(getProgress());
                }}
              >
                <X size={14} />
              </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.div layout className="relative shrink-0 w-44 sm:w-48 md:w-56 lg:w-64">
            <Link to="/continue-watching" className="flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl h-full min-h-[96px] text-gray-700 hover:text-gray-500 hover:border-gray-700 transition-colors p-4 text-center">
              <span className="text-[10px] font-bold">+ MORE</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
