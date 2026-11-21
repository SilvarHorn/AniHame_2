import React, { useState, useEffect } from 'react';
import { getProgress, removeProgress } from '../store/progress';
import { WatchProgress } from '../types';
import { Link } from 'react-router-dom';
import { Play, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnimeCard from '../components/ui/AnimeCard';
import { preloadAnimeThumbnails } from '../utils/imagePreload';
import { useAuth } from '../contexts/AuthContext';

export default function ContinueWatching() {
  const [progress, setProgress] = useState<WatchProgress[]>([]);
  const [batchReady, setBatchReady] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    let isCurrent = true;
    const items = getProgress();
    setProgress(items);
    if (items.length === 0) {
      setBatchReady(true);
      return;
    }
    const mediaItems = items.map(item => ({
      coverImage: { large: item.coverImage }
    }));
    preloadAnimeThumbnails(mediaItems).then(() => {
      if (isCurrent) setBatchReady(true);
    });
    return () => { isCurrent = false; };
  }, []);

  const cardBorder = profile?.preferences?.cardBorder;
  const isCustomBorder = cardBorder?.mode === 'custom' && Boolean(cardBorder?.color);
  const borderColor = cardBorder?.color || '#35D5BF';

  const handleRemove = (e: React.MouseEvent, animeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeProgress(animeId);
    setProgress(getProgress());
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#FBF3E5] flex items-center gap-3">
          <span 
            className="w-1.5 h-8 rounded-full inline-block"
            style={{ backgroundColor: isCustomBorder ? borderColor : 'var(--theme-color, #FBF3E5)' }}
          ></span>
          Continue Watching
        </h1>
        <span 
          className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-bold border transition-colors"
          style={isCustomBorder ? { borderColor: `${borderColor}50` } : { borderColor: 'rgba(255,255,255,0.05)' }}
        >
          {progress.length} Anime
        </span>
      </div>

      <AnimatePresence mode="wait">
        {progress.length > 0 ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {progress.map((item, index) => (
                <motion.div
                  key={item.animeId}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="relative group"
                >
                  <AnimeCard 
                    index={index}
                    batchReady={batchReady}
                    anime={{
                      id: item.animeId,
                      title: { romaji: item.animeTitle, english: item.animeTitle },
                      coverImage: { extraLarge: item.coverImage, large: item.coverImage },
                      bannerImage: null,
                      averageScore: 0,
                      description: '',
                      episodes: null,
                      status: '',
                      genres: [],
                      nextAiringEpisode: null
                    }} 
                    showProgress={true}
                    progressEpisode={item.lastEpisodeWatched}
                  />
                  <button 
                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 active:scale-90 transition-all duration-200 z-10"
                    onClick={(e) => handleRemove(e, item.animeId)}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-20 bg-[#151F2E] rounded-2xl border border-gray-800 border-dashed"
          >
            <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-[#FBF3E5] mb-2">No active series</h3>
            <p className="text-gray-400">Start watching some anime and they will appear here!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
