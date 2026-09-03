const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');
content = content.replace(/console\.log\('ERROR docchi:', err\.message\);/g, '');
fs.writeFileSync('api/index.ts', content);
