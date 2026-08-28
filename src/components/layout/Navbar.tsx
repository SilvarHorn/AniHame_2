import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Tv, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAnilist, SEARCH_ANIME_QUERY } from '../../api/anilist';
import { AnimeMedia } from '../../types';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [previewResults, setPreviewResults] = useState<AnimeMedia[]>([]);
const [showPreview, setShowPreview] = useState(false);
  const { profile } = useAuth();
  const [localAvatar, setLocalAvatar] = useState('');
  const [localUsername, setLocalUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadLocalProfile = () => {
      try {
        const saved = localStorage.getItem('anime_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.avatar) setLocalAvatar(parsed.avatar);
          if (parsed.username) setLocalUsername(parsed.username);
        }
      } catch (e) {}
    };
    loadLocalProfile();
    window.addEventListener('profile-updated', loadLocalProfile);
    window.addEventListener('storage', loadLocalProfile);
    return () => {
      window.removeEventListener('profile-updated', loadLocalProfile);
      window.removeEventListener('storage', loadLocalProfile);
    };
  }, []);

  const displayAvatar = profile?.photoURL || localAvatar;
  const displayUsername = profile?.username || localUsername || 'Profile';
  const location = useLocation();

  const getNavClass = (path: string) => {
    const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
    return `px-3 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:text-primary'}`;
  };

  const getMobileNavClass = (path: string) => {
    const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
    return `px-3 py-2 rounded-lg text-sm tracking-wide transition-colors ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-[#EDF1F5] font-bold hover:text-primary hover:bg-white/5'}`;
  };


  useEffect(() => {
    const fetchPreview = async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setPreviewResults([]);
        return;
      }
      try {
        const data = await fetchAnilist(SEARCH_ANIME_QUERY, { search: searchQuery, perPage: 5 });
        setPreviewResults(data?.Page?.media || []);
      } catch (e) {
        console.error(e);
      }
    };
    const timeoutId = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#151F2E] border-b border-primary/10 h-14 shrink-0 flex flex-col justify-center">
      <div className="w-full px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-3xl tracking-wide text-primary" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Ani<span className="text-white">Hame</span>
            </Link>
            <div className="hidden md:flex gap-2 text-sm font-medium text-gray-400 items-center">
              <Link to="/" className={getNavClass('/')}>Home</Link>
              <Link to="/explore" className={getNavClass('/explore')}>Explore</Link>
              <Link to="/trending" className={getNavClass('/trending')}>Trending</Link>
              <Link to="/profile" className={getNavClass('/profile')}>My List</Link>
              <Link to="/schedule" className={getNavClass('/schedule')}>Schedule</Link>
            </div>
          </div>

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
                     <Link key={anime.id} to={`/anime/${anime.id}`} className="flex items-center gap-3 p-2 hover:bg-white/5 border-b border-gray-800 last:border-0 transition-colors">
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

          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/profile"
              className="flex items-center gap-3 ml-2 group"
            >
              {displayAvatar ? (
                <img src={displayAvatar} alt="Profile" className="w-8 h-8 rounded-full object-cover border-2 border-gray-800 group-hover:border-primary transition-colors" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-[10px] font-bold text-[#0B0C0F]">ME</div>
              )}
              <span className="text-xs font-semibold text-[#EDF1F5] group-hover:text-primary transition-colors truncate max-w-[100px]">{displayUsername}</span>
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400 hover:text-white">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 w-full bg-[#151F2E] border-b border-primary/10 px-4 pt-4 pb-4 shadow-xl z-50">
          <div className="flex flex-col gap-2 mb-4">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={getMobileNavClass('/')}>Home</Link>
            <Link to="/explore" onClick={() => setIsMobileMenuOpen(false)} className={getMobileNavClass('/explore')}>Explore</Link>
            <Link to="/trending" onClick={() => setIsMobileMenuOpen(false)} className={getMobileNavClass('/trending')}>Trending</Link>
            <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className={getMobileNavClass('/profile')}>My List</Link>
            <Link to="/schedule" onClick={() => setIsMobileMenuOpen(false)} className={getMobileNavClass('/schedule')}>Schedule</Link>
          </div>
          <div className="relative mb-2">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowPreview(true)}
                onBlur={() => setTimeout(() => setShowPreview(false), 200)}
                className="w-full bg-[#0B0C0F] text-[#EDF1F5] rounded-full py-2 px-4 focus:outline-none focus:border-primary border border-gray-700 text-sm"
              />
              <Search className="absolute right-4 top-2.5 text-gray-400" size={16} />
            </form>
            {showPreview && previewResults.length > 0 && (
               <div className="absolute top-full mt-2 left-0 w-full bg-[#151F2E] border border-primary/10 rounded-lg shadow-xl overflow-hidden z-50">
                 {previewResults.map(anime => (
                   <Link key={anime.id} to={`/anime/${anime.id}`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-2 hover:bg-white/5 border-b border-gray-800 last:border-0 transition-colors">
                     <img src={anime.coverImage.large} className="w-10 h-14 object-cover rounded" />
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-bold text-[#EDF1F5] truncate">{anime.title.english || anime.title.romaji}</div>
                       <div className="text-xs text-gray-500 truncate">{anime.genres?.join(', ')}</div>
                     </div>
                   </Link>
                 ))}
               </div>
            )}
          </div>
          <Link 
            to="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors border border-gray-700"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <User size={16} />
            )}
            <span className="truncate max-w-[150px]">{displayUsername}</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
