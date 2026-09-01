const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

const oldState = `  const [slideshow, setSlideshow] = useState(false);`;
const newState = `  const [slideshow, setSlideshow] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);`;

content = content.replace(oldState, newState);

fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
