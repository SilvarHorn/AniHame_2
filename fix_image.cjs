const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

const oldCard = /function NHentaiCard\(\{ gallery \}: \{ gallery: any \}\) \{[\s\S]*?className="absolute top-2 left-2[^>]*>[\s\S]*?<\/span>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/Link>\n  \);\n}/;

const newCard = `function NHentaiCard({ gallery }: { gallery: any }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  const title = gallery.english_title || gallery.japanese_title || gallery.title?.english || gallery.title?.japanese || 'Untitled';
  const thumbnailUrl = gallery.thumbnail 
    ? (gallery.thumbnail.startsWith('http') ? gallery.thumbnail : \`https://t3.nhentai.net/\${gallery.thumbnail}\`)
    : \`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.webp\`;
  
  return (
    <Link 
      to={\`/gallery/\${gallery.id}\`} 
      className="flex flex-col group cursor-pointer bg-[#0F1115] rounded-2xl overflow-hidden border border-white/5 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-[#151F2E]">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#1A2333] animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          src={thumbnailUrl} 
          onLoad={() => setImageLoaded(true)}
          onError={(e: any) => {
            const el = e.currentTarget;
            if (!el.dataset.fb1) {
              el.dataset.fb1 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.jpg\`;
            } else if (!el.dataset.fb2) {
              el.dataset.fb2 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg\`;
            } else if (!el.dataset.fb3) {
              el.dataset.fb3 = 'true';
              el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.webp\`;
            }
          }}
          alt={title}
          className={\`w-full h-full object-cover transition-all duration-500 \${imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0 scale-95'}\`}
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
      
      {/* Rest of the card... wait I need to make sure I don't delete the rest of the card content! */}`;

// Let's do this more cleanly.
