const fs = require('fs');

let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

// Replace handleSortChange with handleSortChangeValue
content = content.replace(
  /const handleSortChange = \(e: React\.ChangeEvent<HTMLSelectElement>\) => \{[\s\S]*?\};\n/,
  `const handleSortChangeValue = (newSort: string) => {
    setCurrentSort(newSort);
    handleSearch(undefined, newSort);
  };\n`
);

// Replace form area with new form and sort component
const oldFormStart = `<form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-3 max-w-3xl">`;
const oldFormEnd = `</form>
      </div>`;
const oldFormRegex = new RegExp('<form onSubmit=\\{\\(e\\) => handleSearch\\(e\\)\\} className="flex flex-col sm:flex-row gap-3 max-w-3xl">[\\s\\S]*?<\\/form>\\s*<\\/div>');

const newFormArea = `<form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search translated galleries..."
              className="w-full bg-[#151F2E] border border-gray-700 text-[#EDF1F5] rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-gray-500"
            />
          </div>
          <button type="submit" className="bg-primary hover:bg-primary/90 text-[#0B0C0F] px-8 py-3 rounded-xl font-bold transition-colors">
            Search
          </button>
        </form>

        {searchQuery && (
          <div className="flex items-center gap-3 mt-6">
            <button 
              onClick={() => handleSortChangeValue('')}
              className={\`px-5 py-2.5 rounded-xl font-bold text-[15px] transition-colors \${!currentSort ? 'bg-[#252525] text-white' : 'bg-[#151F2E] text-gray-400 hover:text-white'}\`}
            >
              Recent
            </button>
            <div className="flex items-center bg-[#151F2E] rounded-xl px-5 py-2.5 gap-4 text-[15px] font-semibold text-gray-400">
              <span>Popular:</span>
              <button 
                onClick={() => handleSortChangeValue('popular-today')}
                className={\`hover:text-white transition-colors \${currentSort === 'popular-today' ? 'text-white' : ''}\`}
              >
                today
              </button>
              <button 
                onClick={() => handleSortChangeValue('popular-week')}
                className={\`hover:text-white transition-colors \${currentSort === 'popular-week' ? 'text-white' : ''}\`}
              >
                week
              </button>
              <button 
                onClick={() => handleSortChangeValue('popular')}
                className={\`hover:text-white transition-colors \${currentSort === 'popular' ? 'text-white' : ''}\`}
              >
                all time
              </button>
            </div>
          </div>
        )}
      </div>`;

content = content.replace(oldFormRegex, newFormArea);

fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('done');
