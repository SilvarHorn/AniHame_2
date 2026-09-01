const fs = require('fs');
const content = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');

let newContent = content.replace(
  /<nav className="fixed top-0 w-full z-50 bg-\[#151F2E\] border-b border-primary\/10 h-14 shrink-0 flex flex-col justify-center">([\s\S]*?)<\/nav>/,
  (match) => {
    // We inject isNHentai variable at the top of the function
    return match
      .replace('<div className="hidden md:flex gap-2 text-sm font-medium text-gray-400 items-center">', '{!isNHentai && (<div className="hidden md:flex gap-2 text-sm font-medium text-gray-400 items-center">')
      .replace('</Link>\n            </div>\n          </div>\n          <div className="hidden md:flex flex-1 max-w-sm mx-8 justify-end">', '</Link>\n            </div>\n          )}\n          </div>\n          {!isNHentai && <div className="hidden md:flex flex-1 max-w-sm mx-8 justify-end">')
      .replace('</form>\n                            \n              {showPreview', '</form>\n                            \n              {showPreview')
      .replace('</Link>\n                   ))}\n                 </div>\n              )}\n            </div>\n          </div>', '</Link>\n                   ))}\n                 </div>\n              )}\n            </div>\n          </div>}')
      .replace('<div className="md:hidden flex items-center">', '{!isNHentai && <div className="md:hidden flex items-center">')
      .replace('<Menu size={24} />}\n            </button>\n          </div>', '<Menu size={24} />}\n            </button>\n          </div>}')
      .replace('{isMobileMenuOpen && (', '{!isNHentai && isMobileMenuOpen && (');
  }
);

newContent = newContent.replace('const location = useLocation();', 'const location = useLocation();\n  const isNHentai = displayUsername === \'nhentai\';');

fs.writeFileSync('src/components/layout/Navbar.tsx', newContent);
console.log('done');
