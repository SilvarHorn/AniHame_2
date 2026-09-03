const fs = require('fs');
let content = fs.readFileSync('src/pages/Watch.tsx', 'utf8');
content = content.replace(/console\.error\("Docchi fetch error:", err\);/g, 'console.log("Docchi players not available");');
fs.writeFileSync('src/pages/Watch.tsx', content);
