const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiGallery.tsx', 'utf8');

const oldToolbar = `                  <select 
                    value={slideshowDelay} 
                    onChange={(e) => setSlideshowDelay(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-gray-300 outline-none cursor-pointer appearance-none pl-2 pr-1"
                    title="Slideshow Speed"
                  >
                    <option value={1000} className="bg-gray-900">1s</option>
                    <option value={2000} className="bg-gray-900">2s</option>
                    <option value={3000} className="bg-gray-900">3s</option>
                    <option value={5000} className="bg-gray-900">5s</option>
                    <option value={10000} className="bg-gray-900">10s</option>
                  </select>`;

const newToolbar = `                  <div className="flex items-center" title="Slideshow Speed">
                    <input 
                      type="number" 
                      min="1"
                      max="60"
                      value={slideshowDelay / 1000}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0) setSlideshowDelay(val * 1000);
                      }}
                      className="bg-transparent text-xs font-bold text-gray-300 outline-none w-8 text-right pr-1 custom-number-input"
                    />
                    <span className="text-xs font-bold text-gray-400 select-none">s</span>
                  </div>`;

content = content.replace(oldToolbar, newToolbar);
fs.writeFileSync('src/nhentai/NHentaiGallery.tsx', content);

// Let's add css for custom-number-input to hide arrows if needed, but it's fine.
