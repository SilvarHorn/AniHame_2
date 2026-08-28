import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAnilist, ANIME_DETAILS_QUERY } from '../api/anilist';
import { AnimeMedia } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Star, Calendar, Info, ExternalLink, ArrowDownUp, LayoutGrid, List as ListIcon, PlayCircle, MonitorPlay, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { MarqueeText } from '../components/MarqueeText';
import { AnimeInfo } from '../components/ui/AnimeInfo';
import { getAnimeListStatus, addOrUpdateToList, removeFromList, MyListStatus } from '../utils/myList';
import AnimeCard from '../components/ui/AnimeCard';

function RangeGridSelect({ value, onChange, options }: { value: string, onChange: (v: string)=>void, options: string[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between min-w-[140px] h-[38px] bg-gray-800 border border-white/5 hover:border-primary/50 transition-colors text-gray-400 hover:text-primary text-sm rounded-lg px-3 focus:outline-none focus:border-primary">
        <span className="font-medium">{value || 'All Episodes'}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
           <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{ duration: 0.15 }} className="absolute top-full right-0 mt-1 w-[240px] bg-[#151F2E] border border-primary/20 rounded-lg p-3 shadow-xl z-50">
             <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} className={`col-span-2 py-1.5 text-sm font-semibold rounded-md transition-colors ${value === '' ? 'bg-primary text-[#0B0C0F]' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>All Episodes</button>
                {options.map(o => (
                  <button type="button" key={o} onClick={() => { onChange(o); setIsOpen(false); }} className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${value === o ? 'bg-primary text-[#0B0C0F]' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>{o}</button>
                ))}
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const getRelatedAnime = (media: AnimeMedia) => {
  if (!media.relations || !media.relations.edges) return [];
  
  const uniqueAnime = new Map<number, { node: AnimeMedia, relationType: string }>();
  
  const traverse = (edges: any[], isDirect: boolean) => {
    edges.forEach(edge => {
      if (!edge || !edge.node) return;
      
      if (edge.node.type === 'ANIME' && edge.node.id !== media.id) {
        if (!uniqueAnime.has(edge.node.id)) {
           uniqueAnime.set(edge.node.id, {
             node: edge.node,
             relationType: isDirect ? edge.relationType : 'FRANCHISE'
           });
        } else if (isDirect) {
           uniqueAnime.set(edge.node.id, {
             node: edge.node,
             relationType: edge.relationType
           });
        }
      }
      
      if (edge.node.relations && edge.node.relations.edges) {
        traverse(edge.node.relations.edges, false);
      }
    });
  };
  
  traverse(media.relations.edges, true);
  
  return Array.from(uniqueAnime.values()).sort((a, b) => {
    if (a.relationType !== 'FRANCHISE' && b.relationType === 'FRANCHISE') return -1;
    if (a.relationType === 'FRANCHISE' && b.relationType !== 'FRANCHISE') return 1;
    return 0;
  });
};

export default function AnimeDetails() {
  const { id } = useParams();
  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [sortDesc, setSortDesc] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [listStatus, setListStatus] = useState<MyListStatus | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [kitsuEpisodes, setKitsuEpisodes] = useState<any[]>([]);
  const [episodeRange, setEpisodeRange] = useState('');
  const [fillerEpisodes, setFillerEpisodes] = useState<number[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);

  useEffect(() => {
    const loadDetails = async () => {
      setError('');
      try {
        const data = await fetchAnilist(ANIME_DETAILS_QUERY, { id: Number(id) });
        
        const watchedKey = `watched_eps_${id}`;
        setWatchedEpisodes(JSON.parse(localStorage.getItem(watchedKey) || '[]'));

        if (data?.Media) {
          if (data.Media.isAdult) {
            setError('Content restricted.');
            return;
          }
          setAnime(data.Media);
          setListStatus(getAnimeListStatus(Number(id)));
          
          let epCount = data.Media.episodes || 12;
          if (data.Media.nextAiringEpisode) {
            epCount = data.Media.nextAiringEpisode.episode - 1;
          }
          let priorityRange = undefined;
          if (epCount > 100) {
            setEpisodeRange('1 - 100');
            priorityRange = { start: 1, end: 100 };
          } else {
            setEpisodeRange('');
          }
          
          const aTitle = data.Media.title.english || data.Media.title.romaji;
          if (aTitle) {
            const formattedName = aTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            fetch(`/api/filler/${formattedName}`)
              .then(res => res.json())
              .then(d => {
                if (d.fillerEpisodes) setFillerEpisodes(d.fillerEpisodes);
              })
              .catch(console.error);
          }

          fetch(`/api/mapping/${id}`)
            .then(res => res.json())
            .then(async mapping => {
              let iId = null;
              if (mapping && mapping.imdb_id && mapping.imdb_id.length > 0) {
                // Sometimes it's an array, sometimes maybe a string, handle safely
                iId = Array.isArray(mapping.imdb_id) ? mapping.imdb_id[0] : mapping.imdb_id;
                setImdbId(iId);
              }
              
              if (data.Media.idMal) {
                try {
                  const { kitsuClient } = await import('../api/kitsu');
                  const kitsuId = await kitsuClient.getKitsuIdByMalId(data.Media.idMal);
                  if (kitsuId) {
                    const epData = await kitsuClient.getEpisodes(
                      kitsuId,
                      priorityRange,
                      (newEps) => {
                        setKitsuEpisodes([...newEps]);
                      }
                    );
                    if (epData && epData.length > 0) {
                      setKitsuEpisodes([...epData]);
                    }
                  }
                } catch (e) {
                  console.error('Failed to fetch Kitsu episodes', e);
                }
              }
            })
            .catch(err => console.error("Failed to fetch mapping", err));
        } else {

          setError('Anime not found.');
        }
      } catch (err) {
        console.error('Error fetching details:', err);
        setError('Failed to fetch anime details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      setLoading(true);
      setShowEpisodes(false);
      loadDetails();
    }
  }, [id]);

  useEffect(() => {
    if (!loading && anime) {
      const timer = setTimeout(() => {
        setShowEpisodes(true);
      }, 50); // 50ms delay to ensure it renders last
      return () => clearTimeout(timer);
    }
  }, [loading, anime]);

  const handleListStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') {
      removeFromList(Number(id));
      setListStatus(null);
    } else if (anime) {
      const status = val as MyListStatus;
      addOrUpdateToList(anime, status);
      setListStatus(status);
      window.dispatchEvent(new Event('my-list-updated'));
    }
  };

  const relatedAnimeList = React.useMemo(() => anime ? getRelatedAnime(anime) : [], [anime]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-500 font-medium">Error: {error}</div>
      </div>
    );
  }

  if (loading && !anime) {
    return (
      <div className="animate-pulse">
        <div className="w-full h-[40vh] min-h-[300px] bg-gray-800/40"></div>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10 flex flex-col md:flex-row gap-8">
          <div className="w-[200px] sm:w-[250px] md:w-[300px] flex-shrink-0 -mt-32 md:-mt-48 relative mx-auto md:mx-0">
            <div className="aspect-[2/3] w-full rounded-2xl bg-gray-800/60 shadow-xl border border-white/5" />
            <div className="mt-6 flex flex-col gap-3">
              <div className="h-12 bg-gray-800/60 rounded-xl" />
              <div className="h-12 bg-gray-800/60 rounded-xl" />
            </div>
          </div>
          <div className="flex-grow pt-8 md:pt-32">
            <div className="h-12 w-3/4 bg-gray-800/60 rounded-lg mb-6" />
            <div className="h-[200px] w-full bg-gray-800/60 rounded-xl mb-12" />
            <div className="h-8 w-32 bg-gray-800/60 rounded-lg mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({length: 12}).map((_, i) => (
                <div key={i} className="aspect-video bg-gray-800/60 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anime) return null;

  const title = anime.title.english || anime.title.romaji;
  
  // Create episode boxes
  let episodeCount = anime.episodes || 12; // Fallback
  if (anime.nextAiringEpisode) {
    episodeCount = anime.nextAiringEpisode.episode - 1;
  }
  
  const episodeTitleMap = new Map<number, string>();
  const episodeThumbMap = new Map<number, string>();
  
  // Use Kitsu for episode titles if available, otherwise fallback to anilist
  if (kitsuEpisodes && kitsuEpisodes.length > 0) {
    kitsuEpisodes.forEach((ep: any) => {
      if (ep.num) {
        if (ep.title) {
          episodeTitleMap.set(ep.num, ep.title);
        }
        if (ep.thumbnail) {
          episodeThumbMap.set(ep.num, ep.thumbnail);
        }
      }
    });
  }

  if (anime?.streamingEpisodes) {
    anime.streamingEpisodes.forEach(ep => {
      const match = ep.title.match(/Episode\s+(\d+)(?:\s*[-:]\s*(.*))?/i);
      if (match) {
        const epNum = parseInt(match[1]);
        if (match[2] && !episodeTitleMap.has(epNum)) {
          episodeTitleMap.set(epNum, match[2].trim());
        }
        if (ep.thumbnail) {
          episodeThumbMap.set(epNum, ep.thumbnail);
        }
      }
    });
  }

  const rangeOptions: string[] = [];
  if (episodeCount > 100) {
    for (let i = 0; i < episodeCount; i += 100) {
      const start = i + 1;
      const end = Math.min(i + 100, episodeCount);
      rangeOptions.push(`${start} - ${end}`);
    }
  }

  let episodes = Array.from({ length: Math.max(1, episodeCount) }, (_, i) => i + 1);

  if (episodeRange && episodeRange.includes(' - ')) {
    const [start, end] = episodeRange.split(' - ').map(Number);
    episodes = episodes.filter(ep => ep >= start && ep <= end);
  }

  if (sortDesc) {
    episodes = episodes.reverse();
  }

  return (
    <div>
      {/* Banner Area */}
      <div className="relative w-full h-[40vh] min-h-[300px] overflow-hidden">
        <img 
          src={anime.bannerImage || anime.coverImage.extraLarge} 
          alt={title}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0F] via-[#0B0C0F]/80 to-transparent" />
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Cover & Actions */}
          <div className="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 bg-gray-800 aspect-[3/4] mb-6">
              <img 
                src={anime.coverImage.extraLarge} 
                alt={title}
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </div>
            
            <Link 
              to={`/watch/${anime.id}/1`}
              className="w-full bg-primary hover:bg-primary-hover text-[#0B0C0F] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg mb-3"
            >
              <Play size={20} fill="currentColor" />
              Watch Episode 1
            </Link>
            
            <div className="relative mb-4">
              <select
                value={listStatus || ''}
                onChange={handleListStatusChange}
                className="w-full appearance-none bg-gray-800 border border-white/10 hover:border-primary/50 text-gray-200 font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-center cursor-pointer"
              >
                <option value="">+ Add to My List</option>
                <option value="WATCHING">Watching</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On-Hold</option>
                <option value="DROPPED">Dropped</option>
                <option value="PLAN_TO_WATCH">Plan to Watch</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center px-2 text-gray-400">
                ▼
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={`https://anilist.co/anime/${anime.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#02A9FF]/10 hover:bg-[#02A9FF]/20 text-[#02A9FF] border border-[#02A9FF]/30 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <ExternalLink size={16} />
                AniList
              </a>
              {anime.idMal && (
                <a
                  href={`https://myanimelist.net/anime/${anime.idMal}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#2E51A2]/10 hover:bg-[#2E51A2]/20 text-[#5383E8] border border-[#2E51A2]/30 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <ExternalLink size={16} />
                  MyAnimeList
                </a>
              )}
              {imdbId && (
                <a
                  href={`https://www.imdb.com/title/${imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#F5C518]/10 hover:bg-[#F5C518]/20 text-[#F5C518] border border-[#F5C518]/30 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <ExternalLink size={16} />
                  IMDb
                </a>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="flex-grow pt-8 md:pt-32">
            <h1 className="text-3xl md:text-5xl font-bold text-[#EDF1F5] mb-4">
              {title}
            </h1>
            <div className="mb-12">
              <AnimeInfo anime={anime} hideTitle={true} className="bg-transparent border-none p-0 sm:p-0" />
            </div>
            {/* Episodes Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-[#EDF1F5] flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
                  Episodes
                </h2>
                
                <div className="flex flex-wrap items-center gap-2">
                  {rangeOptions.length > 0 && (
                    <div className="w-[160px]">
                      <RangeGridSelect 
                        value={episodeRange} 
                        onChange={setEpisodeRange} 
                        options={rangeOptions} 
                      />
                    </div>
                  )}
                  <button 
                    onClick={() => setIsListView(!isListView)}
                    className="p-2 text-gray-400 hover:text-primary transition-colors bg-gray-800 rounded-lg border border-white/5 h-[38px] w-[38px] flex items-center justify-center"
                    title="Toggle View Mode"
                  >
                    {isListView ? <LayoutGrid size={18} /> : <ListIcon size={18} />}
                  </button>
                  <button 
                    onClick={() => setSortDesc(!sortDesc)}
                    className="p-2 text-gray-400 hover:text-primary transition-colors bg-gray-800 rounded-lg border border-white/5 h-[38px] w-[38px] flex items-center justify-center"
                    title="Sort Order"
                  >
                    <ArrowDownUp size={18} />
                  </button>
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                {showEpisodes ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "gap-3",
                      isListView 
                        ? "flex flex-col" 
                        : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    )}
                  >
                    {episodes.map(ep => {
                      const isFiller = fillerEpisodes.includes(ep);
                      const isWatched = watchedEpisodes.includes(ep);
                      return isListView ? (
                        <Link
                          key={ep}
                          to={`/watch/${anime.id}/${ep}`}
                          className={cn(
                            "flex items-center gap-4 hover:border-primary/50 border rounded-xl p-3 font-bold text-sm transition-all shadow-lg group relative overflow-hidden",
                            isFiller ? "bg-[#f97316]/10 hover:bg-[#f97316]/20 border-[#f97316]/30 text-[#f97316]" : "bg-gray-800 hover:bg-gray-700 border-white/5 text-gray-300",
                            isWatched && "opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                          )}
                        >
                          <div className="w-32 aspect-video flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-900">
                            <img 
                              src={episodeThumbMap.get(ep) || anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt={`Episode ${ep}`} 
                            />
                            {isFiller && <div className="absolute inset-0 bg-[#f97316]/20 pointer-events-none mix-blend-color" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xl font-black shrink-0", isFiller ? "text-[#f97316]" : "text-white")}>{ep}</span>
                                {isFiller && <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 font-bold tracking-wider shrink-0">FILLER</span>}
                              </div>
                              <MarqueeText 
                                text={episodeTitleMap.get(ep) || `Episode ${ep}`}
                                className={cn("text-xs sm:text-sm font-medium transition-colors", isFiller ? "text-[#f97316]/80 group-hover:text-[#f97316]" : "text-gray-400 group-hover:text-white")}
                                align="left"
                              />
                            </div>
                          </div>
                          <PlayCircle size={24} className={cn("mr-2 flex-shrink-0", isFiller ? "text-[#f97316]/50 group-hover:text-[#f97316]" : "text-gray-500 group-hover:text-primary")} />
                        </Link>
                      ) : (
                        <Link
                          key={ep}
                          to={`/watch/${anime.id}/${ep}`}
                          className={cn(
                            "relative aspect-video flex-col text-center hover:border-primary border rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:-translate-y-1 shadow-lg overflow-hidden group",
                            isFiller ? "bg-[#f97316]/20 border-[#f97316]/50" : "bg-gray-800 border-white/5",
                            isWatched && "opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                          )}
                        >
                          <div className="absolute inset-0 w-full h-full">
                            <img 
                              src={episodeThumbMap.get(ep) || anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large} 
                              alt={`Episode ${ep}`} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-30" 
                            />
                            <div className={cn("absolute inset-0 opacity-80", isFiller ? "bg-gradient-to-t from-[#f97316]/40 via-[#0B0C0F]/60 to-[#f97316]/10 mix-blend-color" : "bg-gradient-to-t from-[#0B0C0F] via-[#0B0C0F]/40 to-transparent")} />
                          </div>
                          
                          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
                            <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 group-hover:opacity-0 group-hover:scale-90">
                              <span className={cn("text-3xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]", isFiller ? "text-[#f97316]" : "text-white")}>
                                {ep}
                              </span>
                              {isFiller && <span className="text-[10px] font-bold text-[#f97316] bg-black/50 px-1.5 py-0.5 rounded mt-1">FILLER</span>}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-105 group-hover:scale-100">
                              <MarqueeText 
                                text={episodeTitleMap.get(ep) || `Episode ${ep}`}
                                className={cn("text-xs font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight", isFiller ? "text-[#f97316]" : "text-white")}
                              />
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </motion.div>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Related Anime Section */}
            {relatedAnimeList.length > 0 && (
              <div className="mt-16">
                <div className="flex items-center mb-6">
                  <h2 className="text-2xl font-bold text-[#EDF1F5] flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
                    Related Anime
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {relatedAnimeList.map(item => (
                    <div key={item.node.id} className="flex flex-col gap-2">
                      <AnimeCard anime={item.node} />
                      <span className="text-xs text-primary font-bold uppercase tracking-wider text-center">{item.relationType.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
