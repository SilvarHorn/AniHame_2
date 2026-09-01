const fs = require('fs');
let content = fs.readFileSync('src/nhentai/NHentaiApp.tsx', 'utf8');

// Add useSearchParams import
content = content.replace(
  "import { Routes, Route, Link, useNavigate } from 'react-router-dom';",
  "import { Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';"
);

// Update NHentaiHome
content = content.replace(
  "function NHentaiHome() {\n  const [galleries, setGalleries] = useState<any[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [page, setPage] = useState(1);\n  const [query, setQuery] = useState('');\n  const [searchQuery, setSearchQuery] = useState('');",
  `function NHentaiHome() {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);`
);

content = content.replace(
  "  const handleSearch = (e: React.FormEvent) => {\n    e.preventDefault();\n    setSearchQuery(query);\n    setPage(1);\n  };",
  `  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (/^\\d+$/.test(trimmed)) {
      navigate('/gallery/' + trimmed);
      return;
    }
    setSearchParams(trimmed ? { q: trimmed } : {});
    setPage(1);
  };`
);

fs.writeFileSync('src/nhentai/NHentaiApp.tsx', content);
console.log('updated NHentaiApp');
