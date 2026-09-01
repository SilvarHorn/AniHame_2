import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, X, Pause, Monitor, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const formatCount = (count: number) => {
  if (!count) return '';
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
  return count.toString();
};

const TagRow = ({ label, tags, type }: { label: string, tags: any[], type: string }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex gap-2 items-start">
      <span className="text-gray-200 font-bold text-[15px] w-24 shrink-0 pt-0.5">{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag: any) => (
          <Link
            to={`/?q=${encodeURIComponent(type + ':"' + tag.name + '"')}`}
            key={tag.id}
            className="flex items-baseline gap-1.5 bg-[#313131] hover:bg-[#313131]/80 hover:text-white text-gray-300 rounded px-2 py-0.5 text-[14px] font-bold transition-colors group"
          >
            <span>{tag.name}</span>
            {tag.count > 0 && (
              <span className="text-gray-400 group-hover:text-gray-300 font-semibold text-[13px]">
                {formatCount(tag.count)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

const timeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

const formatDate = (d: Date) => {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function NHentaiGallery() {
  const { id } = useParams();
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [readerOpen, setReaderOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [readMode, setReadMode] = useState<'single' | 'vertical'>('single');
  const [slideshow, setSlideshow] = useState(false);
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
  }, [gallery]);

  useEffect(() => {
    const fetchGallery = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nhentai/galleries/${id}`);
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
      goToNextPage();
    }, slideshowDelay);
    return () => clearInterval(timer);
  }, [slideshow, readMode, readerOpen, gallery, slideshowDelay, goToNextPage]);

  // Keyboard navigation
  useEffect(() => {
    if (!readerOpen || !gallery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReaderOpen(false);
        setSlideshow(false);
      }
      if (readMode === 'single') {
        if (e.key === 'ArrowRight') goToNextPage();
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

  // Preload next 5 pages
  useEffect(() => {
    if (!gallery || !readerOpen) return;
    const numPagesToPreload = 5;
    for (let i = 1; i <= numPagesToPreload; i++) {
      const p = currentPage + i;
      if (p < gallery.num_pages) {
        const img = new Image();
        img.src = gallery.pages && gallery.pages[p] 
          ? `https://i3.nhentai.net/${gallery.pages[p].path}`
          : `https://i3.nhentai.net/galleries/${gallery.media_id}/${p + 1}.jpg`;
      }
    }
  }, [currentPage, gallery, readerOpen]);

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center text-primary font-bold text-xl animate-pulse">Loading Gallery...</div>;
  }

  if (!gallery) return <div className="p-6 text-red-500 font-bold text-center mt-20">Gallery not found.</div>;

  const openReader = (index: number) => {
    setCurrentPage(index);
    setReaderOpen(true);
  };

  const getThumbSrc = (i: number) => {
    if (gallery.pages && gallery.pages[i]) return `https://t3.nhentai.net/${gallery.pages[i].thumbnail}`;
    return `https://t3.nhentai.net/galleries/${gallery.media_id}/${i + 1}t.jpg`;
  };
  
  const getImageSrc = (i: number) => {
    if (gallery.pages && gallery.pages[i]) return `https://i3.nhentai.net/${gallery.pages[i].path}`;
    return `https://i3.nhentai.net/galleries/${gallery.media_id}/${i + 1}.jpg`;
  };

  const handleThumbError = (e: any, i: number) => {
    const el = e.currentTarget;
    if (!el.dataset.fb1) {
      el.dataset.fb1 = 'true';
      el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/${i + 1}t.webp`;
    } else if (!el.dataset.fb2) {
      el.dataset.fb2 = 'true';
      el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/${i + 1}t.jpg`;
    } else if (!el.dataset.fb3) {
      el.dataset.fb3 = 'true';
      el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/${i + 1}.jpg`;
    } else if (!el.dataset.fb4) {
      el.dataset.fb4 = 'true';
      el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/${i + 1}.webp`;
    }
  };

  const handleImgError = (e: any, i: number) => {
    const el = e.currentTarget;
    if (!el.dataset.fb1) {
      el.dataset.fb1 = 'true';
      el.src = `https://i3.nhentai.net/galleries/${gallery.media_id}/${i + 1}.webp`;
    } else if (!el.dataset.fb2) {
      el.dataset.fb2 = 'true';
      el.src = `https://i3.nhentai.net/galleries/${gallery.media_id}/${i + 1}.jpg`;
    }
  };

  const coverUrl = gallery.cover?.path 
    ? `https://t3.nhentai.net/${gallery.cover.path}` 
    : (gallery.thumbnail?.path 
        ? `https://t3.nhentai.net/${gallery.thumbnail.path}` 
        : `https://t3.nhentai.net/galleries/${gallery.media_id}/cover.jpg`);



  const groupedTags = gallery?.tags?.reduce((acc: any, tag: any) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="min-h-screen bg-[#0B0C0F] pb-20">
      {/* Hero Header */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-xl opacity-30 scale-110"
          style={{ backgroundImage: `url(${coverUrl})` }}
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
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#151F2E] aspect-[3/4] mb-6 cursor-pointer relative" onClick={() => openReader(0)}>
            {!coverLoaded && (
              <div className="absolute inset-0 z-10 bg-[#1A2333] animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            <img 
              src={coverUrl} 
              onLoad={() => setCoverLoaded(true)}
              onError={(e: any) => {
                const el = e.currentTarget;
                if (!el.dataset.fb1) {
                  el.dataset.fb1 = 'true';
                  el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/cover.jpg`;
                } else if (!el.dataset.fb2) {
                  el.dataset.fb2 = 'true';
                  el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/cover.webp`;
                } else if (!el.dataset.fb3) {
                  el.dataset.fb3 = 'true';
                  el.src = `https://t3.nhentai.net/galleries/${gallery.media_id}/thumb.webp`;
                }
              }}
              alt="Cover" 
              className={`w-full h-full object-cover transition-all duration-500 hover:scale-105 ${coverLoaded ? 'opacity-100' : 'opacity-0 scale-95'}`}
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
        <div className="flex-1 mt-4 md:mt-16 text-[#EDF1F5] max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-snug">
            {gallery.title?.english || gallery.title?.pretty}
          </h1>
          {gallery.title?.japanese && (
            <h2 className="text-gray-200 font-bold text-lg md:text-xl mb-6">
              {gallery.title.japanese}
            </h2>
          )}
          
          <div className="text-gray-400 font-bold text-[17px] mb-6">
            #{gallery.id}
          </div>

          <div className="flex flex-col gap-2.5">
            <TagRow label="Parodies" type="parody" tags={groupedTags.parody} />
            <TagRow label="Characters" type="character" tags={groupedTags.character} />
            <TagRow label="Tags" type="tag" tags={groupedTags.tag} />
            <TagRow label="Artists" type="artist" tags={groupedTags.artist} />
            <TagRow label="Groups" type="group" tags={groupedTags.group} />
            <TagRow label="Languages" type="language" tags={groupedTags.language} />
            <TagRow label="Categories" type="category" tags={groupedTags.category} />

            <div className="flex gap-2 items-start mt-1">
              <span className="text-gray-200 font-bold text-[15px] w-24 shrink-0 pt-0.5">Pages:</span>
              <span className="bg-[#313131] text-gray-200 rounded px-2 py-0.5 text-[14px] font-bold">
                {gallery.num_pages}
              </span>
            </div>
            
            {gallery.upload_date && (
              <div className="flex gap-2 items-start mt-1">
                <span className="text-gray-200 font-bold text-[15px] w-24 shrink-0 pt-0.5">Uploaded:</span>
                <span className="text-gray-300 text-[15px] font-semibold pt-0.5">
                  {timeAgo(new Date(gallery.upload_date * 1000))} ({formatDate(new Date(gallery.upload_date * 1000))})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Pages (Card View) */}
      <div id="gallery-reader" className="max-w-[1600px] mx-auto px-4 md:px-6 mt-16 scroll-mt-24">
        <h3 className="text-xl font-bold text-white mb-6">Gallery Pages</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {Array.from({ length: gallery.num_pages || 0 }).map((_, i) => (
            <div 
              key={i} 
              onClick={() => openReader(i)}
              className="bg-[#0F1115] rounded-xl overflow-hidden border border-white/5 relative group cursor-pointer"
            >
              <div className="aspect-[3/4] relative bg-\[#151F2E\]">
                <img 
                  src={getThumbSrc(i)}
                  onError={(e) => handleThumbError(e, i)}
                  alt={`Page ${i + 1}`}
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
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  <div className="flex items-center" title="Slideshow Speed">
                    <input 
                      type="number" 
                      min="1"
                      max="60"
                      value={slideshowDelay / 1000}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0) setSlideshowDelay(val * 1000);
                      }}
                      className="bg-transparent text-xs font-bold text-gray-300 outline-none w-8 text-right pr-1 custom-number-input"
                    />
                    <span className="text-xs font-bold text-gray-400 select-none">s</span>
                  </div>
                  <button 
                    onClick={() => setSlideshow(!slideshow)}
                    className={`p-1.5 rounded-md transition-colors ${slideshow ? 'text-primary bg-primary/20' : 'hover:bg-white/10'}`}
                    title="Toggle Slideshow"
                  >
                    {slideshow ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>
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
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentPage}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    src={getImageSrc(currentPage)}
                    onError={(e: any) => handleImgError(e, currentPage)}
                    alt={`Page ${currentPage + 1}`}
                    className="max-w-full max-h-full object-contain pointer-events-none"
                  />
                </AnimatePresence>
                
                {/* Navigation Click Zones */}
                <div 
                  className="absolute top-0 bottom-0 left-0 w-[20%] cursor-pointer z-10" 
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  title="Previous Page"
                />
                <div 
                  className="absolute top-0 bottom-0 right-0 w-[80%] cursor-pointer z-10" 
                  onClick={goToNextPage}
                  title="Next Page"
                />
              </div>
            ) : (
              <div className="flex-1 w-full h-full overflow-y-auto px-4 py-8 flex flex-col items-center gap-6">
                {Array.from({ length: gallery.num_pages }).map((_, i) => (
                  <div key={i} id={`reader-page-${i}`} className="w-full max-w-4xl relative">
                    <img 
                      src={getImageSrc(i)}
                      onError={(e) => handleImgError(e, i)}
                      alt={`Page ${i + 1}`}
                      onClick={() => {
                        if (i === gallery.num_pages - 1) {
                          setReaderOpen(false);
                          setSlideshow(false);
                        } else {
                          const nextImg = document.getElementById(`reader-page-${i + 1}`);
                          if (nextImg) nextImg.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="w-full h-auto rounded-lg shadow-2xl cursor-pointer"
                      title="Next Page"
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
