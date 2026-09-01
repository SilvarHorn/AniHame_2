const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');
content = content.replace("  const isNHentai = displayUsername === 'nhentai';\n  const isNHentai = displayUsername === 'nhentai';", "  const isNHentai = displayUsername === 'nhentai';");
content = content.replace("{!isNHentai && ({!isNHentai && (<div", "{!isNHentai && (<div");
content = content.replace("{!isNHentai && {!isNHentai && <div", "{!isNHentai && (<div");
content = content.replace("</button>\n          </div>}}", "</button>\n          </div>)}");

fs.writeFileSync('src/components/layout/Navbar.tsx', content);
