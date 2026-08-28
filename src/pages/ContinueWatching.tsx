import React, { useState, useEffect } from 'react';
import { getProgress, removeProgress } from '../store/progress';
import { WatchProgress } from '../types';
import { Link } from 'react-router-dom';
import { Play, X, User } from 'lucide-react';
import AnimeCard from '../components/ui/AnimeCard';

export default function ContinueWatching() {
  const [progress, setProgress] = useState<WatchProgress[]>([]);

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  const handleRemove = (e: React.MouseEvent, animeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeProgress(animeId);
    setProgress(getProgress());
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#EDF1F5] flex items-center gap-3">
          <span className="w-1.5 h-8 bg-primary rounded-full inline-block"></span>
          Continue Watching
        </h1>
        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-bold border border-white/5">
          {progress.length} Anime
        </span>
      </div>

      {progress.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
          {progress.map((item) => (
            <div key={item.animeId} className="relative group">
              <AnimeCard 
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
                className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => handleRemove(e, item.animeId)}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#151F2E] rounded-2xl border border-gray-800 border-dashed">
          <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-[#EDF1F5] mb-2">No active series</h3>
          <p className="text-gray-400">Start watching some anime and they will appear here!</p>
        </div>
      )}
    </div>
  );
}
