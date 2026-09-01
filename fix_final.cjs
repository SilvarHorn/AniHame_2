const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

// 1. Center the form and sort options
content = content.replace(
  'className="flex flex-col sm:flex-row gap-3 max-w-2xl"',
  'className="flex flex-col sm:flex-row gap-3 max-w-2xl"' // Actually maybe add mx-auto to the outer container instead?
);

// Let's replace the outer mb-10 div
const oldMb10 = `<div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-[#EDF1F5] mb-6 tracking-tight">
          Explore <span className="text-primary">NHentai</span>
        </h1>
        
        <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-3 max-w-2xl">`;
const newMb10 = `<div className="mb-10 flex flex-col items-center text-center">
        <h1 className="text-3xl md:text-4xl font-black text-[#EDF1F5] mb-6 tracking-tight">
          Explore <span className="text-primary">NHentai</span>
        </h1>
        
        <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">`;
content = content.replace(oldMb10, newMb10);

// Center the sort options
content = content.replace(
  '<div className="flex items-center gap-3 mt-6">',
  '<div className="flex justify-center flex-wrap items-center gap-3 mt-6">'
);

// 2. Hide Popular Galleries on search
content = content.replace(
  '{page === 1 && (\\n        <div className="mb-12">',
  '{page === 1 && !searchQuery && (\\n        <div className="mb-12">'
);
content = content.replace(
  /\{page === 1 && \(\s*<div className="mb-12">/,
  '{page === 1 && !searchQuery && (\n        <div className="mb-12">'
);


// 3. Hide New Uploads/More Results headers on search
content = content.replace(
  /<h2 className="text-2xl font-bold text-white mb-6">\s*\{page === 1 \? 'New Uploads' : 'More Results'\}\s*<\/h2>/,
  `{!searchQuery && (
          <h2 className="text-2xl font-bold text-white mb-6">
            {page === 1 ? 'New Uploads' : 'More Results'}
          </h2>
        )}`
);

// 4. Update the img fallback in NHentaiCard
const oldImg = `<img 
          src={\`https://t3.nhentai.net/galleries/\${gallery.media_id}/thumb.webp\`} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />`;
const newImg = `<img 
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
        />`;
content = content.replace(oldImg, newImg);


fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done');
