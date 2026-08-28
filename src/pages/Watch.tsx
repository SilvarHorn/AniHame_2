import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from 'react-router-dom';
import { fetchAnilist, ANIME_DETAILS_QUERY } from '../api/anilist';
import { AnimeMedia } from '../types';
import { saveProgress } from '../store/progress';
import { ChevronLeft, ChevronDown, ArrowDownUp, LayoutGrid, List as ListIcon, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { MarqueeText } from '../components/MarqueeText';
import { AnimeInfo } from '../components/ui/AnimeInfo';

export default function Watch() {
  const { profile } = useAuth();
  const { id, ep } = useParams();
  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortDesc, setSortDesc] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [episodeChunk, setEpisodeChunk] = useState(0);
  const [audioType, setAudioType] = useState<'sub' | 'dub'>('sub');
  const [serverType, setServerType] = useState<'mal' | 'vidsrc'>('mal');
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [kitsuEpisodes, setKitsuEpisodes] = useState<any[]>([]);
  const [fillerEpisodes, setFillerEpisodes] = useState<number[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.preferences) {
      setServerType(profile.preferences.defaultServer);
      setAudioType(profile.preferences.defaultAudio);
    }
  }, [profile]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const animeId = Number(id);
  const currentEp = Number(ep);

  useEffect(() => {
    if (currentEp) {
      setEpisodeChunk(Math.floor((currentEp - 1) / 25));
      const watchedKey = `watched_eps_${animeId}`;
      const watchedSet = new Set<number>(JSON.parse(localStorage.getItem(watchedKey) || '[]'));
      watchedSet.add(currentEp);
      const arr = Array.from(watchedSet);
      localStorage.setItem(watchedKey, JSON.stringify(arr));
      setWatchedEpisodes(arr);
    }
  }, [currentEp, animeId]);

  useEffect(() => {
    const loadDetails = async () => {
      setError('');
      try {
        const data = await fetchAnilist(ANIME_DETAILS_QUERY, { id: animeId });
        if (data?.Media) {
          if (data.Media.isAdult) {
            setError('Content restricted.');
            return;
          }
          setAnime(data.Media);

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

          // Fetch mapping
          fetch(`/api/mapping/${animeId}`)
            .then(res => res.json())
            .then(async mapping => {
              let iId = null;
              if (mapping && mapping.imdb_id && mapping.imdb_id.length > 0) {
                iId = Array.isArray(mapping.imdb_id) ? mapping.imdb_id[0] : mapping.imdb_id;
                setImdbId(iId);
              }
              
              if (data.Media.idMal) {
                try {
                  const { kitsuClient } = await import('../api/kitsu');
                  const kitsuId = await kitsuClient.getKitsuIdByMalId(data.Media.idMal);
                  if (kitsuId) {
                    const currentEpNum = isNaN(currentEp) ? 1 : currentEp;
                    const pStart = Math.max(1, Math.floor((currentEpNum - 1) / 100) * 100 + 1);
                    const pEnd = pStart + 99;
                    const epData = await kitsuClient.getEpisodes(
                      kitsuId,
                      { start: pStart, end: pEnd },
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
          
          // Save to progress
          saveProgress({
            animeId: data.Media.id,
            animeTitle: data.Media.title.english || data.Media.title.romaji,
            coverImage: data.Media.coverImage.extraLarge,
            lastEpisodeWatched: currentEp,
            timestamp: Date.now()
          });
        } else {
          setError('Anime not found.');
        }
      } catch (err) {
        console.error('Error fetching details:', err);
        setError('Failed to load video details.');
      } finally {
        setLoading(false);
      }
    };

    if (animeId) loadDetails();
  }, [animeId, currentEp]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-500 font-medium">Error: {error}</div>
      </div>
    );
  }

  if (loading && !anime) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="aspect-video w-full bg-gray-800/60 rounded-xl mb-6 border border-white/5" />
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-24 bg-gray-800/60 rounded-md" />
          <div className="h-10 w-24 bg-gray-800/60 rounded-md" />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-3/4">
            <div className="h-12 w-3/4 bg-gray-800/60 rounded-lg mb-6" />
            <div className="h-32 w-full bg-gray-800/60 rounded-lg" />
          </div>
          <div className="w-full lg:w-1/4">
            <div className="h-8 w-1/2 bg-gray-800/60 rounded-lg mb-4" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({length: 25}).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-800/60 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anime) return null;

  // Same logic to get available episodes
  let episodeCount = anime.episodes || 12;
  if (anime.nextAiringEpisode) {
    episodeCount = anime.nextAiringEpisode.episode - 1;
  }

  const chunkSize = 25;
  const totalChunks = Math.ceil(episodeCount / chunkSize);
  const chunks = Array.from({ length: totalChunks }, (_, i) => {
    const start = i * chunkSize + 1;
    const end = Math.min((i + 1) * chunkSize, episodeCount);
    return { index: i, label: `${start}-${end}` };
  });

  let episodes = Array.from({ length: Math.max(1, episodeCount) }, (_, i) => i + 1);
  
  // Filter by chunk *before* sorting so the chunks are stable
  episodes = episodes.filter(ep => ep > episodeChunk * chunkSize && ep <= (episodeChunk + 1) * chunkSize);

  if (sortDesc) {
    episodes = episodes.reverse();
  }

  let iframeUrl = '';
  if (serverType === 'vidsrc' && imdbId) {
    if (anime?.format === 'MOVIE') {
      iframeUrl = `https://vidsrc2.ru/embed/movie/${imdbId}`;
    } else {
      iframeUrl = `https://vidsrc2.ru/embed/tv/${imdbId}/1/${currentEp}`;
    }
  } else {
    // Default to MAL
    iframeUrl = `https://megaplay.buzz/stream/mal/${anime?.idMal || animeId}/${currentEp}/${audioType}`;
  }

  const handleIframeError = () => {
    if (serverType === 'mal') {
      if (imdbId) setServerType('vidsrc');
    } else if (serverType === 'vidsrc') {
      if (anime?.idMal) setServerType('mal');
    }
  };

  const episodeTitleMap = new Map<number, string>();
  const episodeThumbMap = new Map<number, string>();
  
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
    anime.streamingEpisodes.forEach(episode => {
      const match = episode.title.match(/Episode\s+(\d+)(?:[\s\-:]+(.*))?/i);
      if (match) {
        const epNum = parseInt(match[1]);
        const aniListTitle = match[2]?.trim();
        const existingTitle = episodeTitleMap.get(epNum);
        
        // If Kitsu didn't provide a title, or if Kitsu's title is just "Episode X"
        const kitsuMissingOrGeneric = !existingTitle || existingTitle.match(/^Episode\s+\d+$/i) || existingTitle === `Episode ${epNum}`;
        
        if (aniListTitle && !aniListTitle.match(/^Episode\s+\d+$/i) && kitsuMissingOrGeneric) {
          episodeTitleMap.set(epNum, aniListTitle);
        } else if (!existingTitle && episode.title && !episode.title.match(/^Episode\s+\d+$/i) && kitsuMissingOrGeneric) {
          episodeTitleMap.set(epNum, episode.title);
        }

        if (episode.thumbnail && !episodeThumbMap.has(epNum)) {
          episodeThumbMap.set(epNum, episode.thumbnail);
        }
      }
    });
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-3.5rem)] pb-12">
      <div className="flex items-center gap-4 mb-4 md:mb-6 shrink-0">
        <Link 
          to={`/anime/${anime.id}`}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-colors border border-white/5"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-[#EDF1F5] line-clamp-1">
          {anime.title.english || anime.title.romaji}
          <span className="text-primary ml-2 font-medium">Episode {currentEp}</span>
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-12">
        {/* Left Side: Video Player */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="w-full bg-black rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 flex flex-col aspect-video shrink-0">
            <div className="w-full h-full relative">
              <iframe 
                src={iframeUrl}
                allowFullScreen
                className="absolute inset-0 w-full h-full border-none"
                title={`Watch ${anime.title.romaji} Episode ${currentEp}`}
                onError={handleIframeError}
              ></iframe>
            </div>
          </div>
            
          {/* Episode Controls */}
          <div className="flex flex-col lg:flex-row items-center justify-between bg-[#151F2E] p-4 rounded-xl border border-primary/10 shrink-0 gap-4">
            {/* Mobile Nav: Prev / Next */}
            <div className="flex lg:hidden items-center justify-between w-full">
              {currentEp > 1 ? (
                <Link
                  to={`/watch/${animeId}/${currentEp - 1}`}
                  className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-[#0B0C0F] text-gray-300 rounded-lg transition-colors font-bold text-sm"
                >
                  Prev
                </Link>
              ) : (
                <div className="px-4 py-2 bg-gray-800/50 text-gray-500 rounded-lg font-bold text-sm cursor-not-allowed">
                  Prev
                </div>
              )}
              {currentEp < Math.max(1, episodeCount) ? (
                <Link
                  to={`/watch/${animeId}/${currentEp + 1}`}
                  className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-[#0B0C0F] text-gray-300 rounded-lg transition-colors font-bold text-sm"
                >
                  Next
                </Link>
              ) : (
                <div className="px-4 py-2 bg-gray-800/50 text-gray-500 rounded-lg font-bold text-sm cursor-not-allowed">
                  Next
                </div>
              )}
            </div>

            {/* Desktop Nav: Prev */}
            <div className="hidden lg:block">
              {currentEp > 1 ? (
                <Link
                  to={`/watch/${animeId}/${currentEp - 1}`}
                  className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-[#0B0C0F] text-gray-300 rounded-lg transition-colors font-bold text-sm"
                >
                  Previous Episode
                </Link>
              ) : (
                <div className="px-4 py-2 bg-gray-800/50 text-gray-500 rounded-lg font-bold text-sm cursor-not-allowed">
                  Previous Episode
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 flex-wrap justify-center w-full lg:w-auto">
              {/* Server Selector */}
              <div className="flex items-center bg-gray-800 rounded-lg p-1 w-full sm:w-auto justify-center">
                <button
                  onClick={() => setServerType('mal')}
                  disabled={!anime?.idMal}
                  className={cn(
                    "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    serverType === 'mal' ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                  )}
                  title={!anime?.idMal ? "MAL ID not available for this anime" : undefined}
                >
                  MAL
                </button>
                <button
                  onClick={() => setServerType('vidsrc')}
                  disabled={!imdbId}
                  className={cn(
                    "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    serverType === 'vidsrc' ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                  )}
                  title={!imdbId ? "IMDb ID not available for this anime" : undefined}
                >
                  VidSrc
                </button>
              </div>
              {/* Audio Type Selector */}
              {serverType !== 'vidsrc' && (
                <div className="flex items-center bg-gray-800 rounded-lg p-1 w-full sm:w-auto justify-center mt-2 sm:mt-0">
                  <button
                    onClick={() => setAudioType('sub')}
                    className={cn(
                      "flex-1 sm:flex-none px-6 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors",
                      audioType === 'sub' ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    Sub
                  </button>
                  <button
                    onClick={() => setAudioType('dub')}
                    className={cn(
                      "flex-1 sm:flex-none px-6 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors",
                      audioType === 'dub' ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    Dub
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Nav: Next */}
            <div className="hidden lg:block">
              {currentEp < Math.max(1, episodeCount) ? (
                <Link
                  to={`/watch/${animeId}/${currentEp + 1}`}
                  className="px-4 py-2 bg-gray-800 hover:bg-primary hover:text-[#0B0C0F] text-gray-300 rounded-lg transition-colors font-bold text-sm"
                >
                  Next Episode
                </Link>
              ) : (
                <div className="px-4 py-2 bg-gray-800/50 text-gray-500 rounded-lg font-bold text-sm cursor-not-allowed">
                  Next Episode
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block mt-4">
            <AnimeInfo anime={anime} />
          </div>
        </div>

        {/* Right Side: Episodes Section */}
        <div className="w-full sm:max-w-[400px] md:max-w-[450px] lg:max-w-none mx-auto lg:mx-0 lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#EDF1F5] flex items-center gap-3">
              <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
              Episodes
            </h2>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsListView(!isListView)}
                className="p-1.5 text-gray-400 hover:text-primary transition-colors bg-gray-800 rounded-lg border border-white/5"
                title="Toggle View Mode"
              >
                {isListView ? <LayoutGrid size={16} /> : <ListIcon size={16} />}
              </button>
              <button 
                onClick={() => setSortDesc(!sortDesc)}
                className="p-1.5 text-gray-400 hover:text-primary transition-colors bg-gray-800 rounded-lg border border-white/5"
                title="Sort Order"
              >
                <ArrowDownUp size={16} />
              </button>
            </div>
          </div>
          
          {totalChunks > 1 && (
            <div className="mb-4 relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-gray-800 border border-white/5 text-gray-300 rounded-lg p-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                <span>Episodes {chunks.find(c => c.index === episodeChunk)?.label}</span>
                <ChevronDown size={16} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
              </button>
              
              {isDropdownOpen && (
                <div className="mt-2 p-2 bg-gray-800 border border-white/5 rounded-lg shadow-xl grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {chunks.map(chunk => (
                    <button
                      key={chunk.index}
                      onClick={() => {
                        setEpisodeChunk(chunk.index);
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center",
                        episodeChunk === chunk.index
                          ? "bg-primary border-primary text-white"
                          : "bg-gray-900 border-white/5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                      )}
                    >
                      {chunk.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className={cn(
            "gap-2 overflow-y-auto custom-scrollbar px-1 lg:max-h-[calc(100vh-12rem)] pb-4",
            isListView 
              ? "flex flex-col gap-3" 
              : "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5"
          )}>
          {episodes.map(epNum => {
            const isFiller = fillerEpisodes.includes(epNum);
            const isWatched = watchedEpisodes.includes(epNum) && epNum !== currentEp;
            return isListView ? (
              <Link
                key={epNum}
                to={`/watch/${anime.id}/${epNum}`}
                className={cn(
                  "flex items-center gap-4 hover:border-primary/50 border rounded-xl p-3 lg:min-h-[100px] lg:p-4 font-bold text-sm transition-all shadow-lg group relative overflow-hidden",
                  epNum === currentEp 
                    ? "border-primary/50 ring-1 ring-primary/50 bg-gray-800" 
                    : isFiller 
                      ? "bg-[#f97316]/10 hover:bg-[#f97316]/20 border-[#f97316]/30"
                      : "bg-gray-800 hover:bg-gray-700 border-white/5 text-gray-300",
                  isWatched && "opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                )}
              >
                <div className="w-24 sm:w-32 lg:w-40 aspect-video flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-900">
                  <img 
                    src={episodeThumbMap.get(epNum) || anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    alt={`Episode ${epNum}`} 
                  />
                  {isFiller && <div className="absolute inset-0 bg-[#f97316]/20 pointer-events-none mix-blend-color" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-lg font-black leading-tight shrink-0", epNum === currentEp ? "text-primary" : isFiller ? "text-[#f97316]" : "text-white")}>Ep {epNum}</span>
                      {isFiller && <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 font-bold tracking-wider shrink-0">FILLER</span>}
                    </div>
                    <MarqueeText 
                      text={episodeTitleMap.get(epNum) || `Episode ${epNum}`}
                      className={cn("text-xs sm:text-sm font-medium transition-colors", isFiller ? "text-[#f97316]/80 group-hover:text-[#f97316]" : "text-gray-400 group-hover:text-white")}
                      align="left"
                    />
                  </div>
                </div>
                <PlayCircle size={24} className={cn("mr-2 flex-shrink-0 transition-colors", epNum === currentEp ? "text-primary" : isFiller ? "text-[#f97316]/50 group-hover:text-[#f97316]" : "text-gray-500 group-hover:text-primary")} />
              </Link>
            ) : (
              <Link
                key={epNum}
                to={`/watch/${anime.id}/${epNum}`}
                className={cn(
                  "relative aspect-square flex-col text-center border rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:-translate-y-1 shadow-lg overflow-hidden group",
                  epNum === currentEp 
                    ? "border-primary ring-1 ring-primary bg-gray-800" 
                    : isFiller
                      ? "bg-[#f97316]/20 border-[#f97316]/50"
                      : "bg-gray-800 hover:border-primary border-white/5",
                  isWatched && "opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                )}
              >
                <div className="absolute inset-0 w-full h-full">
                  <img 
                    src={episodeThumbMap.get(epNum) || anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large} 
                    alt={`Episode ${epNum}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-30" 
                  />
                  <div className={cn("absolute inset-0 opacity-80", isFiller ? "bg-gradient-to-t from-[#f97316]/40 via-[#0B0C0F]/60 to-[#f97316]/10 mix-blend-color" : "bg-gradient-to-t from-[#0B0C0F] via-[#0B0C0F]/40 to-transparent")} />
                </div>
                
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
                  <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 group-hover:opacity-0 group-hover:scale-90">
                    <span className={cn(
                      "text-xl md:text-2xl lg:text-lg xl:text-xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                      epNum === currentEp ? "text-primary" : isFiller ? "text-[#f97316]" : "text-white"
                    )}>
                      {epNum}
                    </span>
                    {isFiller && <span className="text-[10px] font-bold text-[#f97316] bg-black/50 px-1.5 py-0.5 rounded mt-1">FILLER</span>}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-105 group-hover:scale-100">
                    <MarqueeText 
                      text={episodeTitleMap.get(epNum) || `Episode ${epNum}`}
                      className={cn("text-[10px] md:text-[11px] font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight", isFiller ? "text-[#f97316]" : "text-white")}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="block lg:hidden mt-8 mb-8">
        <AnimeInfo anime={anime} />
      </div>

      </div>
    </div>
  );
}
