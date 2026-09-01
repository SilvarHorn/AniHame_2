const fs = require('fs');
let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

const oldCode = `  const getPopularCount = () => {
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

const newCode = `  const [displayCount, setDisplayCount] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth >= 1280 ? 28 : 24
  );

  useEffect(() => {
    const handleResize = () => {
      setDisplayCount(window.innerWidth >= 1280 ? 28 : 24);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done2');
