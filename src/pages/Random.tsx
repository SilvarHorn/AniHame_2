import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Dices, RefreshCw } from 'lucide-react';
import { getRandomAnimeWithReroll } from '../api/anilist';

export default function Random() {
  const navigate = useNavigate();
  const location = useLocation();
  const [statusText, setStatusText] = useState('Finding a random anime...');
  const [error, setError] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(true);

  const rollRandomAnime = async () => {
    setIsRolling(true);
    setError(null);
    setStatusText('Finding a random anime...');

    try {
      setStatusText('Searching AniList & verifying anime exists...');
      const anime = await getRandomAnimeWithReroll(12);

      if (anime && anime.id) {
        setStatusText(`Found: ${anime.title.english || anime.title.romaji || 'Anime'}! Redirecting...`);
        // Navigate directly to the confirmed existing anime details page
        navigate(`/anime/${anime.id}`, { replace: true });
      } else {
        throw new Error('Retrieved anime was invalid. Rerolling...');
      }
    } catch (err: any) {
      console.error('Error in Random page:', err);
      setError('Could not locate a valid anime. Please try rolling again.');
      setIsRolling(false);
    }
  };

  useEffect(() => {
    rollRandomAnime();
  }, [location.search, location.key]);

  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-[#151F2E]/80 border border-primary/20 rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center"
      >
        <div className="relative mb-6">
          <motion.div
            animate={{ 
              rotate: isRolling ? [0, 90, 180, 270, 360] : 0,
              scale: isRolling ? [1, 1.1, 1] : 1
            }}
            transition={{
              repeat: isRolling ? Infinity : 0,
              duration: 1.2,
              ease: "easeInOut"
            }}
            className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(83,131,232,0.25)]"
          >
            <Dices size={40} />
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Random Anime</h1>
        
        <p className="text-gray-400 text-sm mb-6 min-h-[24px]">
          {error ? (
            <span className="text-red-400 font-medium">{error}</span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping inline-block" />
              {statusText}
            </span>
          )}
        </p>

        {error ? (
          <button
            type="button"
            onClick={rollRandomAnime}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-[#0B0C0F] font-bold rounded-lg hover:bg-primary/90 transition-all text-sm shadow-md active:scale-95"
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        ) : (
          <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute top-0 left-0 h-full bg-primary rounded-full"
              initial={{ width: "0%", x: "-100%" }}
              animate={{ width: "60%", x: "200%" }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
