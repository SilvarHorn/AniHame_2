import React, { useEffect, useState } from 'react';
import Banner from '../components/home/Banner';
import TrendingGrid from '../components/home/TrendingGrid';
import LatestGrid from '../components/home/LatestGrid';
import ContinueWatching from '../components/home/ContinueWatching';
import Timetable from '../components/home/Timetable';
import { fetchAnilist, TRENDING_ANIME_QUERY } from '../api/anilist';
import { fetchLatestUpdated } from '../api/animeschedule';
import { AnimeMedia } from '../types';
import { motion } from 'motion/react';


const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function Home() {
  const [trending, setTrending] = useState<AnimeMedia[]>([]);
  const [latest, setLatest] = useState<AnimeMedia[]>([]);
  
  const getProfileRegion = () => {
    try {
      const saved = localStorage.getItem('anime_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultRegion !== undefined) return parsed.defaultRegion;
      }
    } catch (e) {}
    return 'JP';
  };

  const [loading, setLoading] = useState(true);
  const [trendingCountry, setTrendingCountry] = useState(getProfileRegion);
  const [latestCountry, setLatestCountry] = useState(getProfileRegion);
  const [latestPage, setLatestPage] = useState(1);
  const [latestHasNext, setLatestHasNext] = useState(false);
  const [isFetchingLatest, setIsFetchingLatest] = useState(true);
  const [error, setError] = useState('');

  // Fetch Trending
  useEffect(() => {
    const fetchTrending = async () => {
      setError('');
      try {
        const data = await fetchAnilist(TRENDING_ANIME_QUERY, { 
          page: 1, 
          perPage: 20,
          countryOfOrigin: trendingCountry || undefined
        });
        setTrending(data?.Page?.media || []);
      } catch (error) {
        console.error('Error fetching trending:', error);
        setError('Failed to fetch trending anime.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, [trendingCountry]);

  // Fetch Latest
  useEffect(() => {
    if (loading) return;
    let isMounted = true;
    const fetchLatest = async () => {
      setIsFetchingLatest(true);
      setError('');
      try {
        const data = await fetchLatestUpdated(latestPage, 24);
        if (isMounted) {
          setLatest(data.media || []);
          setLatestHasNext(data.pageInfo?.hasNextPage || false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching latest:', err);
          setError('Failed to fetch latest updates.');
        }
      } finally {
        if (isMounted) {
          setIsFetchingLatest(false);
        }
      }
    };
    fetchLatest();
    return () => { isMounted = false; };
  }, [latestCountry, latestPage, loading]);

  // Reset page on country change
  useEffect(() => {
    setLatestPage(1);
  }, [latestCountry]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-500 font-medium">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Banner is outside the stagger, it animates in as soon as it has data */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Banner trending={trending} />
      </motion.div>

      {/* Rest of the page mounts immediately, grids handle their own loading state */}
      <motion.div 
        className="flex-1 flex flex-col p-4 md:p-6 lg:px-8 gap-6 w-full"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <ContinueWatching />
        </motion.div>
        <div className="flex flex-col gap-8">
          <motion.div variants={itemVariants}>
            <LatestGrid 
              latest={latest} 
              country={latestCountry} 
              onCountryChange={setLatestCountry}
              page={latestPage}
              hasNextPage={latestHasNext}
              isLoading={isFetchingLatest}
              onNextPage={() => setLatestPage(p => p + 1)}
              onPrevPage={() => setLatestPage(p => Math.max(1, p - 1))}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <TrendingGrid trending={trending} country={trendingCountry} onCountryChange={setTrendingCountry} isLoading={loading} />
          </motion.div>
          <motion.div variants={itemVariants} className="w-full">
            <Timetable />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
