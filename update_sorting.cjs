const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

// 1. Add sortParam and currentSort state
content = content.replace(
  "const searchQuery = searchParams.get('q') || '';\n  const [query, setQuery] = useState(searchQuery);",
  "const searchQuery = searchParams.get('q') || '';\n  const sortParam = searchParams.get('sort') || '';\n  const [query, setQuery] = useState(searchQuery);\n  const [currentSort, setCurrentSort] = useState(sortParam);"
);

// 2. Update the useEffect for search params
content = content.replace(
  "useEffect(() => {\n    setQuery(searchQuery);\n  }, [searchQuery]);",
  "useEffect(() => {\n    setQuery(searchQuery);\n    setCurrentSort(sortParam);\n  }, [searchQuery, sortParam]);"
);

// 3. Update the handleSearch function
const oldHandleSearch = `const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (/^\\d+$/.test(trimmed)) {
      navigate('/gallery/' + trimmed);
      return;
    }
    setSearchParams(trimmed ? { q: trimmed } : {});
    setPage(1);
  };`;

const newHandleSearch = `const handleSearch = (e?: React.FormEvent, newSort?: string) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (/^\\d+$/.test(trimmed)) {
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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setCurrentSort(newSort);
    handleSearch(undefined, newSort);
  };`;

content = content.replace(oldHandleSearch, newHandleSearch);

// 4. Add the select box into the form
const oldForm = `<form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
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
        </form>`;

const newForm = `<form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-3 max-w-3xl">
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
          <div className="flex gap-3">
            <select 
              value={currentSort}
              onChange={handleSortChange}
              className="bg-[#151F2E] border border-gray-700 text-[#EDF1F5] rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors appearance-none font-semibold cursor-pointer"
            >
              <option value="">Newest</option>
              <option value="popular-today">Popular Today</option>
              <option value="popular">Most Popular All Time</option>
            </select>
            <button type="submit" className="bg-primary hover:bg-primary/90 text-[#0B0C0F] px-8 py-3 rounded-xl font-bold transition-colors">
              Search
            </button>
          </div>
        </form>`;

content = content.replace(oldForm, newForm);

// 5. Update fetchGalleries to use sortParam
const oldFetchPage = `const fetchPage = async (p: number) => {
          const url = \`/api/nhentai/search?query=\${encodeURIComponent(fullQuery)}&page=\${p}\`;
          const res = await fetch(url);
          const data = await res.json();
          return data.result || [];
        };`;

const newFetchPage = `const fetchPage = async (p: number) => {
          let url = \`/api/nhentai/search?query=\${encodeURIComponent(fullQuery)}&page=\${p}\`;
          if (sortParam) {
            url += \`&sort=\${sortParam}\`;
          }
          const res = await fetch(url);
          const data = await res.json();
          return data.result || [];
        };`;

content = content.replace(oldFetchPage, newFetchPage);

// Update dependency array for fetchGalleries useEffect
content = content.replace(
  "}, [page, searchQuery, displayCount]);",
  "}, [page, searchQuery, sortParam, displayCount]);"
);

fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done');
