const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

content = content.replace(`  const [coverLoaded, setCoverLoaded] = React.useState(false);`, '');

const oldState = `  const [readMode, setReadMode] = useState<'single'|'list'>('single');`;
const newState = `  const [readMode, setReadMode] = useState<'single'|'list'>('single');
  const [coverLoaded, setCoverLoaded] = useState(false);`;

content = content.replace(oldState, newState);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
