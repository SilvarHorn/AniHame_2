const fs = require('fs');
let code = fs.readFileSync('src/pages/Watch.tsx', 'utf8');

// Replace serverType state
code = code.replace(
  "const [serverType, setServerType] = useState<'mal' | 'vidsrc'>('mal');",
  "const [serverType, setServerType] = useState<'mal' | 'vidsrc' | 'zhentube'>('mal');"
);

// Add zhentube states
code = code.replace(
  "const [malTitle, setMalTitle] = useState<string | null>(null);",
  "const [malTitle, setMalTitle] = useState<string | null>(null);\n  const [zhenTubeUrl, setZhenTubeUrl] = useState<string | null>(null);\n  const [isZhenTubeLoading, setIsZhenTubeLoading] = useState(false);"
);

// Add useEffects
code = code.replace(
  "  }, [anime]);",
  "  }, [anime]);\n\n  useEffect(() => {\n    if (isHanimeMode()) {\n      setServerType('zhentube');\n    }\n  }, [animeId]);\n\n  useEffect(() => {\n    if (serverType === 'zhentube' && anime) {\n      setIsZhenTubeLoading(true);\n      setZhenTubeUrl(null);\n      const romajiTitle = anime.title.romaji || anime.title.english || '';\n      fetch(`/api/zhentube?title=${encodeURIComponent(romajiTitle)}&episode=${currentEp}`)\n        .then(res => res.json())\n        .then(data => {\n          if (data.src) {\n            setZhenTubeUrl(data.src);\n          }\n        })\n        .catch(err => console.error('ZhenTube error:', err))\n        .finally(() => setIsZhenTubeLoading(false));\n    }\n  }, [serverType, anime, currentEp]);"
);

// Update iframe logic
code = code.replace(
  "  let iframeUrl = '';\n  if (serverType === 'vidsrc' && imdbId) {\n    if (anime?.format === 'MOVIE') {\n      iframeUrl = `https://vidsrc2.ru/embed/movie/${imdbId}`;\n    } else {\n      iframeUrl = `https://vidsrc2.ru/embed/tv/${imdbId}/1/${currentEp}`;\n    }\n  } else {\n    // Default to MAL\n    iframeUrl = `https://megaplay.buzz/stream/mal/${anime?.idMal || animeId}/${currentEp}/${audioType}`;\n  }",
  "  let iframeUrl = '';\n  if (serverType === 'vidsrc' && imdbId) {\n    if (anime?.format === 'MOVIE') {\n      iframeUrl = `https://vidsrc2.ru/embed/movie/${imdbId}`;\n    } else {\n      iframeUrl = `https://vidsrc2.ru/embed/tv/${imdbId}/1/${currentEp}`;\n    }\n  } else if (serverType === 'zhentube') {\n    iframeUrl = zhenTubeUrl || '';\n  } else {\n    // Default to MAL\n    iframeUrl = `https://megaplay.buzz/stream/mal/${anime?.idMal || animeId}/${currentEp}/${audioType}`;\n  }"
);

// Update handleIframeError
code = code.replace(
  "  const handleIframeError = () => {\n    if (serverType === 'mal') {\n      if (imdbId) setServerType('vidsrc');\n    } else if (serverType === 'vidsrc') {\n      if (anime?.idMal) setServerType('mal');\n    }\n  };",
  "  const handleIframeError = () => {\n    if (serverType === 'mal') {\n      if (imdbId) setServerType('vidsrc');\n    } else if (serverType === 'vidsrc') {\n      if (anime?.idMal) setServerType('mal');\n    }\n  };"
);

// Update rendering of iframe / loading state
code = code.replace(
  `              <iframe
                src={iframeUrl}
                className="absolute top-0 left-0 w-full h-full border-0"
                allowFullScreen
                onError={handleIframeError}
              ></iframe>`,
  `              {serverType === 'zhentube' && isZhenTubeLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  Loading video player...
                </div>
              ) : iframeUrl ? (
                <iframe
                  src={iframeUrl}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allowFullScreen
                  onError={handleIframeError}
                ></iframe>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  No video source selected
                </div>
              )}`
);

// Update rendering of Hanime server buttons
const serverButtonsOriginal = `
              {!isHanimeMode() && (
                <div className="flex items-center bg-gray-800 rounded-lg p-1 w-full sm:w-auto justify-center">
`;

const serverButtonsReplacement = `
              {isHanimeMode() ? (
                <div className="flex items-center bg-gray-800 rounded-lg p-1 w-full sm:w-auto justify-center">
                  <button
                    onClick={() => setServerType('zhentube')}
                    className={cn(
                      "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors",
                      serverType === 'zhentube' ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    ZhenTube
                  </button>
                </div>
              ) : (
                <div className="flex items-center bg-gray-800 rounded-lg p-1 w-full sm:w-auto justify-center">
`;

code = code.replace(serverButtonsOriginal, serverButtonsReplacement);

fs.writeFileSync('src/pages/Watch.tsx', code);
