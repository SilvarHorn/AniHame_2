const fs = require('fs');
let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');
content = content.replace(
  'function NHentaiCard({ gallery }: { gallery: any }) {',
  'function NHentaiCard({ gallery, key }: { gallery: any, key?: React.Key }) {'
);
fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
