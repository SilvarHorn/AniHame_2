const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');

content = content.replace(/{!isNHentai && \(\<div className="hidden md:flex gap-2 text-sm font-medium text-gray-400 items-center">[\s\S]*?<\/div>\n          <\/div>}}/m, `{!isNHentai && (
              <div className="hidden md:flex gap-2 text-sm font-medium text-gray-400 items-center">
                <Link to="/" className={getNavClass('/')}>Home</Link>
                <Link to="/explore" className={getNavClass('/explore')}>Explore</Link>
                <Link to="/trending" className={getNavClass('/trending')}>Trending</Link>
                <Link to="/profile" className={getNavClass('/profile')}>My List</Link>
                <Link to="/schedule" className={getNavClass('/schedule')}>Schedule</Link>
              </div>
            )}
          </div>
          
          {!isNHentai && (
            <div className="hidden md:flex flex-1 max-w-sm mx-8 justify-end">
              <div className="w-full relative">
                <form onSubmit={handleSearch} className="w-full relative flex items-center justify-end">
                  <input
                    type="text"
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowPreview(true)}
                    onBlur={() => setTimeout(() => setShowPreview(false), 200)}
                    className="bg-[#0B0C0F] border border-gray-700 rounded-full px-4 py-1.5 text-xs w-64 focus:border-primary outline-none text-[#EDF1F5] placeholder-gray-500"
                  />
                  <Search className="absolute right-3 top-1.5 text-gray-400 pointer-events-none" size={14} />
                </form>
                              
                {showPreview && previewResults.length > 0 && (
                   <div className="absolute top-full mt-2 right-0 w-64 bg-[#151F2E] border border-primary/10 rounded-lg shadow-xl overflow-hidden z-50">
                     {previewResults.map(anime => (
                       <Link key={anime.id} to={\`/anime/\${anime.id}\`} className="flex items-center gap-3 p-2 hover:bg-white/5 border-b border-gray-800 last:border-0 transition-colors">
                         <img src={anime.coverImage.large} className="w-8 h-10 object-cover rounded" />
                         <div className="flex-1 min-w-0">
                           <div className="text-xs font-bold text-[#EDF1F5] truncate">{anime.title.english || anime.title.romaji}</div>
                           <div className="text-[10px] text-gray-500 truncate">{anime.genres?.[0]}</div>
                         </div>
                       </Link>
                     ))}
                   </div>
                )}
              </div>
            </div>
          )}`);

fs.writeFileSync('src/components/layout/Navbar.tsx', content);
