const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

const oldCard = `function NHentaiCard({ gallery }: { gallery: any }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const title = gallery.english_title || gallery.japanese_title || gallery.title?.english || gallery.title?.japanese || 'Untitled';
  
  return (
    <Link 
      to={\`/gallery/\${gallery.id}\`} 
      className="flex flex-col group cursor-pointer bg-[#0F1115] rounded-2xl overflow-hidden border border-white/5 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
        <img 
          src={\`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.jpg\`} 
          onError={(e: any) => {
            const el = e.currentTarget;
            if (!el.dataset.fb1) {
              el.dataset.fb1 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.webp\`;
            } else if (!el.dataset.fb2) {
              el.dataset.fb2 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg\`;
            } else if (!el.dataset.fb3) {
              el.dataset.fb3 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.webp\`;
            }
          }}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Soft bottom gradient to blend with the card background */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-90" />
        
        {/* Page Count */}
        <div className="absolute top-2 left-2 bg-[#050505]/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/5">
          <span className="text-[11px] font-black text-primary leading-none mt-[1px]">
            {gallery.num_pages} P
          </span>
        </div>
      </div>
      
      <div className="p-3 pt-2 pb-4 flex flex-col gap-1 z-10 relative bg-[#0F1115]">
        <MarqueeText
          text={title}
          className="text-[11px] font-bold text-[#EDF1F5] group-hover:text-primary transition-colors"
          align="left"
          hoverOnly={true}
          isHovered={isHovered}
        />
        <p className="text-[10px] font-medium text-gray-400">
          NHentai Gallery
        </p>
      </div>
    </Link>
  );
}`;

const newCard = `function NHentaiCard({ gallery }: { gallery: any }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  const title = gallery.english_title || gallery.japanese_title || gallery.title?.english || gallery.title?.japanese || 'Untitled';
  
  // Use exact thumbnail from API if available, else fallback
  const initialThumb = gallery.thumbnail 
    ? (gallery.thumbnail.startsWith('http') ? gallery.thumbnail : \`https://t3.nhentai.net/\${gallery.thumbnail}\`)
    : \`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.jpg\`;
  
  return (
    <Link 
      to={\`/gallery/\${gallery.id}\`} 
      className="flex flex-col group cursor-pointer bg-[#0F1115] rounded-2xl overflow-hidden border border-white/5 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-[#151F2E]">
        {!imageLoaded && (
          <div className="absolute inset-0 z-10 bg-[#1A2333] animate-pulse flex items-center justify-center">
             {/* Optional spinner or just the skeleton pulse */}
          </div>
        )}
        <img 
          src={initialThumb}
          onLoad={() => setImageLoaded(true)}
          onError={(e: any) => {
            const el = e.currentTarget;
            if (!el.dataset.fb1) {
              el.dataset.fb1 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.webp\`;
            } else if (!el.dataset.fb2) {
              el.dataset.fb2 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg\`;
            } else if (!el.dataset.fb3) {
              el.dataset.fb3 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.webp\`;
            } else if (!el.dataset.fb4) {
               el.dataset.fb4 = 'true';
               el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/1.jpg\`;
            } else if (!el.dataset.fb5) {
               el.dataset.fb5 = 'true';
               el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/1.webp\`;
            } else {
               // Total fallback
               setImageLoaded(true); 
            }
          }}
          alt={title}
          className={\`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 \${imageLoaded ? 'opacity-100' : 'opacity-0 scale-95'}\`}
          loading="lazy"
        />
        {/* Soft bottom gradient to blend with the card background */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-90" />
        
        {/* Page Count */}
        <div className="absolute top-2 left-2 bg-[#050505]/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/5">
          <span className="text-[11px] font-black text-primary leading-none mt-[1px]">
            {gallery.num_pages} P
          </span>
        </div>
      </div>
      
      <div className="p-3 pt-2 pb-4 flex flex-col gap-1 z-10 relative bg-[#0F1115]">
        <MarqueeText
          text={title}
          className="text-[11px] font-bold text-[#EDF1F5] group-hover:text-primary transition-colors"
          align="left"
          hoverOnly={true}
          isHovered={isHovered}
        />
        <p className="text-[10px] font-medium text-gray-400">
          NHentai Gallery
        </p>
      </div>
    </Link>
  );
}`;

content = content.replace(oldCard, newCard);
fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done');
