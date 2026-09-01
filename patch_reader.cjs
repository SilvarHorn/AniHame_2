const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

// 1. Add slideshowDelay state
const oldState = `  const [slideshow, setSlideshow] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);`;
const newState = `  const [slideshow, setSlideshow] = useState(false);
  const [slideshowDelay, setSlideshowDelay] = useState(3000);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const goToNextPage = React.useCallback(() => {
    setCurrentPage(p => {
      if (p >= gallery.num_pages - 1) {
        setTimeout(() => {
          setReaderOpen(false);
          setSlideshow(false);
        }, 0);
        return p;
      }
      return p + 1;
    });
  }, [gallery]);`;
content = content.replace(oldState, newState);

// 2. Fix Slideshow Effect
const oldSlideshowHook = `  // Slideshow
  useEffect(() => {
    if (!slideshow || readMode !== 'single' || !readerOpen || !gallery) return;
    const timer = setInterval(() => {
      setCurrentPage(p => {
        if (p < gallery.num_pages - 1) return p + 1;
        setSlideshow(false);
        return p;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [slideshow, readMode, readerOpen, gallery]);`;

const newSlideshowHook = `  // Slideshow
  useEffect(() => {
    if (!slideshow || readMode !== 'single' || !readerOpen || !gallery) return;
    const timer = setInterval(() => {
      goToNextPage();
    }, slideshowDelay);
    return () => clearInterval(timer);
  }, [slideshow, readMode, readerOpen, gallery, slideshowDelay, goToNextPage]);`;
content = content.replace(oldSlideshowHook, newSlideshowHook);

// 3. Fix Keyboard Navigation
const oldKeyNav = `        if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(gallery.num_pages - 1, p + 1));
        if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(0, p - 1));`;
const newKeyNav = `        if (e.key === 'ArrowRight') goToNextPage();
        if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(0, p - 1));`;
content = content.replace(oldKeyNav, newKeyNav);

// 4. Update Click Zones
const oldClickZone = `                <div 
                  className="absolute top-0 bottom-0 right-0 w-1/2 cursor-e-resize z-10" 
                  onClick={() => setCurrentPage(p => Math.min(gallery.num_pages - 1, p + 1))}
                  title="Next Page"
                />`;
const newClickZone = `                <div 
                  className="absolute top-0 bottom-0 right-0 w-1/2 cursor-e-resize z-10" 
                  onClick={goToNextPage}
                  title="Next Page"
                />`;
content = content.replace(oldClickZone, newClickZone);

// 5. Update Toolbar
const oldToolbar = `              {readMode === 'single' && (
                <button 
                  onClick={() => setSlideshow(!slideshow)}
                  className={\`p-2 rounded-lg transition-colors \${slideshow ? 'text-primary bg-primary/10' : 'hover:bg-white/10'}\`}
                  title="Slideshow"
                >
                  {slideshow ? <Pause size={20} /> : <Play size={20} />}
                </button>
              )}`;
const newToolbar = `              {readMode === 'single' && (
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  <select 
                    value={slideshowDelay} 
                    onChange={(e) => setSlideshowDelay(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-gray-300 outline-none cursor-pointer appearance-none pl-2 pr-1"
                    title="Slideshow Speed"
                  >
                    <option value={1000} className="bg-gray-900">1s</option>
                    <option value={2000} className="bg-gray-900">2s</option>
                    <option value={3000} className="bg-gray-900">3s</option>
                    <option value={5000} className="bg-gray-900">5s</option>
                    <option value={10000} className="bg-gray-900">10s</option>
                  </select>
                  <button 
                    onClick={() => setSlideshow(!slideshow)}
                    className={\`p-1.5 rounded-md transition-colors \${slideshow ? 'text-primary bg-primary/20' : 'hover:bg-white/10'}\`}
                    title="Toggle Slideshow"
                  >
                    {slideshow ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>
              )}`;
content = content.replace(oldToolbar, newToolbar);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
