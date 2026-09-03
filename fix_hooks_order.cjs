const fs = require('fs');

let content = fs.readFileSync('src/pages/Watch.tsx', 'utf8');

const docchiEffectStr = `
  // Docchi fetch effect
  useEffect(() => {
    if (isHanimeMode() && anime) {
      setServerType('docchi');
      setIsDocchiLoading(true);
      const aTitle = anime.title.romaji || anime.title.english;
      let slug = aTitle ? aTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      
      fetch(\`/api/docchi/\${slug}/\${currentEp}\`)
        .then(res => res.json())
        .then(data => {
          if (data && (data.episodes || data.episode_url)) {
            const players = data.episodes || data.episode_url || [];
            setDocchiPlayers(players);
            setSelectedDocchiPlayer(0);
          } else {
            setDocchiPlayers([]);
          }
        })
        .catch(err => {
          console.error("Docchi fetch error:", err);
          setDocchiPlayers([]);
        })
        .finally(() => {
          setIsDocchiLoading(false);
        });
    }
  }, [anime, currentEp]);
`;

// Remove it from its current location
content = content.replace(docchiEffectStr, '');

// Insert it before `if (error) {`
content = content.replace(
  "  if (error) {",
  docchiEffectStr + "\n  if (error) {"
);

fs.writeFileSync('src/pages/Watch.tsx', content);
console.log('Hooks order fixed');
