const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

const hookAnchor = `  // Disable body scroll when reader is open
  useEffect(() => {
    if (readerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [readerOpen]);`;

const preloadHook = `  // Disable body scroll when reader is open
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
          ? \`https://i3.nhentai.net/\${gallery.pages[p].path}\`
          : \`https://i3.nhentai.net/galleries/\${gallery.media_id}/\${p + 1}.jpg\`;
      }
    }
  }, [currentPage, gallery, readerOpen]);`;

content = content.replace(hookAnchor, preloadHook);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
