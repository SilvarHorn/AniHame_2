import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from 'react-router-dom';
import { fetchAnilist, ANIME_DETAILS_QUERY, isHanimeMode } from '../api/anilist';
import { AnimeMedia } from '../types';
import { saveProgress } from '../store/progress';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowDownUp, LayoutGrid, List as ListIcon, PlayCircle, ExternalLink, SlidersHorizontal, Server } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth, WatchServerType, DEFAULT_SERVER_ORDER } from '../contexts/AuthContext';
import { MarqueeText } from '../components/MarqueeText';
import { AnimeInfo } from '../components/ui/AnimeInfo';
import { ServerOrderModal } from '../components/player/ServerOrderModal';

export default function Watch() {
  const { profile, updatePreferences } = useAuth();
  const { id, ep } = useParams();
  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortDesc, setSortDesc] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [episodeChunk, setEpisodeChunk] = useState(0);
  const [audioType, setAudioType] = useState<'sub' | 'dub'>('sub');
  const [serverType, setServerType] = useState<WatchServerType>(() => {
    try {
      const stored = localStorage.getItem('app_user_profile_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        const pref = parsed?.preferences?.defaultServer;
        if (pref === 'megaplayz') return 'mal';
        if (pref && ['filmu', 'mal', 'vidc', 'anime', 'animepahe', 'tryembed', 'kozo', 'vidsrc'].includes(pref)) {
          return pref as WatchServerType;
        }
      }
    } catch (e) {}
    return 'filmu';
  });
  const [vidcUseMal, setVidcUseMal] = useState(false);
  const [isServerOrderModalOpen, setIsServerOrderModalOpen] = useState(false);
  const activeAnimeIdRef = useRef<number | null>(null);
  const manualServerChoiceRef = useRef<WatchServerType | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [malId, setMalId] = useState<number | null>(null);
  const [kitsuId, setKitsuId] = useState<string | null>(null);
  const [kitsuEpisodes, setKitsuEpisodes] = useState<any[]>([]);
  const [malEpisodes, setMalEpisodes] = useState<any[]>([]);
  const [fillerEpisodes, setFillerEpisodes] = useState<number[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [malTitle, setMalTitle] = useState<string | null>(null);
  const [zhenTubeUrl, setZhenTubeUrl] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);
  const [isZhenTubeLoading, setIsZhenTubeLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const animeId = Number(id);
  const currentEp = Number(ep);

  // Compute default server from settings (default server used for everything)
  const resolvedDefaultServer = React.useMemo<WatchServerType>(() => {
    const raw = profile?.preferences?.defaultServer;
    if (raw === 'megaplayz') return 'mal';
    if (raw && (['filmu', 'mal', 'vidc', 'anime', 'animepahe', 'tryembed', 'kozo', 'vidsrc'] as string[]).includes(raw)) {
      return raw as WatchServerType;
    }
    return 'filmu';
  }, [profile?.preferences?.defaultServer]);

  // Server lifecycle management:
  // "when a server is manually changed for a anime keep the same server until the website the reload or moved to an different anime and come back. use the default server in the setting for everthing."
  useEffect(() => {
    if (!animeId) return;

    if (activeAnimeIdRef.current !== animeId) {
      // Moved to a different anime (or initial anime load in this session)
      activeAnimeIdRef.current = animeId;
      manualServerChoiceRef.current = null; // Clear manual override!
      setVidcUseMal(false);
      setServerType(resolvedDefaultServer);
    } else {
      // Still on the same anime (e.g. changing episodes)
      if (manualServerChoiceRef.current) {
        setServerType(manualServerChoiceRef.current);
      }
    }
  }, [animeId, resolvedDefaultServer]);

  useEffect(() => {
    setVidcUseMal(false);
  }, [animeId, currentEp]);

  // Synchronize audio preferences
  useEffect(() => {
    if (profile?.preferences?.defaultAudio) {
      setAudioType(profile.preferences.defaultAudio);
    }
  }, [profile?.preferences?.defaultAudio]);

  const handleSelectServer = (chosenServer: WatchServerType) => {
    manualServerChoiceRef.current = chosenServer;
    if (chosenServer !== 'vidc') {
      setVidcUseMal(false);
    }
    setServerType(chosenServer);
  };

  const serverOrder: WatchServerType[] = React.useMemo(() => {
    const custom = profile?.preferences?.serverOrder;
    if (Array.isArray(custom) && custom.length > 0) {
      // Ensure all servers are included
      const list = [...custom];
      DEFAULT_SERVER_ORDER.forEach(s => {
        if (!list.includes(s)) list.push(s);
      });
      return list;
    }
    return DEFAULT_SERVER_ORDER;
  }, [profile?.preferences?.serverOrder]);

  const handleSaveServerOrder = async (newOrder: WatchServerType[]) => {
    await updatePreferences({ serverOrder: newOrder });
  };

  // Anti-hijack protection specifically for the Megaplay server
  useEffect(() => {
    if (serverType !== 'mal') return;

    let userIntentionalNavigation = false;

    const handleInternalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a, button, [role="button"]');
      if (target) {
        userIntentionalNavigation = true;
        setTimeout(() => {
          userIntentionalNavigation = false;
        }, 2000);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!userIntentionalNavigation) {
        // Intercept unauthorized top-window redirect from third-party embed
        e.preventDefault();
        return (e.returnValue = 'Leave AniHame?');
      }
    };

    document.addEventListener('click', handleInternalClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('click', handleInternalClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [serverType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          if (data.Media.isAdult && !isHanimeMode()) {
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
              if (mapping && mapping.mal_id && !data.Media.idMal) {
                const malNum = Number(mapping.mal_id);
                if (!isNaN(malNum) && malNum > 0) {
                  setAnime(prev => prev ? { ...prev, idMal: malNum } : prev);
                }
              }
              
              const malId = data.Media.idMal || (mapping?.mal_id ? Number(mapping.mal_id) : null);
              if (malId) {
                setMalId(malId);
                if (!data.Media.format) {
                  import('../api/mal').then(({ malClient }) => {
                    malClient.getAnimeType(malId).then(malType => {
                      if (malType) {
                        setAnime(prev => prev ? { ...prev, format: malType.toUpperCase() } : prev);
                      }
                    }).catch(() => {});
                  }).catch(() => {});
                }

                let epCount = data.Media.episodes || 12;
                if (data.Media.nextAiringEpisode) {
                  epCount = data.Media.nextAiringEpisode.episode - 1;
                }

                const currentEpNum = isNaN(currentEp) ? 1 : currentEp;
                const pStart = Math.max(1, Math.floor((currentEpNum - 1) / 100) * 100 + 1);
                const pEnd = pStart + 99;

                // 1. Fetch episode release dates from Jikan API
                import('../api/jikan').then(({ jikanClient }) => {
                  jikanClient.getEpisodes(
                    malId,
                    { start: pStart, end: pEnd },
                    (newEps) => {
                      setMalEpisodes([...newEps]);
                    }
                  ).catch(() => {});
                }).catch(() => {});

                // 2. Fetch episode thumbnails & titles from Kitsu
                try {
                  const { kitsuClient } = await import('../api/kitsu');
                  const resolvedKitsuId = await kitsuClient.getKitsuIdByMalId(malId);
                  if (resolvedKitsuId) {
                    setKitsuId(resolvedKitsuId);
                    const epData = await kitsuClient.getEpisodes(
                      resolvedKitsuId,
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
                  console.error('Watch episode fetch error', e);
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

  useEffect(() => {
    if (episodeChunk !== undefined) {
      const pStart = episodeChunk * 100 + 1;
      const pEnd = pStart + 99;
      if (malId) {
        import('../api/jikan').then(({ jikanClient }) => {
          jikanClient.getEpisodes(malId, { start: pStart, end: pEnd }, (newEps) => {
            setMalEpisodes(prev => {
              const map = new Map(prev.map((e: any) => [e.num, e]));
              newEps.forEach((e: any) => map.set(e.num, e));
              return Array.from(map.values()).sort((a: any, b: any) => a.num - b.num);
            });
          }).catch(() => {});
        });
      }
      if (kitsuId) {
        import('../api/kitsu').then(({ kitsuClient }) => {
          kitsuClient.getEpisodes(kitsuId, { start: pStart, end: pEnd }, (newEps) => {
            setKitsuEpisodes(prev => {
              const map = new Map(prev.map((e: any) => [e.num, e]));
              newEps.forEach((e: any) => map.set(e.num, e));
              return Array.from(map.values()).sort((a: any, b: any) => a.num - b.num);
            });
          });
        });
      }
    }
  }, [malId, kitsuId, episodeChunk]);

  useEffect(() => {
    if (isHanimeMode() && anime?.idMal) {
      fetch(`/api/mal/anime/${anime.idMal}`)
        .then(res => res.json())
        .then(data => {
          if (data.title) setMalTitle(data.title);
        })
        .catch(console.error);
    }
  }, [anime]);

  useEffect(() => {
    if (isHanimeMode()) {
      setServerType('zhentube');
    }
  }, [animeId]);

  useEffect(() => {
    if (serverType === 'zhentube' && anime) {
      setIsZhenTubeLoading(true);
      setZhenTubeUrl(null);
      const romajiTitle = anime.title.romaji || anime.title.english || '';
      fetch(`/api/zhentube?title=${encodeURIComponent(romajiTitle)}&episode=${currentEp}`)
        .then(res => res.json())
        .then(data => {
          if (data.src) {
            setZhenTubeUrl(data.src);
          }
        })
        .catch(err => console.error('ZhenTube error:', err))
        .finally(() => setIsZhenTubeLoading(false));
    }
  }, [serverType, anime, currentEp]);




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
  const rawAnilistId = anime?.id || animeId;
  const anilistIdForStream = encodeURIComponent(String(rawAnilistId).trim().replace(/[^a-zA-Z0-9_-]/g, ''));
  const safeEpisode = Math.max(1, Math.floor(Number(currentEp)) || 1);
  const safeAudio = audioType === 'dub' ? 'dub' : 'sub';

  const appendPlaybackParams = (url: string) => {
    if (!url) return '';
    const delimiter = url.includes('?') ? '&' : '?';
    return `${url}${delimiter}mute=0&auto_skip=0&autoskip=0`;
  };

  if (serverType === 'filmu') {
    iframeUrl = appendPlaybackParams(`https://embed.filmu.in/anime/${anilistIdForStream}/1/${safeEpisode}`);
  } else if (serverType === 'vidsrc' && imdbId) {
    const safeImdb = encodeURIComponent(String(imdbId).trim().replace(/[^a-zA-Z0-9_-]/g, ''));
    if (anime?.format === 'MOVIE') {
      iframeUrl = appendPlaybackParams(`https://vidsrc2.ru/embed/movie/${safeImdb}`);
    } else {
      iframeUrl = appendPlaybackParams(`https://vidsrc2.ru/embed/tv/${safeImdb}/1/${safeEpisode}`);
    }
  } else if (serverType === 'vidc') {
    const rawMalId = anime?.idMal || malId;
    const malIdForStream = rawMalId ? encodeURIComponent(String(rawMalId).trim().replace(/[^a-zA-Z0-9_-]/g, '')) : '';
    if (vidcUseMal && malIdForStream) {
      iframeUrl = `https://vidcloud.sbs/embed/mal/${malIdForStream}/${safeEpisode}?track=${safeAudio}&autoSkip=1&autoNext=1`;
    } else if (anilistIdForStream) {
      iframeUrl = `https://vidcloud.sbs/embed/ani/${anilistIdForStream}/${safeEpisode}?track=${safeAudio}&autoSkip=1`;
    } else if (malIdForStream) {
      iframeUrl = `https://vidcloud.sbs/embed/mal/${malIdForStream}/${safeEpisode}?track=${safeAudio}&autoSkip=1&autoNext=1`;
    } else {
      iframeUrl = '';
    }
  } else if (serverType === 'kozo') {
    const rawMalId = anime?.idMal || animeId;
    const malId = encodeURIComponent(String(rawMalId).trim().replace(/[^a-zA-Z0-9_-]/g, ''));
    iframeUrl = appendPlaybackParams(`https://zokoanime.video/stream/mal/${malId}/${safeEpisode}/${safeAudio}?color=35d5bf`);
  } else if (serverType === 'anime') {
    iframeUrl = appendPlaybackParams(`https://vidnest.fun/anime/${anilistIdForStream}/${safeEpisode}/${safeAudio}`);
  } else if (serverType === 'animepahe') {
    iframeUrl = appendPlaybackParams(`https://vidnest.fun/animepahe/${anilistIdForStream}/${safeEpisode}/${safeAudio}`);
  } else if (serverType === 'tryembed') {
    iframeUrl = appendPlaybackParams(`https://tryembed.us.cc/embed/anime/${anilistIdForStream}/${safeEpisode}/${safeAudio}`);
  } else if (serverType === 'zhentube') {
    iframeUrl = appendPlaybackParams(zhenTubeUrl || '');
  } else {
    // Megaplay strictly uses only the MyAnimeList ID, NEVER the AniList ID
    if (anime?.idMal) {
      const malId = encodeURIComponent(String(anime.idMal).trim().replace(/[^a-zA-Z0-9_-]/g, ''));
      iframeUrl = appendPlaybackParams(`https://megaplay.buzz/stream/mal/${malId}/${safeEpisode}/${safeAudio}`);
    } else {
      iframeUrl = '';
    }
  }

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframe = e.currentTarget;
      if (iframe && iframe.contentWindow) {
        // Broadcast mute=0 and auto_skip=0 commands for embed players listening to postMessage API
        const msgs = [
          { event: 'command', func: 'unMute' },
          { event: 'command', func: 'setVolume', args: [100] },
          { type: 'unmute' },
          { action: 'unmute' },
          { event: 'auto_skip', value: false },
          { type: 'auto_skip', value: false },
          { action: 'disable_auto_skip' },
          { event: 'skip_intro', value: false },
          { type: 'skip_intro', value: false }
        ];
        msgs.forEach(msg => {
          iframe.contentWindow?.postMessage(msg, '*');
          iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
        });
      }
    } catch {
      // Ignored for cross-origin security
    }
  };

  const handleIframeError = () => {
    const rawMalId = anime?.idMal || malId;
    if (serverType === 'vidc' && !vidcUseMal && rawMalId) {
      setVidcUseMal(true);
      return;
    }

    const currentIndex = serverOrder.indexOf(serverType as WatchServerType);
    if (currentIndex >= 0 && currentIndex < serverOrder.length - 1) {
      const nextServer = serverOrder[currentIndex + 1];
      handleSelectServer(nextServer);
    } else {
      const fallback = serverOrder.find(s => s !== serverType && (s !== 'mal' || !!anime?.idMal)) || 'filmu';
      handleSelectServer(fallback);
    }
  };

  const episodeTitleMap = new Map<number, string>();
  const episodeThumbMap = new Map<number, string>();
  const episodeAiredMap = new Map<number, string>();
  
  // 1. Fallback 2: AniList streaming episodes
  if (anime?.streamingEpisodes) {
    anime.streamingEpisodes.forEach(episode => {
      const match = episode.title.match(/Episode\s+(\d+)(?:[\s\-:]+(.*))?/i);
      if (match) {
        const epNum = parseInt(match[1]);
        const aniListTitle = match[2]?.trim();
        
        if (aniListTitle && !aniListTitle.match(/^Episode\s+\d+$/i)) {
          episodeTitleMap.set(epNum, aniListTitle);
        } else if (episode.title && !episode.title.match(/^Episode\s+\d+$/i)) {
          episodeTitleMap.set(epNum, episode.title);
        }

        if (episode.thumbnail) {
          episodeThumbMap.set(epNum, episode.thumbnail);
        }
      } else {
        const titleMatch = episode.title.match(/(.*)/);
        if (titleMatch && anime.format === 'MOVIE') {
          episodeTitleMap.set(1, episode.title);
          if (episode.thumbnail) episodeThumbMap.set(1, episode.thumbnail);
        }
      }
    });
  }

  // 2. Fallback 1: Kitsu episodes
  if (kitsuEpisodes && kitsuEpisodes.length > 0) {
    kitsuEpisodes.forEach((ep: any) => {
      if (ep.num) {
        if (ep.title && !ep.title.match(/^Episode\s+\d+$/i)) {
          episodeTitleMap.set(ep.num, ep.title);
        }
        if (ep.thumbnail) {
          episodeThumbMap.set(ep.num, ep.thumbnail);
        }
      }
    });
  }

  // 3. Primary: MAL episodes
  if (malEpisodes && malEpisodes.length > 0) {
    malEpisodes.forEach((ep: any) => {
      if (ep.num && ep.title && !ep.title.match(/^Episode\s+\d+$/i)) {
        episodeTitleMap.set(ep.num, ep.title);
      }
      if (ep.num && ep.aired) {
        episodeAiredMap.set(ep.num, ep.aired);
      }
    });
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-3.5rem)] pb-12">
      <div className="flex items-center justify-between gap-4 mb-4 md:mb-6 shrink-0 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Link 
            to={`/anime/${anime.id}`}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-colors border border-white/5 shrink-0"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-[#FBF3E5] line-clamp-1">
            {malTitle || (isHanimeMode() ? (anime.title.romaji || anime.title.english) : (anime.title.english || anime.title.romaji))}
            <span className="text-primary ml-2 font-medium">Episode {currentEp}</span>
          </h1>
        </div>

        {isInIframe && (
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors shrink-0"
            title="Open player in a new browser tab"
          >
            <ExternalLink size={14} />
            <span>Open in New Tab</span>
          </a>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-12">
        {/* Left Side: Video Player */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="w-full bg-black rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 flex flex-col aspect-video shrink-0">
            <div className="w-full h-full relative">
              {iframeUrl ? (
                serverType === 'mal' ? (
                  <iframe 
                    key={`mal-${currentEp}-${audioType}`}
                    src={iframeUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 w-full h-full border-none"
                    title={`Watch ${anime.title.romaji} Episode ${currentEp}`}
                    onError={handleIframeError}
                    onLoad={handleIframeLoad}
                  ></iframe>
                ) : serverType === 'vidc' ? (
                  <iframe 
                    key={`vidc-${currentEp}-${audioType}-${vidcUseMal ? 'mal' : 'ani'}`}
                    src={iframeUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    loading="lazy"
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture"
                    className="absolute inset-0 w-full h-full border-none"
                    title={`Watch ${anime.title.romaji} Episode ${currentEp}`}
                    onError={handleIframeError}
                    onLoad={handleIframeLoad}
                  ></iframe>
                ) : (
                  <iframe 
                    key={`${serverType}-${currentEp}-${audioType}`}
                    src={iframeUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full border-none"
                    title={`Watch ${anime.title.romaji} Episode ${currentEp}`}
                    onError={handleIframeError}
                    onLoad={handleIframeLoad}
                  ></iframe>
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[#0B0C0F]">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                    <Server size={22} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {serverType === 'mal' && !anime?.idMal
                      ? 'MyAnimeList ID Not Available'
                      : 'No Video Stream Available'}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm max-w-md mb-4">
                    {serverType === 'mal' && !anime?.idMal
                      ? 'Megaplay only uses the MyAnimeList ID. Please switch to another server below to watch this episode.'
                      : 'Please select an alternate server below to begin playback.'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {serverOrder.filter(s => s !== 'mal' && (s !== 'vidsrc' || imdbId)).slice(0, 4).map(srv => {
                      const names: Record<string, string> = {
                        filmu: 'FilmU',
                        kozo: 'Kozo',
                        tryembed: 'Try',
                        vidc: 'VidC',
                        anime: 'Anime',
                        animepahe: 'AnimePahe',
                        mal: 'Megaplay',
                        vidsrc: 'VidSrc'
                      };
                      return (
                        <button
                          key={srv}
                          type="button"
                          onClick={() => handleSelectServer(srv)}
                          className="px-3.5 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-black rounded-lg text-xs font-bold transition-all"
                        >
                          Switch to {names[srv] || srv}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
            
          {/* Episode Navigation Bar: Next & Previous */}
          <div className="bg-[#10141d]/75 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-white/10 shrink-0 flex items-center justify-between gap-3 shadow-lg mb-3">
            {/* Previous Episode Button */}
            {currentEp > 1 ? (
              <Link
                to={`/watch/${animeId}/${currentEp - 1}`}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] hover:text-white text-gray-300 rounded-xl transition-all font-semibold text-xs sm:text-sm border border-white/10 active:scale-95 shadow-sm group"
                title={`Previous Episode (${currentEp - 1})`}
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Previous Episode</span>
              </Link>
            ) : (
              <div 
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white/[0.02] text-gray-600 rounded-xl font-semibold text-xs sm:text-sm border border-white/5 cursor-not-allowed select-none opacity-40"
                title="Already at first episode"
              >
                <ChevronLeft size={16} />
                <span>Previous Episode</span>
              </div>
            )}

            {/* Current Episode Indicator */}
            <div className="text-xs sm:text-sm font-semibold text-gray-400 select-none">
              Episode <span className="text-white font-black">{currentEp}</span>
              {episodeCount > 0 && <span className="text-gray-500 font-normal"> of {episodeCount}</span>}
            </div>

            {/* Next Episode Button */}
            {currentEp < Math.max(1, episodeCount) ? (
              <Link
                to={`/watch/${animeId}/${currentEp + 1}`}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-primary hover:bg-primary-hover text-[#0B0C0F] rounded-xl transition-all font-bold text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-primary/30 active:scale-95 group"
                title={`Next Episode (${currentEp + 1})`}
              >
                <span>Next Episode</span>
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <div 
                className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-white/[0.02] text-gray-600 rounded-xl font-bold text-xs sm:text-sm border border-white/5 cursor-not-allowed select-none opacity-40"
                title="Already at latest episode"
              >
                <span>Next Episode</span>
                <ChevronRight size={16} />
              </div>
            )}
          </div>

          {/* Server & Audio Settings Bar */}
          <div className="bg-[#10141d]/50 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/10 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-md">
            {/* Left: Server Selector */}
            {!isHanimeMode() && (
              <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5 flex-wrap sm:flex-nowrap gap-1">
                {serverOrder.map((srv) => {
                  if (srv === 'filmu') {
                    return (
                      <button
                        key="filmu"
                        type="button"
                        onClick={() => handleSelectServer('filmu')}
                        disabled={!anime?.id && !animeId}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                          serverType === 'filmu' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                      >
                        FilmU
                      </button>
                    );
                  }
                  if (srv === 'mal') {
                    return (
                      <button
                        key="mal"
                        type="button"
                        onClick={() => handleSelectServer('mal')}
                        disabled={!anime?.idMal}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                          serverType === 'mal' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                        title={!anime?.idMal ? "MyAnimeList ID not available for this anime on Megaplay" : undefined}
                      >
                        Megaplay
                      </button>
                    );
                  }
                  if (srv === 'vidc') {
                    return (
                      <button
                        key="vidc"
                        type="button"
                        onClick={() => handleSelectServer('vidc')}
                        disabled={!anime?.id && !animeId && !anime?.idMal && !malId}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                          serverType === 'vidc' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                      >
                        VidC
                      </button>
                    );
                  }
                  if (srv === 'anime') {
                    return (
                      <button
                        key="anime"
                        onClick={() => handleSelectServer('anime')}
                        disabled={!anime?.id && !animeId}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                          serverType === 'anime' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                      >
                        Anime
                      </button>
                    );
                  }
                  if (srv === 'animepahe') {
                    return (
                      <button
                        key="animepahe"
                        onClick={() => handleSelectServer('animepahe')}
                        disabled={!anime?.id && !animeId}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                          serverType === 'animepahe' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                      >
                        AnimePahe
                      </button>
                    );
                  }
                  if (srv === 'tryembed') {
                    return (
                      <button
                        key="tryembed"
                        onClick={() => handleSelectServer('tryembed')}
                        disabled={!anime?.id && !animeId}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                          serverType === 'tryembed' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                      >
                        Try
                      </button>
                    );
                  }
                  if (srv === 'kozo') {
                    return (
                      <button
                        key="kozo"
                        onClick={() => handleSelectServer('kozo')}
                        disabled={!anime?.idMal && !animeId}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                          serverType === 'kozo' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                        title={!anime?.idMal ? "MAL ID not available for this anime" : undefined}
                      >
                        Kozo
                      </button>
                    );
                  }
                  if (srv === 'vidsrc') {
                    return (
                      <button
                        key="vidsrc"
                        onClick={() => handleSelectServer('vidsrc')}
                        disabled={!imdbId}
                        className={cn(
                          "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                          serverType === 'vidsrc' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                        )}
                        title={!imdbId ? "IMDb ID not available for this anime" : undefined}
                      >
                        VidSrc
                      </button>
                    );
                  }
                  return null;
                })}

                {/* Open Arrange Server Modal */}
                <button
                  type="button"
                  onClick={() => setIsServerOrderModalOpen(true)}
                  className="px-2.5 py-1.5 text-gray-400 hover:text-primary hover:bg-white/[0.06] rounded-lg transition-colors ml-0.5"
                  title="Arrange Server List Order"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {/* VidC ID Mode Selector (AniList / MAL) */}
              {serverType === 'vidc' && (anime?.idMal || malId) && (anime?.id || animeId) && (
                <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5 gap-1">
                  <button
                    type="button"
                    onClick={() => setVidcUseMal(false)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all",
                      !vidcUseMal ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                    )}
                    title="Stream with AniList ID"
                  >
                    AniList
                  </button>
                  <button
                    type="button"
                    onClick={() => setVidcUseMal(true)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all",
                      vidcUseMal ? "bg-primary text-[#0B0C0F] shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                    )}
                    title="Stream with MyAnimeList ID"
                  >
                    MAL
                  </button>
                </div>
              )}

              {/* Audio Type Selector */}
              {(serverType === 'filmu' || serverType === 'mal' || serverType === 'vidc' || serverType === 'kozo' || serverType === 'anime' || serverType === 'animepahe' || serverType === 'tryembed') && (
                <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5 gap-1">
                  <button
                    onClick={() => setAudioType('sub')}
                    className={cn(
                      "px-4 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all",
                      audioType === 'sub' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                    )}
                  >
                    Sub
                  </button>
                  <button
                    onClick={() => setAudioType('dub')}
                    className={cn(
                      "px-4 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all",
                      audioType === 'dub' ? "bg-primary text-[#0B0C0F] shadow-sm font-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                    )}
                  >
                    Dub
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block mt-4">
            <AnimeInfo anime={anime} />
          </div>
        </div>

        {/* Right Side: Episodes Section */}
        <div className="w-full sm:max-w-[400px] md:max-w-[450px] lg:max-w-none mx-auto lg:mx-0 lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col bg-[#10141d]/25 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#FBF3E5] flex items-center gap-3">
              <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
              Episodes
            </h2>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsListView(!isListView)}
                className="p-1.5 text-gray-400 hover:text-primary transition-colors bg-white/[0.06] hover:bg-white/[0.12] rounded-lg border border-white/10"
                title="Toggle View Mode"
              >
                {isListView ? <LayoutGrid size={16} /> : <ListIcon size={16} />}
              </button>
              <button 
                onClick={() => setSortDesc(!sortDesc)}
                className="p-1.5 text-gray-400 hover:text-primary transition-colors bg-white/[0.06] hover:bg-white/[0.12] rounded-lg border border-white/10"
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
                className="w-full flex items-center justify-between bg-white/[0.06] border border-white/10 text-gray-300 rounded-lg p-2.5 text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                <span>Episodes {chunks.find(c => c.index === episodeChunk)?.label}</span>
                <ChevronDown size={16} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
              </button>
              
              {isDropdownOpen && (
                <div className="mt-2 p-2 bg-[#10141d]/85 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scrollbar z-30">
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
                          ? "bg-primary border-primary text-[#0B0C0F]"
                          : "bg-white/[0.06] border-white/5 text-gray-300 hover:bg-white/[0.12] hover:text-white"
                      )}
                    >
                      {chunk.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="flex-1 min-h-0 bg-black/15 border border-white/5 rounded-xl p-2">
            <div className={cn(
              "gap-2 overflow-y-auto custom-scrollbar px-1 max-h-[500px] lg:max-h-[calc(100vh-17rem)] pb-2",
              isListView 
                ? "flex flex-col gap-2.5" 
                : "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-4 xl:grid-cols-5"
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
                    ? "border-primary/50 ring-1 ring-primary/50 bg-primary/15 backdrop-blur-sm" 
                    : isFiller 
                      ? "bg-[#f97316]/10 hover:bg-[#f97316]/20 border-[#f97316]/30"
                      : "bg-white/[0.04] hover:bg-white/[0.09] border-white/5 text-gray-300",
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
                    {profile?.preferences?.showEpisodeDate !== false && episodeAiredMap.get(epNum) && (
                      <div className="text-[10px] text-gray-500 mt-0.5">{episodeAiredMap.get(epNum)}</div>
                    )}
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
                    ? "border-primary ring-1 ring-primary bg-primary/20 backdrop-blur-sm" 
                    : isFiller
                      ? "bg-[#f97316]/20 border-[#f97316]/50"
                      : "bg-white/[0.04] hover:bg-white/[0.09] hover:border-primary border-white/5",
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-105 group-hover:scale-100">
                    <MarqueeText 
                      text={episodeTitleMap.get(epNum) || `Episode ${epNum}`}
                      className={cn("text-[10px] md:text-[11px] font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight", isFiller ? "text-[#f97316]" : "text-white")}
                    />
                    {profile?.preferences?.showEpisodeDate !== false && episodeAiredMap.get(epNum) && (
                      <div className="text-[9px] text-gray-400 mt-1 opacity-80">{episodeAiredMap.get(epNum)}</div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
            </div>
          </div>
        </div>

      <div className="block lg:hidden mt-8 mb-8">
        <AnimeInfo anime={anime} />
      </div>

      <ServerOrderModal
        isOpen={isServerOrderModalOpen}
        onClose={() => setIsServerOrderModalOpen(false)}
        order={serverOrder}
        onSave={handleSaveServerOrder}
      />

      </div>
    </div>
  );
}
