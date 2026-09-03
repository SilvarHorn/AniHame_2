const fs = require('fs');

let content = fs.readFileSync('src/pages/Watch.tsx', 'utf8');

content = content.replace(
  "{serverType !== 'vidsrc' && (",
  "{serverType === 'mal' && ("
);

fs.writeFileSync('src/pages/Watch.tsx', content);
console.log('done');
