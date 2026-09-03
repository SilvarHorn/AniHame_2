const fs = require('fs');

let content = fs.readFileSync('src/api/animeschedule.ts', 'utf8');

if (!content.includes('isHanimeMode')) {
  content = `import { isHanimeMode } from './anilist';\n` + content;
  content = content.replace(
    'if (details && !details.isAdult) {',
    'if (details && (isHanimeMode() ? details.isAdult : !details.isAdult)) {'
  );
  fs.writeFileSync('src/api/animeschedule.ts', content);
}
console.log('done');
