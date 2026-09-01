const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

const newResizeLogic = `  const getPopularCount = () => {
    if (typeof window === 'undefined') return 7;
    const w = window.innerWidth;
    if (w >= 1280) return 7;
    if (w >= 1024) return 6;
    if (w >= 768) return 4;
    if (w >= 640) return 3;
    return 2;
  };

  const [displayCount, setDisplayCount] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth >= 1280 ? 28 : 24
  );
  const [popularCount, setPopularCount] = useState(getPopularCount);

  useEffect(() => {
    const handleResize = () => {
      setDisplayCount(window.innerWidth >= 1280 ? 28 : 24);
      setPopularCount(getPopularCount());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);`;

content = content.replace(/const \[displayCount, setDisplayCount\][\s\S]*?\}, \[\]\);/m, newResizeLogic);

// We should also replace the rendering code to use popularCount instead of displayCount
content = content.replace(/setPopularGalleries\(results\.slice\(0, displayCount\)\);/, 'setPopularGalleries(results);');

content = content.replace(/Array\.from\(\{ length: displayCount \}\)\.map\(\(_, i\) => \(\s*<AnimeCardSkeleton key=\{i\} \/>\s*\)\)/, 
  `Array.from({ length: popularCount }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))`);

content = content.replace(/popularGalleries\.map\(\(g\) => \(\s*<NHentaiCard key=\{\`pop-\$\{g\.id\}\`\} gallery=\{g\} \/>\s*\)\)/, 
  `popularGalleries.slice(0, popularCount).map((g) => (
                <NHentaiCard key={\`pop-\${g.id}\`} gallery={g} />
              ))`);

fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done');
