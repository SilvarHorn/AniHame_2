const fs = require('fs');
let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

content = content.replace(
  'className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"',
  'className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4"'
);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
