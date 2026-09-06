import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAnilist, SEARCH_ANIME_QUERY } from '../api/anilist';
import { AnimeMedia } from '../types';
import AnimeCard from '../components/ui/AnimeCard';
import AnimeCardSkeleton from '../components/ui/AnimeCardSkeleton';
import { preloadAnimeThumbnails } from '../utils/imagePreload';
import MultiSelect from '../components/ui/MultiSelect';
import SingleSelect from '../components/ui/SingleSelect';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, ChevronDown, Check, X, RotateCcw, Search as SearchIcon } from 'lucide-react';

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
  );
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  
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
    let isCurrent = true;
    const fetchSearch = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAnilist(SEARCH_ANIME_QUERY, { 
          search: appliedFilters.searchQuery ? appliedFilters.searchQuery.trim() : undefined,
          genre_in: appliedFilters.genres.length > 0 ? appliedFilters.genres : undefined,
          status_in: appliedFilters.status ? [appliedFilters.status] : undefined,
          seasonYear: appliedFilters.year ? Number(appliedFilters.year) : undefined,
          season: appliedFilters.season ? appliedFilters.season : undefined,
          format_in: appliedFilters.formats.length > 0 ? appliedFilters.formats : undefined,
          sort: [appliedFilters.sort],
          page: page,
          perPage: 24
        });
        
        if (!isCurrent) return;

        const results = data?.Page?.media || [];
        // Preload all thumbnails so the entire batch loads together without piecemeal pop-in
        await preloadAnimeThumbnails(results);
        if (!isCurrent) return;

        setSearchResults(results);
        const hasNext = data?.Page?.pageInfo?.hasNextPage !== undefined
          ? Boolean(data.Page.pageInfo.hasNextPage)
          : (results.length >= 24);
        setHasNextPage(hasNext);
      } catch (err: any) {
        if (!isCurrent) return;
        console.error('Error fetching search results:', err);
        setError('Failed to fetch anime. Please try again.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchSearch();

    return () => {
      isCurrent = false;
    };
  }, [appliedFilters, page]);

  const handleApply = () => {
    setAppliedFilters({ ...localFilters });
    setPage(1);
    setShowFilters(false);
  };

  const handleReset = () => {
    const defaultFilters = {
      searchQuery: '',
      genres: [],
      status: '',
      year: '' as string | number,
      season: '',
      formats: [] as (string | number)[],
      sort: 'POPULARITY_DESC'
    };
    setLocalFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
    setShowFilters(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  // Remove specific active filter
  const removeGenre = (g: string) => {
    const next = appliedFilters.genres.filter(item => item !== g);
    setLocalFilters(prev => ({ ...prev, genres: next }));
    setAppliedFilters(prev => ({ ...prev, genres: next }));
    setPage(1);
  };

  const removeFormat = (f: string | number) => {
    const next = appliedFilters.formats.filter(item => item !== f);
    setLocalFilters(prev => ({ ...prev, formats: next }));
    setAppliedFilters(prev => ({ ...prev, formats: next }));
    setPage(1);
  };

  const removeStatus = () => {
    setLocalFilters(prev => ({ ...prev, status: '' }));
    setAppliedFilters(prev => ({ ...prev, status: '' }));
    setPage(1);
  };

  const removeSeason = () => {
    setLocalFilters(prev => ({ ...prev, season: '' }));
    setAppliedFilters(prev => ({ ...prev, season: '' }));
    setPage(1);
  };

  const removeYear = () => {
    setLocalFilters(prev => ({ ...prev, year: '' }));
    setAppliedFilters(prev => ({ ...prev, year: '' }));
    setPage(1);
  };

  const removeSearch = () => {
    setLocalFilters(prev => ({ ...prev, searchQuery: '' }));
    setAppliedFilters(prev => ({ ...prev, searchQuery: '' }));
    setPage(1);
  };

  const removeSort = () => {
    setLocalFilters(prev => ({ ...prev, sort: 'POPULARITY_DESC' }));
    setAppliedFilters(prev => ({ ...prev, sort: 'POPULARITY_DESC' }));
    setPage(1);
  };

  // Count active filters (excluding default sort)
  const activeFilterCount =
    (localFilters.genres.length) +
    (localFilters.formats.length) +
    (localFilters.status ? 1 : 0) +
    (localFilters.season ? 1 : 0) +
    (localFilters.year ? 1 : 0) +
    (localFilters.sort !== 'POPULARITY_DESC' ? 1 : 0);

  const hasAppliedFilters =
    Boolean(appliedFilters.searchQuery) ||
    appliedFilters.genres.length > 0 ||
    appliedFilters.formats.length > 0 ||
    Boolean(appliedFilters.status) ||
    Boolean(appliedFilters.season) ||
    Boolean(appliedFilters.year) ||
    appliedFilters.sort !== 'POPULARITY_DESC';

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
      <div className="relative z-40 flex flex-col gap-4 mb-6">
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
              className="w-full bg-[#151F2E] border border-gray-700 text-[#EDF1F5] rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:border-primary transition-colors text-sm"
            />
            {localFilters.searchQuery && (
              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, searchQuery: '' })}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-white"
                title="Clear search input"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 md:flex-none px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all text-sm ${
                showFilters || activeFilterCount > 0
                  ? 'bg-primary text-[#0B0C0F]'
                  : 'bg-[#151F2E] border border-gray-700 text-[#EDF1F5] hover:border-primary/50'
              }`}
            >
              <Filter size={18} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#0B0C0F] text-primary text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 md:flex-none px-8 py-3 bg-primary text-[#0B0C0F] font-bold rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(83,131,232,0.3)] hover:shadow-[0_0_25px_rgba(83,131,232,0.5)] text-sm flex items-center justify-center gap-2"
            >
              <SearchIcon size={16} />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Filter Popup Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-full mt-2 z-50 shadow-2xl"
            >
              <div className="bg-[#0B0C0F]/98 border border-primary/30 rounded-xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
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

                {/* Filter Actions */}
                <div className="mt-6 pt-4 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-md transition-colors"
                    >
                      <RotateCcw size={13} />
                      <span>Reset Filters</span>
                    </button>
                    {activeFilterCount > 0 && (
                      <span className="text-xs text-primary font-medium">
                        {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold text-[#0B0C0F] bg-primary hover:bg-primary/90 rounded-lg transition-all shadow-md"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filter Chips */}
        {hasAppliedFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-gray-500 font-medium mr-1">Active filters:</span>
            
            {appliedFilters.searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                <span>&quot;{appliedFilters.searchQuery}&quot;</span>
                <button type="button" onClick={removeSearch} className="hover:text-white transition-colors ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            {appliedFilters.genres.map(g => (
              <span key={g} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                <span>{g}</span>
                <button type="button" onClick={() => removeGenre(g)} className="hover:text-white transition-colors ml-0.5">
                  <X size={12} />
                </button>
              </span>
            ))}

            {appliedFilters.formats.map(f => (
              <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <span>{FORMATS.find(fmt => fmt.value === f)?.label || f}</span>
                <button type="button" onClick={() => removeFormat(f)} className="hover:text-white transition-colors ml-0.5">
                  <X size={12} />
                </button>
              </span>
            ))}

            {appliedFilters.status && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <span>Status: {appliedFilters.status}</span>
                <button type="button" onClick={removeStatus} className="hover:text-white transition-colors ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            {appliedFilters.season && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <span>{appliedFilters.season}</span>
                <button type="button" onClick={removeSeason} className="hover:text-white transition-colors ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            {appliedFilters.year && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span>{appliedFilters.year}</span>
                <button type="button" onClick={removeYear} className="hover:text-white transition-colors ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            {appliedFilters.sort !== 'POPULARITY_DESC' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300 border border-gray-600/50">
                <span>Sort: {SORTS.find(s => s.value === appliedFilters.sort)?.label || appliedFilters.sort}</span>
                <button type="button" onClick={removeSort} className="hover:text-white transition-colors ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-300 ml-2 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6 min-h-[400px]">
          {Array.from({ length: 24 }).map((_, i) => (
            <AnimeCardSkeleton key={`explore-skeleton-${i}`} index={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-red-400 font-medium mb-4">{error}</div>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 bg-primary text-[#0B0C0F] font-bold rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Retry Search
          </button>
        </div>
      ) : searchResults.length > 0 ? (
        <>
          <div className="relative min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 bg-[#0B0C0F]/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div 
                key={searchResults.map(a => a?.id).join('-')}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6"
              >
                {searchResults.map((anime, idx) => (
                  <AnimeCard key={anime.id} anime={anime} index={idx} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex justify-center items-center gap-4 mt-12">
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-40 hover:bg-gray-800 transition-colors font-bold text-sm cursor-pointer disabled:cursor-not-allowed border border-gray-800"
            >
              Previous
            </button>
            <span className="text-gray-400 font-medium text-sm">Page {page}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasNextPage || loading}
              className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-40 hover:bg-gray-800 transition-colors font-bold text-sm cursor-pointer disabled:cursor-not-allowed border border-gray-800"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-[#151F2E]/30 rounded-2xl border border-gray-800">
          <p className="text-gray-300 font-medium text-base mb-2">No anime found matching your criteria.</p>
          <p className="text-gray-500 text-sm mb-6">Try broadening your search term or resetting your filter selections.</p>
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 bg-primary text-[#0B0C0F] font-bold rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
