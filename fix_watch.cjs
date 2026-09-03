const fs = require('fs');
let code = fs.readFileSync('src/pages/Watch.tsx', 'utf8');

// Replace useEffect for zhentube
const oldUseEffect = `  useEffect(() => {
    if (serverType === 'zhentube' && anime) {
      setIsZhenTubeLoading(true);
      setZhenTubeUrl(null);
      const romajiTitle = anime.title.romaji || anime.title.english || '';
      fetch(\`/api/zhentube?title=\${encodeURIComponent(romajiTitle)}&episode=\${currentEp}\`)
        .then(res => res.json())
        .then(data => {
          if (data.src) {
            setZhenTubeUrl(data.src);
          }
        })
        .catch(err => console.error('ZhenTube error:', err))
        .finally(() => setIsZhenTubeLoading(false));
    }
  }, [serverType, anime, currentEp]);`;

const newUseEffect = `  const [zhenTubeError, setZhenTubeError] = useState<string | null>(null);

  useEffect(() => {
    if (serverType === 'zhentube' && anime) {
      setIsZhenTubeLoading(true);
      setZhenTubeUrl(null);
      setZhenTubeError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      const romajiTitle = anime.title.romaji || anime.title.english || '';
      fetch(\`/api/zhentube?title=\${encodeURIComponent(romajiTitle)}&episode=\${currentEp}\`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (data.src) {
            setZhenTubeUrl(data.src);
          } else {
             setZhenTubeError('No server found');
          }
        })
        .catch(err => {
           if (err.name === 'AbortError') {
             setZhenTubeError('No server found (timeout)');
           } else {
             setZhenTubeError('No server found');
             console.error('ZhenTube error:', err);
           }
        })
        .finally(() => {
          clearTimeout(timeoutId);
          setIsZhenTubeLoading(false);
        });
        
      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    }
  }, [serverType, anime, currentEp]);`;

code = code.replace(oldUseEffect, newUseEffect);

const oldIframeRender = `              {iframeUrl ? (
              <iframe 
                src={iframeUrl}
                allowFullScreen
                className="absolute inset-0 w-full h-full border-none"
                title={\`Watch \${anime.title.romaji} Episode \${currentEp}\`}
                onError={handleIframeError}
              ></iframe>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  No video source selected
                </div>
              )}`;

const newIframeRender = `              {serverType === 'zhentube' && isZhenTubeLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  <span className="text-sm">Loading video source...</span>
                </div>
              ) : serverType === 'zhentube' && zhenTubeError ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-black/50">
                  {zhenTubeError}
                </div>
              ) : iframeUrl ? (
                <iframe 
                  src={iframeUrl}
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-none bg-black"
                  title={\`Watch \${anime.title.romaji} Episode \${currentEp}\`}
                  onError={handleIframeError}
                ></iframe>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-black/50">
                  {serverType === 'zhentube' ? 'No server found' : 'No video source selected'}
                </div>
              )}`;

code = code.replace(oldIframeRender, newIframeRender);

fs.writeFileSync('src/pages/Watch.tsx', code);
