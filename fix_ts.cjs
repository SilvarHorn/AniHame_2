const fs = require('fs');
let apiContent = fs.readFileSync('api/index.ts', 'utf8');

apiContent = apiContent.replace(
  'if (!isNaN(ep) && Number(ep) < 10) {',
  'if (!isNaN(Number(ep)) && Number(ep) < 10) {'
);

fs.writeFileSync('api/index.ts', apiContent);
