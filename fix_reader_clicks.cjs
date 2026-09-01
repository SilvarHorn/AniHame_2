const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

// 1. Fix single mode click zones
const oldZones = `                {/* Navigation Click Zones */}
                <div 
                  className="absolute top-0 bottom-0 left-0 w-1/2 cursor-w-resize z-10" 
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  title="Previous Page"
                />
                <div 
                  className="absolute top-0 bottom-0 right-0 w-1/2 cursor-e-resize z-10" 
                  onClick={goToNextPage}
                  title="Next Page"
                />`;

const newZones = `                {/* Navigation Click Zones */}
                <div 
                  className="absolute top-0 bottom-0 left-0 w-[20%] cursor-pointer z-10" 
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  title="Previous Page"
                />
                <div 
                  className="absolute top-0 bottom-0 right-0 w-[80%] cursor-pointer z-10" 
                  onClick={goToNextPage}
                  title="Next Page"
                />`;

content = content.replace(oldZones, newZones);

// 2. Fix vertical mode clicking
const oldVertical = `              <div className="flex-1 w-full h-full overflow-y-auto px-4 py-8 flex flex-col items-center gap-6">
                {Array.from({ length: gallery.num_pages }).map((_, i) => (
                  <div key={i} className="w-full max-w-4xl relative">
                    <img 
                      src={getImageSrc(i)}
                      onError={(e) => handleImgError(e, i)}
                      alt={\`Page \${i + 1}\`}
                      className="w-full h-auto rounded-lg shadow-2xl"
                      loading="lazy"
                    />`;

const newVertical = `              <div className="flex-1 w-full h-full overflow-y-auto px-4 py-8 flex flex-col items-center gap-6">
                {Array.from({ length: gallery.num_pages }).map((_, i) => (
                  <div key={i} id={\`reader-page-\${i}\`} className="w-full max-w-4xl relative">
                    <img 
                      src={getImageSrc(i)}
                      onError={(e) => handleImgError(e, i)}
                      alt={\`Page \${i + 1}\`}
                      onClick={() => {
                        if (i === gallery.num_pages - 1) {
                          setReaderOpen(false);
                          setSlideshow(false);
                        } else {
                          const nextImg = document.getElementById(\`reader-page-\${i + 1}\`);
                          if (nextImg) nextImg.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="w-full h-auto rounded-lg shadow-2xl cursor-pointer"
                      title="Next Page"
                      loading="lazy"
                    />`;

content = content.replace(oldVertical, newVertical);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
