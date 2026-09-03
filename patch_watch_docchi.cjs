const fs = require('fs');

let content = fs.readFileSync('src/pages/Watch.tsx', 'utf8');

// Add state for docchi players
content = content.replace(
  "const [serverType, setServerType] = useState<'mal' | 'vidsrc'>('mal');",
  "const [serverType, setServerType] = useState<'mal' | 'vidsrc' | 'docchi'>('mal');\n  const [docchiPlayers, setDocchiPlayers] = useState<any[]>([]);\n  const [selectedDocchiPlayer, setSelectedDocchiPlayer] = useState<number>(0);\n  const [isDocchiLoading, setIsDocchiLoading] = useState(false);"
);

// We need to fetch docchi players when in hanime mode.
// We can do this in loadDetails or an effect.
const docchiEffect = `
  // Docchi fetch effect
  useEffect(() => {
    if (isHanimeMode() && anime) {
      setServerType('docchi');
      setIsDocchiLoading(true);
      const aTitle = anime.title.romaji || anime.title.english;
      let slug = aTitle ? aTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      
      // Some special cases for hanime slugs if needed, but the basic slug usually works on docchi.
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

content = content.replace(
  "if (sortDesc) {",
  docchiEffect + "\n  if (sortDesc) {"
);

// Iframe URL
const iframeLogic = `  let iframeUrl = '';
  if (serverType === 'docchi') {
    if (docchiPlayers.length > 0 && docchiPlayers[selectedDocchiPlayer]) {
      iframeUrl = docchiPlayers[selectedDocchiPlayer].url;
    }
  } else if (serverType === 'vidsrc' && imdbId) {`;

content = content.replace(
  `  let iframeUrl = '';
  if (serverType === 'vidsrc' && imdbId) {`,
  iframeLogic
);

// UI for Servers
const serverUiRegex = /\{\/\* Servers \*\/\}([\s\S]*?)\{\/\* Audio Type Selector \*\/\}/;
const oldServerUi = content.match(serverUiRegex)[0];

const newServerUi = `{/* Servers */}
              <div className="flex items-center bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
                {isHanimeMode() ? (
                  isDocchiLoading ? (
                    <div className="px-4 py-1.5 text-sm text-gray-400 font-bold">Loading players...</div>
                  ) : docchiPlayers.length > 0 ? (
                    <div className="flex overflow-x-auto custom-scrollbar no-scrollbar w-full sm:w-auto max-w-[300px] sm:max-w-md">
                      {docchiPlayers.map((player, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedDocchiPlayer(idx)}
                          className={cn(
                            "flex-none px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors whitespace-nowrap",
                            selectedDocchiPlayer === idx ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                          )}
                        >
                          {player.player.toUpperCase()} {player.translator && <span className="text-[10px] font-normal opacity-70 ml-1">({player.translator.substring(0,10)})</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                     <div className="px-4 py-1.5 text-sm text-red-400 font-bold">No players found</div>
                  )
                ) : (
                  <>
                    <button
                      onClick={() => setServerType('mal')}
                      disabled={!anime?.idMal}
                      className={cn(
                        "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                        serverType === 'mal' ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                      )}
                      title={!anime?.idMal ? "MAL ID not available for this anime" : undefined}
                    >
                      MAL
                    </button>
                    <button
                      onClick={() => setServerType('vidsrc')}
                      disabled={!imdbId}
                      className={cn(
                        "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                        serverType === 'vidsrc' ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                      )}
                      title={!imdbId ? "IMDb ID not available for this anime" : undefined}
                    >
                      VidSrc
                    </button>
                  </>
                )}
              </div>
              {/* Audio Type Selector */}`;

content = content.replace(oldServerUi, newServerUi);

fs.writeFileSync('src/pages/Watch.tsx', content);
console.log('done');
