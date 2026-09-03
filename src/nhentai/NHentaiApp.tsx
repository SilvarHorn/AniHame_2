import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NHentaiGallery from './NHentaiGallery';
import { MarqueeText } from '../components/MarqueeText';
import { Search } from 'lucide-react';
import AnimeCardSkeleton from '../components/ui/AnimeCardSkeleton';

function NHentaiCard({ gallery }: { gallery: any; key?: any }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  const title = gallery.english_title || gallery.japanese_title || gallery.title?.english || gallery.title?.japanese || 'Untitled';
  
  // Use exact thumbnail from API if available, else fallback
  const initialThumb = gallery.thumbnail 
    ? (gallery.thumbnail.startsWith('http') ? gallery.thumbnail : `https://t3.nhentai.net/${gallery.thumbnail}`)
    : `https://t3.nhentai.net/galleries/${gallery.media_id}/thumb.jpg`;
  
  return (
    <Link 
      to={`/gallery/${gallery.id}`} 
      className="flex flex-col group cursor-pointer bg-[#0F1115] rounded-2xl overflow-hidden border border-white/5 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-[#151F2E]">
        {!imageLoaded && (
          <div className="absolute inset-0 z-10 bg-[#1A2333] animate-pulse flex items-center justify-center">
             {/* Optional spinner or just the skeleton pulse */}
          </div>
        )}
        <img 
          src={initialThumb}
          onLoad={() => setImageLoaded(true)}
          onError={(e: any) => {
            const el = e.currentTarget;
            if (!el.dataset.fb1) {
              el.dataset.fb1 = 'true';
              el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/thumb.webp`;
            } else if (!el.dataset.fb2) {
              el.dataset.fb2 = 'true';
              el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/cover.jpg`;
            } else if (!el.dataset.fb3) {
              el.dataset.fb3 = 'true';
              el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/cover.webp`;
            } else if (!el.dataset.fb4) {
               el.dataset.fb4 = 'true';
               el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/1.jpg`;
            } else if (!el.dataset.fb5) {
               el.dataset.fb5 = 'true';
               el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/1.webp`;
            } else {
               // Total fallback
               setImageLoaded(true); 
            }
          }}
          alt={title}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0 scale-95'}`}
          loading="lazy"
        />
        {/* Soft bottom gradient to blend with the card background */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-90" />
        
        {/* Page Count */}
        <div className="absolute top-2 left-2 bg-[#050505]/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/5">
          <span className="text-[11px] font-black text-primary leading-none mt-[1px]">
            {gallery.num_pages} P
          </span>
        </div>
      </div>
      
      <div className="p-3 pt-2 pb-4 flex flex-col gap-1 z-10 relative bg-[#0F1115]">
        <MarqueeText
          text={title}
          className="text-[11px] font-bold text-[#EDF1F5] group-hover:text-primary transition-colors"
          align="left"
          hoverOnly={true}
          isHovered={isHovered}
        />
        <p className="text-[10px] font-medium text-gray-400">
          NHentai Gallery
        </p>
      </div>
    </Link>
  );
}

function NHentaiHome() {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [popularGalleries, setPopularGalleries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || '';
  const [query, setQuery] = useState(searchQuery);
  const [currentSort, setCurrentSort] = useState(sortParam);

  useEffect(() => {
    setQuery(searchQuery);
    setCurrentSort(sortParam);
  }, [searchQuery, sortParam]);
    const [displayCount, setDisplayCount] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth >= 1280 ? 28 : 24
  );

  useEffect(() => {
    const handleResize = () => {
      setDisplayCount(window.innerWidth >= 1280 ? 28 : 24);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchPopular = async () => {
      if (page !== 1 || searchQuery) {
        setPopularGalleries([]);
        return;
      }
      setLoadingPopular(true);
      try {
        const url = `/api/nhentai/galleries/popular`;
        const res = await fetch(url);
        const data = await res.json();
        const results = Array.isArray(data) ? data : data.result || [];
        setPopularGalleries(results.slice(0, 5));
      } catch (e) {
        console.error("Error fetching popular:", e);
      }
      setLoadingPopular(false);
    };
    fetchPopular();
  }, [page, searchQuery]);

  useEffect(() => {
    const fetchGalleries = async () => {
      setLoading(true);
      try {
        const fullQuery = searchQuery ? `${searchQuery} language:english` : 'language:english';
        
        // Calculate which API pages we need to fetch
        const startItemIndex = (page - 1) * displayCount;
        const endItemIndex = page * displayCount - 1;
        const startApiPage = Math.floor(startItemIndex / 25) + 1;
        const endApiPage = Math.floor(endItemIndex / 25) + 1;

        const fetchPage = async (p: number) => {
          let url = `/api/nhentai/search?query=${encodeURIComponent(fullQuery)}&page=${p}`;
          if (sortParam) {
            url += `&sort=${sortParam}`;
          }
          const res = await fetch(url);
          const data = await res.json();
          return data.result || [];
        };

        let combined: any[] = [];
        if (startApiPage === endApiPage) {
          combined = await fetchPage(startApiPage);
        } else {
          const [res1, res2] = await Promise.all([fetchPage(startApiPage), fetchPage(endApiPage)]);
          combined = [...res1, ...res2];
        }

        const startIndexInCombined = startItemIndex % 25;
        const sliced = combined.slice(startIndexInCombined, startIndexInCombined + displayCount);
        
        setGalleries(sliced);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchGalleries();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, searchQuery, displayCount]);

  const handleSearch = (e?: React.FormEvent, newSort?: string) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (/^\d+$/.test(trimmed)) {
      navigate('/gallery/' + trimmed);
      return;
    }
    const targetSort = newSort !== undefined ? newSort : currentSort;
    const newParams: any = {};
    if (trimmed) newParams.q = trimmed;
    if (targetSort) newParams.sort = targetSort;
    setSearchParams(newParams);
    setPage(1);
  };

  const handleSortChangeValue = (newSort: string) => {
    setCurrentSort(newSort);
    handleSearch(undefined, newSort);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8 min-h-screen">
      <div className="mb-10 flex flex-col items-center text-center">
        <h1 className="text-3xl md:text-4xl font-black text-[#EDF1F5] mb-6 tracking-tight">
          Explore <span className="text-primary">NHentai</span>
        </h1>
        
        <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search translated galleries..."
              className="w-full bg-[#151F2E] border border-gray-700 text-[#EDF1F5] rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-gray-500"
            />
          </div>
          <button type="submit" className="bg-primary hover:bg-primary/90 text-[#0B0C0F] px-8 py-3 rounded-xl font-bold transition-colors">
            Search
          </button>
        </form>

        {searchQuery && (
          <div className="flex justify-center flex-wrap items-center gap-3 mt-6">
            <button 
              onClick={() => handleSortChangeValue('')}
              className={`px-5 py-2.5 rounded-xl font-bold text-[15px] transition-colors ${!currentSort ? 'bg-[#252525] text-white' : 'bg-[#151F2E] text-gray-400 hover:text-white'}`}
            >
              Recent
            </button>
            <div className="flex items-center bg-[#151F2E] rounded-xl px-5 py-2.5 gap-4 text-[15px] font-semibold text-gray-400">
              <span>Popular:</span>
              <button 
                onClick={() => handleSortChangeValue('popular-today')}
                className={`hover:text-white transition-colors ${currentSort === 'popular-today' ? 'text-white' : ''}`}
              >
                today
              </button>
              <button 
                onClick={() => handleSortChangeValue('popular-week')}
                className={`hover:text-white transition-colors ${currentSort === 'popular-week' ? 'text-white' : ''}`}
              >
                week
              </button>
              <button 
                onClick={() => handleSortChangeValue('popular')}
                className={`hover:text-white transition-colors ${currentSort === 'popular' ? 'text-white' : ''}`}
              >
                all time
              </button>
            </div>
          </div>
        )}
      </div>

      {page === 1 && !searchQuery && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-primary">★</span> Popular Galleries
          </h2>
          {loadingPopular ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 justify-center max-w-[1150px] mx-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </div>
          ) : popularGalleries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 justify-center max-w-[1150px] mx-auto">
              {popularGalleries.map((g) => (
                <NHentaiCard key={`pop-${g.id}`} gallery={g} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div>
        {!searchQuery && (
          <h2 className="text-2xl font-bold text-white mb-6">
            {page === 1 ? 'New Uploads' : 'More Results'}
          </h2>
        )}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
            {Array.from({ length: displayCount }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
              {galleries.map((g) => (
                <NHentaiCard key={g.id} gallery={g} />
              ))}
            </div>
            
            <div className="flex justify-center items-center gap-6 mt-12 mb-8">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-3 bg-[#151F2E] border border-gray-700 disabled:opacity-50 text-[#EDF1F5] rounded-xl hover:border-primary/50 transition-colors font-bold"
              >
                Previous
              </button>
              <span className="text-gray-400 font-medium">Page <span className="text-white">{page}</span></span>
              <button 
                onClick={() => setPage(p => p + 1)}
                className="px-6 py-3 bg-[#151F2E] border border-gray-700 text-[#EDF1F5] rounded-xl hover:border-primary/50 transition-colors font-bold"
              >
                Next Page
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function NHentaiApp() {
  return (
    <Routes>
      <Route path="/" element={<NHentaiHome />} />
      <Route path="/gallery/:id" element={<NHentaiGallery />} />
    </Routes>
  );
}
