const fs = require('fs');

let watchContent = fs.readFileSync('src/pages/Watch.tsx', 'utf8');
watchContent = watchContent.replace(
  '<iframe \n                src={iframeUrl || undefined}',
  '{iframeUrl ? (\n              <iframe \n                src={iframeUrl}'
).replace(
  'onError={handleIframeError}\n              ></iframe>',
  'onError={handleIframeError}\n              ></iframe>\n              ) : (\n                <div className="absolute inset-0 flex items-center justify-center text-gray-500">\n                  {isDocchiLoading ? "Loading video player..." : "No video source selected"}\n                </div>\n              )}'
);

fs.writeFileSync('src/pages/Watch.tsx', watchContent);
console.log('Fixed iframe rendering.');
