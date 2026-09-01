const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

// Update fetchPopular
const oldFetch = `const fetchPopular = async () => {
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
        setPopularGalleries(results);
      } catch (e) {
        console.error("Error fetching popular:", e);
      }
      setLoadingPopular(false);
    };
    fetchPopular();
  }, [page, searchQuery, sortParam, displayCount]);`;

const newFetch = `const fetchPopular = async () => {
      if (page !== 1 || searchQuery) {
        setPopularGalleries([]);
        return;
      }
      setLoadingPopular(true);
      try {
        const url = \`/api/nhentai/galleries/popular\`;
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
  }, [page, searchQuery]);`;

content = content.replace(oldFetch, newFetch);

// Update popular layout
const oldPopularLayout = `{loadingPopular ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
              {Array.from({ length: popularCount }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </div>
          ) : popularGalleries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
              {popularGalleries.slice(0, popularCount).map((g) => (
                <NHentaiCard key={\`pop-\${g.id}\`} gallery={g} />
              ))}
            </div>
          ) : null}`;

const newPopularLayout = `{loadingPopular ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 justify-center max-w-[1150px] mx-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </div>
          ) : popularGalleries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 justify-center max-w-[1150px] mx-auto">
              {popularGalleries.map((g) => (
                <NHentaiCard key={\`pop-\${g.id}\`} gallery={g} />
              ))}
            </div>
          ) : null}`;

content = content.replace(oldPopularLayout, newPopularLayout);

fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done');
