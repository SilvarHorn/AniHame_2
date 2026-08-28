import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAnilist, SEARCH_ANIME_QUERY } from '../api/anilist';
import { AnimeMedia } from '../types';
import AnimeCard from '../components/ui/AnimeCard';
import AnimeCardSkeleton from '../components/ui/AnimeCardSkeleton';
import MultiSelect from '../components/ui/MultiSelect';
import SingleSelect from '../components/ui/SingleSelect';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, ChevronDown, Check } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 40 }, (_, i) => CURRENT_YEAR + 1 - i);

const SEASONS = [
  { label: 'Winter', value: 'WINTER' },
  { label: 'Spring', value: 'SPRING' },
  { label: 'Summer', value: 'SUMMER' },
  { label: 'Fall', value: 'FALL' },
];

const FORMATS = [
  { label: 'TV', value: 'TV' },
  { label: 'TV Short', value: 'TV_SHORT' },
  { label: 'Movie', value: 'MOVIE' },
  { label: 'Special', value: 'SPECIAL' },
  { label: 'OVA', value: 'OVA' },
  { label: 'ONA', value: 'ONA' },
  { label: 'Music', value: 'MUSIC' },
];

const SORTS = [
  { label: 'Popularity', value: 'POPULARITY_DESC' },
  { label: 'Score', value: 'SCORE_DESC' },
  { label: 'Trending', value: 'TRENDING_DESC' },
  { label: 'Updated', value: 'UPDATED_AT_DESC' },
  { label: 'Newest', value: 'START_DATE_DESC' },
];

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
  'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];

function YearGridSelect({ value, onChange, options }: { value: string|number, onChange: (v: string|number)=>void, options: (string|number)[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between min-w-[140px] h-[42px] bg-[#151F2E] border border-gray-700 hover:border-primary/50 transition-colors text-[#EDF1F5] text-sm rounded-md px-3 focus:outline-none focus:border-primary">
        <span>{value || 'All Years'}</span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
           <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{ duration: 0.15 }} className="absolute top-full right-0 mt-1 w-[280px] bg-[#151F2E] border border-primary/20 rounded-lg p-3 shadow-xl z-50">
             <div className="grid grid-cols-5 gap-2">
                <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} className={`col-span-5 py-1.5 text-sm font-semibold rounded-md transition-colors ${value === '' ? 'bg-primary text-[#0B0C0F]' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>All Years</button>
                {options.map(y => (
                  <button type="button" key={y} onClick={() => { onChange(y); setIsOpen(false); }} className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${value === y ? 'bg-primary text-[#0B0C0F]' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>{y}</button>
                ))}
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Explore() {
  const [searchParams] = useSearchParams();
  
  const [localFilters, setLocalFilters] = useState({
    searchQuery: searchParams.get('search') || '',
    genres: searchParams.get('genre') ? [searchParams.get('genre') as string] : [],
    status: '',
    year: '' as string | number,
    season: '',
    formats: [] as (string | number)[],
    sort: 'POPULARITY_DESC'
  });

  const [appliedFilters, setAppliedFilters] = useState(localFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [searchResults, setSearchResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Sync initial query if it changes from URL (e.g. Navbar search or tags)
  useEffect(() => {
    const q = searchParams.get('search') || '';
    const g = searchParams.get('genre') || '';
    
    setLocalFilters(prev => ({
      ...prev,
      searchQuery: q,
      genres: g ? [g] : prev.genres
    }));
    
    setAppliedFilters(prev => ({
      ...prev,
      searchQuery: q,
      genres: g ? [g] : prev.genres
    }));
    
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const fetchSearch = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAnilist(SEARCH_ANIME_QUERY, { 
          search: appliedFilters.searchQuery || undefined,
          genre_in: appliedFilters.genres.length > 0 ? appliedFilters.genres : undefined,
          status_in: appliedFilters.status ? [appliedFilters.status] : undefined,
          seasonYear: appliedFilters.year ? Number(appliedFilters.year) : undefined,
          season: appliedFilters.season ? appliedFilters.season : undefined,
          format_in: appliedFilters.formats.length > 0 ? appliedFilters.formats : undefined,
          sort: [appliedFilters.sort],
          page: page,
          perPage: 24
        });
        
        const results = data?.Page?.media || [];
        setSearchResults(results);
        setHasNextPage(results.length === 24); // simple check
      } catch (error) {
        console.error('Error fetching search results:', error);
        setError('Failed to fetch anime.');
      } finally {
        setLoading(false);
      }
    };

    fetchSearch();
  }, [appliedFilters, page]);

  const handleApply = () => {
    setAppliedFilters(localFilters);
    setPage(1);
    setShowFilters(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
      <div className="relative z-40 flex flex-col gap-4 mb-8">
        <h1 className="text-3xl font-bold text-[#EDF1F5] flex items-center gap-3">
          <span className="w-1.5 h-8 bg-primary rounded-full inline-block"></span>
          Explore Anime
        </h1>
        
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search anime... (Press Enter to search)"
              value={localFilters.searchQuery}
              onChange={(e) => setLocalFilters({ ...localFilters, searchQuery: e.target.value })}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#151F2E] border border-gray-700 text-[#EDF1F5] rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 md:flex-none px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${showFilters ? 'bg-primary text-[#0B0C0F]' : 'bg-[#151F2E] border border-gray-700 text-[#EDF1F5] hover:border-primary/50'}`}
            >
              <Filter size={18} />
              Filters
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 md:flex-none px-8 py-3 bg-primary text-[#0B0C0F] font-bold rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(83,131,232,0.3)] hover:shadow-[0_0_25px_rgba(83,131,232,0.5)]"
            >
              Search
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-full mt-2 z-50 shadow-2xl"
            >
              <div className="bg-[#0B0C0F]/95 border border-primary/30 rounded-xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Sort */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort By</label>
                    <SingleSelect 
                      options={SORTS}
                      value={localFilters.sort} 
                      onChange={(v) => setLocalFilters({ ...localFilters, sort: v as string })}
                    />
                  </div>

                  {/* Genres (MultiSelect) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Genres</label>
                    <MultiSelect 
                      label="Select Genres"
                      options={GENRES.map(g => ({ label: g, value: g }))}
                      selected={localFilters.genres}
                      onChange={v => setLocalFilters({ ...localFilters, genres: v as string[] })}
                      columns={3}
                    />
                  </div>

                  {/* Formats (MultiSelect) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Formats</label>
                    <MultiSelect 
                      label="Select Formats"
                      options={FORMATS}
                      selected={localFilters.formats}
                      onChange={v => setLocalFilters({ ...localFilters, formats: v })}
                      columns={2}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                    <SingleSelect 
                      options={[
                        { label: 'Any Status', value: '' },
                        { label: 'Releasing', value: 'RELEASING' },
                        { label: 'Finished', value: 'FINISHED' },
                        { label: 'Upcoming', value: 'NOT_YET_RELEASED' },
                      ]}
                      value={localFilters.status} 
                      onChange={(v) => setLocalFilters({ ...localFilters, status: v as string })}
                    />
                  </div>

                  {/* Season */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Season</label>
                    <SingleSelect 
                      options={[
                        { label: 'Any Season', value: '' },
                        ...SEASONS
                      ]}
                      value={localFilters.season} 
                      onChange={(v) => setLocalFilters({ ...localFilters, season: v as string })}
                    />
                  </div>

                  {/* Year (Grid Dropdown) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Year</label>
                    <YearGridSelect 
                      value={localFilters.year} 
                      onChange={y => setLocalFilters({ ...localFilters, year: y })} 
                      options={YEARS} 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && searchResults.length === 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6 min-h-[400px]">
          {Array.from({ length: 24 }).map((_, i) => (
            <AnimeCardSkeleton key={`explore-skeleton-${i}`} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-12">{error}</div>
      ) : searchResults.length > 0 ? (
        <>
          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={searchResults.map(a => a?.id).join('-')}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6"
              >
                {searchResults.map(anime => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex justify-center items-center gap-4 mt-12">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 transition-colors font-bold text-sm"
            >
              Previous
            </button>
            <span className="text-gray-400 font-medium">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNextPage || loading}
              className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 transition-colors font-bold text-sm"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="text-gray-400 py-12 text-center">
          No anime found matching your criteria.
        </div>
      )}
    </div>
  );
}
