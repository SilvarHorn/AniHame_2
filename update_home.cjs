const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

const newHome = `function NHentaiHome() {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [popularGalleries, setPopularGalleries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);
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
      if (page !== 1) {
        setPopularGalleries([]);
        return;
      }
      setLoadingPopular(true);
      try {
        const fullQuery = searchQuery ? \`\${searchQuery} language:english\` : 'language:english';
        const url = \`/api/nhentai/search?query=\${encodeURIComponent(fullQuery)}&sort=popular&page=1\`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data.result || [];
        setPopularGalleries(results.slice(0, displayCount));
      } catch (e) {
        console.error("Error fetching popular:", e);
      }
      setLoadingPopular(false);
    };
    fetchPopular();
  }, [page, searchQuery, displayCount]);

  useEffect(() => {
    const fetchGalleries = async () => {
      setLoading(true);
      try {
        const fullQuery = searchQuery ? \`\${searchQuery} language:english\` : 'language:english';
        
        // Calculate which API pages we need to fetch
        const startItemIndex = (page - 1) * displayCount;
        const endItemIndex = page * displayCount - 1;
        const startApiPage = Math.floor(startItemIndex / 25) + 1;
        const endApiPage = Math.floor(endItemIndex / 25) + 1;

        const fetchPage = async (p: number) => {
          const url = \`/api/nhentai/search?query=\${encodeURIComponent(fullQuery)}&page=\${p}\`;
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (/^\\d+$/.test(trimmed)) {
      navigate('/gallery/' + trimmed);
      return;
    }
    setSearchParams(trimmed ? { q: trimmed } : {});
    setPage(1);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8 min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-[#EDF1F5] mb-6 tracking-tight">
          Explore <span className="text-primary">NHentai</span>
        </h1>
        
        <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
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
      </div>

      {page === 1 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-primary">★</span> Popular Galleries
          </h2>
          {loadingPopular ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
              {Array.from({ length: displayCount }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </div>
          ) : popularGalleries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
              {popularGalleries.map((g) => (
                <NHentaiCard key={\`pop-\${g.id}\`} gallery={g} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          {page === 1 ? 'New Uploads' : 'More Results'}
        </h2>
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
}`;

content = content.replace(/function NHentaiHome\(\) \{[\s\S]*\}\s*$/m, newHome + '\n');
fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done');
