const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, X, Pause, Monitor, List } from 'lucide-react';

export default function NHentaiGallery() {
  const { id } = useParams();
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [readerOpen, setReaderOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [readMode, setReadMode] = useState<'single' | 'vertical'>('single');
  const [slideshow, setSlideshow] = useState(false);

  useEffect(() => {
    const fetchGallery = async () => {
      setLoading(true);
      try {
        const res = await fetch(\`/api/nhentai/galleries/\${id}\`);
        const data = await res.json();
        setGallery(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchGallery();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Slideshow
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
  }, [slideshow, readMode, readerOpen, gallery]);

  // Keyboard navigation
  useEffect(() => {
    if (!readerOpen || !gallery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReaderOpen(false);
        setSlideshow(false);
      }
      if (readMode === 'single') {
        if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(gallery.num_pages - 1, p + 1));
        if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(0, p - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerOpen, readMode, gallery]);
  
  // Disable body scroll when reader is open
  useEffect(() => {
    if (readerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [readerOpen]);

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center text-primary font-bold text-xl animate-pulse">Loading Gallery...</div>;
  }

  if (!gallery) return <div className="p-6 text-red-500 font-bold text-center mt-20">Gallery not found.</div>;

  const openReader = (index: number) => {
    setCurrentPage(index);
    setReaderOpen(true);
  };

  const getThumbSrc = (i: number) => {
    if (gallery.pages && gallery.pages[i]) return \`https://t3.nhentai.net/\${gallery.pages[i].thumbnail}\`;
    return \`https://t3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}t.jpg\`;
  };
  
  const getImageSrc = (i: number) => {
    if (gallery.pages && gallery.pages[i]) return \`https://i3.nhentai.net/\${gallery.pages[i].path}\`;
    return \`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}.jpg\`;
  };

  const handleThumbError = (e: any, i: number) => {
    if (!e.currentTarget.dataset.fallback) {
      e.currentTarget.dataset.fallback = 'true';
      const ext = e.currentTarget.src.includes('.jpg') ? '.webp' : '.jpg';
      e.currentTarget.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}t\${ext}\`;
    }
  };

  const handleImgError = (e: any, i: number) => {
    if (!e.currentTarget.dataset.fallback) {
      e.currentTarget.dataset.fallback = 'true';
      const ext = e.currentTarget.src.includes('.jpg') ? '.webp' : '.jpg';
      e.currentTarget.src = \`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}\${ext}\`;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0F] pb-20">
      {/* Hero Header */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-xl opacity-30 scale-110"
          style={{ backgroundImage: \`url(https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg)\` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0F] via-[#0B0C0F]/60 to-transparent" />
        
        <div className="absolute inset-0 max-w-[1600px] mx-auto px-4 md:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mt-6 py-2">
            <ChevronLeft size={20} />
            <span className="font-semibold text-sm">Back to Search</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 -mt-32 md:-mt-48 relative z-10 flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="w-48 md:w-64 lg:w-80 shrink-0 mx-auto md:mx-0">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900 aspect-[3/4] mb-6 cursor-pointer" onClick={() => openReader(0)}>
            <img 
              src={\`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg\`} 
              onError={(e: any) => { e.target.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.webp\`; }}
              alt="Cover" 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
          <button
            onClick={() => openReader(0)}
            className="w-full bg-primary hover:bg-primary/90 text-[#0B0C0F] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <Play size={20} fill="currentColor" />
            Start Reading
          </button>
        </div>

        {/* Details */}
        <div className="flex-1 mt-4 md:mt-16 text-[#EDF1F5]">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2 leading-tight">
            {gallery.title?.english || gallery.title?.pretty}
          </h1>
          {gallery.title?.japanese && (
            <h2 className="text-gray-400 text-sm md:text-base font-semibold mb-6">
              {gallery.title.japanese}
            </h2>
          )}
          
          <div className="flex flex-wrap gap-2 mb-8">
            {gallery.tags?.map((tag: any) => (
              <Link 
                to={\`/?q=\${encodeURIComponent('tag:"' + tag.name + '"')}\`}
                key={tag.id} 
                className="bg-[#151F2E] hover:bg-primary hover:text-[#0B0C0F] border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full text-xs font-semibold capitalize tracking-wide transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>

          <div className="flex gap-6 mb-8 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500 font-bold mb-1">Pages</span>
              <span className="text-xl font-black text-primary">{gallery.num_pages}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 font-bold mb-1">Favorites</span>
              <span className="text-xl font-black text-white">{gallery.num_favorites}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Pages (Card View) */}
      <div id="gallery-reader" className="max-w-[1600px] mx-auto px-4 md:px-6 mt-16 scroll-mt-24">
        <h3 className="text-xl font-bold text-white mb-6">Gallery Pages</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: gallery.num_pages || 0 }).map((_, i) => (
            <div 
              key={i} 
              onClick={() => openReader(i)}
              className="bg-[#0F1115] rounded-xl overflow-hidden border border-white/5 relative group cursor-pointer"
            >
              <div className="aspect-[3/4] relative bg-gray-900">
                <img 
                  src={getThumbSrc(i)}
                  onError={(e) => handleThumbError(e, i)}
                  alt={\`Page \${i + 1}\`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/10">
                <span className="text-[10px] font-black text-white leading-none">
                  {i + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dedicated Page Viewer (Overlay) */}
      {readerOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
          {/* Reader Toolbar */}
          <div className="h-14 bg-black/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-4 text-white">
              <button 
                onClick={() => { setReaderOpen(false); setSlideshow(false); }}
                className="hover:text-primary transition-colors p-2 -ml-2"
              >
                <X size={24} />
              </button>
              <span className="font-bold text-sm">
                Page {currentPage + 1} / {gallery.num_pages}
              </span>
            </div>
            <div className="flex items-center gap-2 text-white">
              {readMode === 'single' && (
                <button 
                  onClick={() => setSlideshow(!slideshow)}
                  className={\`p-2 rounded-lg transition-colors \${slideshow ? 'text-primary bg-primary/10' : 'hover:bg-white/10'}\`}
                  title="Slideshow"
                >
                  {slideshow ? <Pause size={20} /> : <Play size={20} />}
                </button>
              )}
              <button 
                onClick={() => {
                  setReadMode(m => m === 'single' ? 'vertical' : 'single');
                  setSlideshow(false);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Toggle Reading Mode"
              >
                {readMode === 'single' ? <List size={20} /> : <Monitor size={20} />}
              </button>
            </div>
          </div>

          {/* Reader Content */}
          <div className="flex-1 w-full relative overflow-hidden flex flex-col">
            {readMode === 'single' ? (
              <div className="flex-1 w-full h-full flex items-center justify-center relative">
                <img
                  key={currentPage} // force re-render for smooth load
                  src={getImageSrc(currentPage)}
                  onError={(e) => handleImgError(e, currentPage)}
                  alt={\`Page \${currentPage + 1}\`}
                  className="max-w-full max-h-full object-contain pointer-events-none"
                />
                
                {/* Navigation Click Zones */}
                <div 
                  className="absolute top-0 bottom-0 left-0 w-1/2 cursor-w-resize z-10" 
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  title="Previous Page"
                />
                <div 
                  className="absolute top-0 bottom-0 right-0 w-1/2 cursor-e-resize z-10" 
                  onClick={() => setCurrentPage(p => Math.min(gallery.num_pages - 1, p + 1))}
                  title="Next Page"
                />
              </div>
            ) : (
              <div className="flex-1 w-full h-full overflow-y-auto px-4 py-8 flex flex-col items-center gap-6">
                {Array.from({ length: gallery.num_pages }).map((_, i) => (
                  <div key={i} className="w-full max-w-4xl relative">
                    <img 
                      src={getImageSrc(i)}
                      onError={(e) => handleImgError(e, i)}
                      alt={\`Page \${i + 1}\`}
                      className="w-full h-auto rounded-lg shadow-2xl"
                      loading="lazy"
                    />
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white font-bold text-xs">
                      Page {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', code);
console.log('done');
