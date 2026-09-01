const fs = require('fs');
let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

// Update Tags
content = content.replace(
  /{gallery\.tags\?\.map\(\(tag: any\) => \([\s\S]*?<\/span>\n            \)\)}/,
  `{gallery.tags?.map((tag: any) => (
              <Link 
                to={\`/?q=\${encodeURIComponent('tag:"' + tag.name + '"')}\`}
                key={tag.id} 
                className="bg-[#151F2E] hover:bg-primary hover:text-[#0B0C0F] border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full text-xs font-semibold capitalize tracking-wide transition-colors"
              >
                {tag.name}
              </Link>
            ))}`
);

// Update Grid of Pages to Vertical Scroll
content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">[\s\S]*?<\/div>\n      <\/div>/,
  `<div className="flex flex-col items-center gap-4 max-w-4xl mx-auto">
          {gallery.pages ? gallery.pages.map((page: any, i: number) => (
            <div key={i} className="w-full bg-[#0F1115] rounded-xl overflow-hidden border border-white/5 relative group">
              <img 
                src={\`https://i3.nhentai.net/\${page.path}\`}
                onError={(e: any) => { 
                   if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = 'true';
                      e.currentTarget.src = \`https://i7.nhentai.net/\${page.path}\`;
                   }
                }}
                alt={\`Page \${i + 1}\`}
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-black text-white leading-none">
                  Page {i + 1}
                </span>
              </div>
            </div>
          )) : Array.from({ length: gallery.num_pages || 0 }).map((_, i) => (
            <div key={i} className="w-full bg-[#0F1115] rounded-xl overflow-hidden border border-white/5 relative group">
              <img 
                src={\`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}.jpg\`}
                onError={(e: any) => { 
                   if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = 'true';
                      e.currentTarget.src = \`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}.webp\`;
                   }
                }}
                alt={\`Page \${i + 1}\`}
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-black text-white leading-none">
                  Page {i + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>`
);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('updated NHentaiGallery');
