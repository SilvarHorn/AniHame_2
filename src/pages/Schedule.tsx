import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  format, 
  fromUnixTime, 
  isYesterday, 
  isToday, 
  isTomorrow, 
  addDays, 
  isSameDay, 
  formatDistanceToNowStrict 
} from 'date-fns';
import { fetchAnilist, AIRING_SCHEDULE_QUERY, isHanimeMode } from '../api/anilist';
import { AiringSchedule } from '../types';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Play, 
  Check, 
  Sparkles, 
  Search, 
  Globe, 
  Calendar as CalendarIcon, 
  RotateCcw,
  Film,
  Tv,
  ArrowRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

function getRelativeDayLabel(date: Date) {
  if (isYesterday(date)) return 'YESTERDAY';
  if (isToday(date)) return 'TODAY';
  if (isTomorrow(date)) return 'TOMORROW';
  const in2Days = addDays(new Date(), 2);
  if (isSameDay(date, in2Days)) return 'IN 2 DAYS';
  const in3Days = addDays(new Date(), 3);
  if (isSameDay(date, in3Days)) return 'IN 3 DAYS';
  const in4Days = addDays(new Date(), 4);
  if (isSameDay(date, in4Days)) return 'IN 4 DAYS';
  return null;
}

function getRelColor(relLabel: string | null) {
  if (relLabel === 'TODAY') return 'bg-primary text-[#0B0C0F] px-1.5 py-[1px] rounded uppercase font-black tracking-wider';
  if (relLabel === 'TOMORROW') return 'text-orange-400 font-black tracking-wider uppercase';
  if (relLabel && relLabel.startsWith('IN ')) return 'text-primary font-black tracking-wider uppercase';
  if (relLabel === 'YESTERDAY') return 'text-gray-400 font-bold tracking-wider uppercase';
  return 'text-gray-500 font-bold tracking-wider uppercase';
}

function formatCountdownOrAired(airingAtSeconds: number): { text: string; hasAired: boolean } {
  const airDate = fromUnixTime(airingAtSeconds);
  const now = Date.now();
  const diff = airDate.getTime() - now;

  if (diff <= 0) {
    return {
      hasAired: true,
      text: `Aired ${formatDistanceToNowStrict(airDate)} ago`
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return { hasAired: false, text: `in ${days}d ${hours % 24}h` };
  }
  if (hours > 0) {
    return { hasAired: false, text: `in ${hours}h ${mins}m` };
  }
  return { hasAired: false, text: `in ${Math.max(1, mins)}m` };
}

export default function Schedule() {
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, AiringSchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'aired'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getProfileRegion = () => {
    try {
      const saved = localStorage.getItem('anime_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultRegion !== undefined) return parsed.defaultRegion;
      }
    } catch (e) {}
    return '';
  };
  
  const [country, setCountry] = useState(getProfileRegion);

  // 14-day schedule range: 3 days ago up to 10 days in the future
  const scheduleDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    for (let i = -3; i <= 10; i++) {
      const d = addDays(today, i);
      result.push({
        date: d,
        formatStr: format(d, 'yyyy-MM-dd'),
        labelDay: format(d, 'EEE'),
        labelDate: format(d, 'MMM d'),
        relLabel: getRelativeDayLabel(d),
        isToday: i === 0
      });
    }
    return result;
  }, []);

  const todayFormatStr = useMemo(() => {
    return format(new Date(), 'yyyy-MM-dd');
  }, []);

  const [selectedDay, setSelectedDay] = useState(() => todayFormatStr);
  const activeDayObj = scheduleDays.find(d => d.formatStr === selectedDay) || scheduleDays[3];

  // Auto-scroll the selected day pill into view when changed or mounted
  useEffect(() => {
    const el = document.getElementById(`day-pill-${selectedDay}`);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDay]);

  useEffect(() => {
    const loadDaySchedule = async () => {
      if (!activeDayObj) return;
      const dayKey = activeDayObj.formatStr;
      
      // If already cached, no need to refetch
      if (scheduleByDay[dayKey]) {
        return;
      }

      setError('');
      setLoading(true);

      try {
        const startDay = new Date(activeDayObj.date);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(activeDayObj.date);
        endDay.setHours(23, 59, 59, 999);
        
        let allDaySchedules: AiringSchedule[] = [];
        let page = 1;
        let hasNextPage = true;
        const seenKeys = new Set<string>();

        while (hasNextPage && page <= 6) {
          const data = await fetchAnilist(AIRING_SCHEDULE_QUERY, {
            airingAt_greater: Math.floor(startDay.getTime() / 1000),
            airingAt_lesser: Math.floor(endDay.getTime() / 1000),
            page,
            perPage: 50
          });
          
          if (data?.Page?.airingSchedules) {
            const filtered = data.Page.airingSchedules.filter((s: any) => 
              isHanimeMode() ? s.media?.isAdult : !s.media?.isAdult
            );

            for (const item of filtered) {
              const dedupeKey = `${item.media?.id}-${item.episode}`;
              if (!seenKeys.has(dedupeKey)) {
                seenKeys.add(dedupeKey);
                allDaySchedules.push(item);
              }
            }
          }
          
          hasNextPage = Boolean(data?.Page?.pageInfo?.hasNextPage);
          page++;
        }

        // Sort strictly by airingAt timestamp ascending
        allDaySchedules.sort((a, b) => a.airingAt - b.airingAt);
        
        setScheduleByDay(prev => ({ ...prev, [dayKey]: allDaySchedules }));
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to fetch schedule for this day. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDaySchedule();
  }, [selectedDay, activeDayObj, scheduleByDay]);

  // Filter items by search, country of origin, and status
  const dayItems = scheduleByDay[selectedDay] || [];
  const nowMs = Date.now();

  const filteredItems = useMemo(() => {
    return dayItems.filter(item => {
      // 1. Region filter
      if (country) {
        const itemOrigin = item.media.countryOfOrigin || 'JP';
        if (itemOrigin !== country) return false;
      }

      // 2. Status filter
      const hasAired = item.airingAt * 1000 <= nowMs;
      if (statusFilter === 'aired' && !hasAired) return false;
      if (statusFilter === 'upcoming' && hasAired) return false;

      // 3. Search query filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const romaji = (item.media.title?.romaji || '').toLowerCase();
        const english = (item.media.title?.english || '').toLowerCase();
        const native = (item.media.title?.native || '').toLowerCase();
        const genres = (item.media.genres || []).map(g => g.toLowerCase());
        const match = romaji.includes(q) || english.includes(q) || native.includes(q) || genres.some(g => g.includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [dayItems, country, statusFilter, searchFilter, nowMs]);

  const timezoneName = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    } catch {
      return 'Local Time';
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#FBF3E5] tracking-tight">
              Airing Schedule
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400">
            Track daily anime broadcast times localized to your timezone ({timezoneName})
          </p>
        </div>

        {/* Jump to Today & Quick Status */}
        <div className="flex items-center gap-2">
          {selectedDay !== todayFormatStr && (
            <button
              onClick={() => setSelectedDay(todayFormatStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all shadow-sm"
              title="Jump to today's schedule"
            >
              <CalendarIcon size={14} />
              <span>Jump to Today</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-[#12151D] px-3 py-1.5 rounded-xl border border-white/5 text-xs text-gray-400">
            <Clock size={14} className="text-primary shrink-0" />
            <span className="font-mono font-bold text-gray-200">
              {format(new Date(), 'HH:mm')}
            </span>
          </div>
        </div>
      </div>

      {/* Days Scroller */}
      <div className="relative mb-6">
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-2.5 pb-2 pt-1 px-1 custom-scrollbar scroll-smooth"
        >
          {scheduleDays.map(d => {
            const isSelected = selectedDay === d.formatStr;
            return (
              <button
                key={d.formatStr}
                id={`day-pill-${d.formatStr}`}
                onClick={() => setSelectedDay(d.formatStr)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[105px] sm:min-w-[115px] h-[58px] px-3 rounded-2xl border transition-all shrink-0 cursor-pointer select-none",
                  isSelected 
                    ? "bg-primary border-primary text-[#0B0C0F] shadow-lg shadow-primary/20 scale-[1.02]" 
                    : "bg-[#101319] border-white/5 text-gray-400 hover:text-white hover:bg-[#151F2E] hover:border-white/10"
                )}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-sm font-bold tracking-tight", isSelected ? "text-[#0B0C0F]" : "text-white")}>
                    {d.labelDay}
                  </span>
                  <span className={cn("text-[11px]", isSelected ? "text-[#0B0C0F]/80 font-bold" : "text-gray-400")}>
                    {d.labelDate}
                  </span>
                </div>
                {d.relLabel ? (
                  <div className="mt-1">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded leading-none",
                      isSelected 
                        ? "bg-[#0B0C0F] text-primary font-black tracking-wider uppercase shadow-xs" 
                        : getRelColor(d.relLabel)
                    )}>
                      {d.relLabel}
                    </span>
                  </div>
                ) : (
                  <span className={cn("text-[10px] mt-0.5", isSelected ? "text-[#0B0C0F]/70 font-semibold" : "text-gray-500")}>
                    {format(d.date, 'yyyy')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-[#101319] rounded-2xl border border-white/5 p-3.5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter today's anime by title or genre..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-[#FBF3E5] placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Badges & Region Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center bg-[#0B0C0F] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
                statusFilter === 'all' ? "bg-primary text-[#0B0C0F]" : "text-gray-400 hover:text-white"
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
                statusFilter === 'upcoming' ? "bg-primary text-[#0B0C0F]" : "text-gray-400 hover:text-white"
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => setStatusFilter('aired')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
                statusFilter === 'aired' ? "bg-primary text-[#0B0C0F]" : "text-gray-400 hover:text-white"
              )}
            >
              Aired
            </button>
          </div>

          {/* Region Dropdown */}
          <div className="flex items-center bg-[#0B0C0F] rounded-xl border border-white/5 px-2 py-1">
            <Globe size={13} className="text-gray-400 mr-1.5" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="bg-[#0B0C0F] text-white">All Regions</option>
              <option value="JP" className="bg-[#0B0C0F] text-white">Japan (JP)</option>
              <option value="CN" className="bg-[#0B0C0F] text-white">China (CN)</option>
              <option value="KR" className="bg-[#0B0C0F] text-white">Korea (KR)</option>
            </select>
          </div>

          {/* Reset Filters if modified */}
          {(searchFilter || country || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchFilter('');
                setCountry('');
                setStatusFilter('all');
              }}
              className="p-2 text-gray-400 hover:text-primary bg-[#0B0C0F] rounded-xl border border-white/5 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Info Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1 mb-4 font-medium">
        <div className="flex items-center gap-2">
          <span>Releases for <strong className="text-white">{activeDayObj ? format(activeDayObj.date, 'EEEE, MMMM d, yyyy') : ''}</strong></span>
        </div>
        <div>
          Showing <span className="font-bold text-primary">{filteredItems.length}</span> of {dayItems.length} releases
        </div>
      </div>

      {/* Main Grid View */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedDay}-${country}-${statusFilter}-${searchFilter}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {error ? (
            <div className="text-center py-16 bg-[#101319] rounded-2xl border border-white/5 p-6">
              <p className="text-red-400 text-sm font-semibold mb-3">{error}</p>
              <button
                onClick={() => {
                  setScheduleByDay(prev => {
                    const copy = { ...prev };
                    delete copy[selectedDay];
                    return copy;
                  });
                }}
                className="px-4 py-2 bg-primary/20 hover:bg-primary text-primary hover:text-[#0B0C0F] rounded-xl text-xs font-bold transition-all"
              >
                Retry Loading
              </button>
            </div>
          ) : loading && !scheduleByDay[selectedDay] ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-[#101319] border border-white/5 rounded-2xl p-3.5 flex gap-3.5 animate-pulse">
                  <div className="w-[88px] h-[124px] bg-gray-800 rounded-xl shrink-0" />
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-1/2 mb-3" />
                      <div className="h-3 bg-gray-800 rounded w-1/3" />
                    </div>
                    <div className="h-7 bg-gray-800 rounded-lg w-full mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20 bg-[#101319] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 rounded-full bg-gray-800/80 flex items-center justify-center text-gray-500 mb-3">
                <CalendarIcon size={24} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Releases Scheduled</h3>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                {searchFilter || country || statusFilter !== 'all'
                  ? 'No anime releases match your current search and filter criteria.'
                  : 'There are no broadcasting anime episodes recorded for this day.'}
              </p>
              {(searchFilter || country || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchFilter('');
                    setCountry('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-primary text-[#0B0C0F] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            /* Anime Release Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {filteredItems.map(item => {
                const airDate = fromUnixTime(item.airingAt);
                const { text: statusText, hasAired } = formatCountdownOrAired(item.airingAt);
                const title = isHanimeMode() 
                  ? (item.media.title?.romaji || item.media.title?.english || 'Untitled') 
                  : (item.media.title?.english || item.media.title?.romaji || 'Untitled');
                const secondaryTitle = isHanimeMode() ? item.media.title?.english : item.media.title?.romaji;
                
                // Clicking an episode that has already aired directly launches player!
                const primaryLink = hasAired 
                  ? `/watch/${item.media.id}/${item.episode}` 
                  : `/anime/${item.media.id}`;

                return (
                  <div
                    key={`${item.media.id}-${item.episode}`}
                    className="group bg-[#101319] hover:bg-[#151a24] border border-white/5 hover:border-primary/40 rounded-2xl p-3 flex gap-3.5 transition-all shadow-md hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden"
                  >
                    {/* Poster Thumbnail */}
                    <Link
                      to={primaryLink}
                      className="relative w-[90px] h-[126px] shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-white/5 block"
                    >
                      <img 
                        src={item.media.coverImage?.extraLarge || item.media.coverImage?.large} 
                        alt={title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        loading="lazy"
                      />
                      
                      {/* Episode Badge */}
                      <div className="absolute top-1.5 left-1.5 bg-primary text-[#0B0C0F] text-[10px] font-black px-1.5 py-0.5 rounded-md z-10 leading-none shadow-md">
                        EP {item.episode}
                      </div>

                      {/* Format Badge */}
                      {item.media.format && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-xs text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 z-10">
                          {item.media.format}
                        </div>
                      )}
                    </Link>
                    
                    {/* Content Details */}
                    <div className="flex flex-col flex-1 min-w-0 justify-between py-0.5">
                      <div>
                        {/* Title */}
                        <Link to={`/anime/${item.media.id}`}>
                          <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-primary transition-colors leading-snug" title={title}>
                            {title}
                          </h3>
                        </Link>
                        {secondaryTitle && secondaryTitle !== title && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 leading-none mt-0.5">
                            {secondaryTitle}
                          </p>
                        )}

                        {/* Status Pill & Time Badge */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {hasAired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2 py-0.5 rounded-md">
                              <Check size={10} strokeWidth={3} />
                              <span>{statusText}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md animate-pulse">
                              <Sparkles size={10} strokeWidth={2.5} />
                              <span>{statusText}</span>
                            </span>
                          )}

                          {item.media.countryOfOrigin && item.media.countryOfOrigin !== 'JP' && (
                            <span className="text-[9px] font-black text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded border border-white/5">
                              {item.media.countryOfOrigin}
                            </span>
                          )}
                        </div>

                        {/* Exact Air Time */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                          <Clock size={12} className="text-primary shrink-0" />
                          <span>
                            Airs at <strong className="text-gray-200">{format(airDate, 'HH:mm')}</strong>
                            <span className="text-[10px] text-gray-500 ml-1">({format(airDate, 'h:mm a')})</span>
                          </span>
                        </div>
                      </div>

                      {/* Action Button Row */}
                      <div className="pt-2 mt-auto flex items-center justify-between gap-2 border-t border-white/5">
                        <Link
                          to={`/anime/${item.media.id}`}
                          className="text-[11px] font-semibold text-gray-400 hover:text-white transition-colors truncate"
                        >
                          Anime Details
                        </Link>

                        {hasAired ? (
                          <Link
                            to={`/watch/${item.media.id}/${item.episode}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary hover:bg-primary-hover text-[#0B0C0F] text-xs font-black rounded-lg transition-transform group-hover:scale-105 shadow-sm shrink-0"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Watch</span>
                          </Link>
                        ) : (
                          <Link
                            to={`/anime/${item.media.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition-colors shrink-0"
                          >
                            <span>Preview</span>
                            <ArrowRight size={11} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
