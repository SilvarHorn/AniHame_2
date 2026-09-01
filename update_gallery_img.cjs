const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

// 1. Get cover url
const oldCoverLogic = `  const groupedTags = gallery?.tags?.reduce((acc: any, tag: any) => {`;
const newCoverLogic = `  const coverUrl = gallery.cover?.path 
    ? \`https://t3.nhentai.net/\${gallery.cover.path}\` 
    : (gallery.thumbnail?.path 
        ? \`https://t3.nhentai.net/\${gallery.thumbnail.path}\` 
        : \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg\`);

  const [coverLoaded, setCoverLoaded] = React.useState(false);

  const groupedTags = gallery?.tags?.reduce((acc: any, tag: any) => {`;

content = content.replace(oldCoverLogic, newCoverLogic);

// 2. Background image
content = content.replace(
  /style=\{\{ backgroundImage: \`url\(https:\/\/t3\.nhentai\.net\/galleries\/\$\{gallery\.media_id\}\/cover\.jpg\)\` \}\}/g,
  `style={{ backgroundImage: \`url(\${coverUrl})\` }}`
);

// 3. Foreground cover image
const oldForegroundCover = `<img 
              src={\`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg\`} 
              onError={(e: any) => { e.target.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.webp\`; }}
              alt="Cover" 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />`;

const newForegroundCover = `<img 
              src={coverUrl} 
              onLoad={() => setCoverLoaded(true)}
              onError={(e: any) => {
                const el = e.currentTarget;
                if (!el.dataset.fb1) {
                  el.dataset.fb1 = 'true';
                  el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.jpg\`;
                } else if (!el.dataset.fb2) {
                  el.dataset.fb2 = 'true';
                  el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/cover.webp\`;
                } else if (!el.dataset.fb3) {
                  el.dataset.fb3 = 'true';
                  el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.webp\`;
                }
              }}
              alt="Cover" 
              className={\`w-full h-full object-cover transition-all duration-500 hover:scale-105 \${coverLoaded ? 'opacity-100' : 'opacity-0 scale-95'}\`}
            />`;

content = content.replace(oldForegroundCover, newForegroundCover);

// 4. Also add a spinner to the cover container
const oldCoverContainer = `<div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900 aspect-[3/4] mb-6 cursor-pointer" onClick={() => openReader(0)}>
            <img `;
const newCoverContainer = `<div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#151F2E] aspect-[3/4] mb-6 cursor-pointer relative" onClick={() => openReader(0)}>
            {!coverLoaded && (
              <div className="absolute inset-0 z-10 bg-[#1A2333] animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            <img `;

content = content.replace(oldCoverContainer, newCoverContainer);

// 5. Update getThumbSrc / handleThumbError
const oldThumbError = `  const handleThumbError = (e: any, i: number) => {
    if (!e.currentTarget.dataset.fallback) {
      e.currentTarget.dataset.fallback = 'true';
      const ext = e.currentTarget.src.includes('.jpg') ? '.webp' : '.jpg';
      e.currentTarget.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}t\${ext}\`;
    }
  };`;

const newThumbError = `  const handleThumbError = (e: any, i: number) => {
    const el = e.currentTarget;
    if (!el.dataset.fb1) {
      el.dataset.fb1 = 'true';
      el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}t.webp\`;
    } else if (!el.dataset.fb2) {
      el.dataset.fb2 = 'true';
      el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}t.jpg\`;
    } else if (!el.dataset.fb3) {
      el.dataset.fb3 = 'true';
      el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}.jpg\`;
    } else if (!el.dataset.fb4) {
      el.dataset.fb4 = 'true';
      el.src = \`https://t3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}.webp\`;
    }
  };`;

content = content.replace(oldThumbError, newThumbError);

const oldImgError = `  const handleImgError = (e: any, i: number) => {
    if (!e.currentTarget.dataset.fallback) {
      e.currentTarget.dataset.fallback = 'true';
      const ext = e.currentTarget.src.includes('.jpg') ? '.webp' : '.jpg';
      e.currentTarget.src = \`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}\${ext}\`;
    }
  };`;

const newImgError = `  const handleImgError = (e: any, i: number) => {
    const el = e.currentTarget;
    if (!el.dataset.fb1) {
      el.dataset.fb1 = 'true';
      el.src = \`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}.webp\`;
    } else if (!el.dataset.fb2) {
      el.dataset.fb2 = 'true';
      el.src = \`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${i + 1}.jpg\`;
    }
  };`;

content = content.replace(oldImgError, newImgError);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
