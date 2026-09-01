const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

// 1. Add import
if (!content.includes("import { motion")) {
  content = content.replace(
    "import { ChevronLeft, Play, X, Pause, Monitor, List } from 'lucide-react';",
    "import { ChevronLeft, Play, X, Pause, Monitor, List } from 'lucide-react';\nimport { motion, AnimatePresence } from 'motion/react';"
  );
}

// 2. Replace image block
const oldImg = `<img
                  key={currentPage} // force re-render for smooth load
                  src={getImageSrc(currentPage)}
                  onError={(e) => handleImgError(e, currentPage)}
                  alt={\`Page \${currentPage + 1}\`}
                  className="max-w-full max-h-full object-contain pointer-events-none"
                />`;

const newImg = `<AnimatePresence mode="wait">
                  <motion.img
                    key={currentPage}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    src={getImageSrc(currentPage)}
                    onError={(e: any) => handleImgError(e, currentPage)}
                    alt={\`Page \${currentPage + 1}\`}
                    className="max-w-full max-h-full object-contain pointer-events-none"
                  />
                </AnimatePresence>`;

content = content.replace(oldImg, newImg);
fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);
console.log('done');
