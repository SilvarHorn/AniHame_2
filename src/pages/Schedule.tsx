import React, { useEffect, useState, useMemo } from 'react';
import { format, fromUnixTime, isYesterday, isToday, isTomorrow, addDays, isSameDay, formatDistanceToNowStrict } from 'date-fns';
import { fetchAnilist, AIRING_SCHEDULE_QUERY } from '../api/anilist';
import { AiringSchedule } from '../types';
import { Link } from 'react-router-dom';
import { Clock, Play, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  if (relLabel === 'IN 2 DAYS' || relLabel === 'IN 3 DAYS' || relLabel === 'IN 4 DAYS') return 'text-primary font-black tracking-wider uppercase';
  return 'text-gray-500 font-bold tracking-wider uppercase';
}

export default function Schedule() {
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, AiringSchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const scheduleDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    for (let i = -3; i <= 3; i++) {
      const d = addDays(today, i);
      result.push({
        date: d,
        formatStr: format(d, 'yyyy-MM-dd'),
        labelDay: format(d, 'EEE'),
        labelDate: format(d, 'MMM d'),
        relLabel: getRelativeDayLabel(d)
      });
    }
    return result;
  }, []);

  const [selectedDay, setSelectedDay] = useState(scheduleDays[3].formatStr); // Default to today
  const activeDayObj = scheduleDays.find(d => d.formatStr === selectedDay);

  useEffect(() => {
    const loadDaySchedule = async () => {
      if (!activeDayObj) return;
      const dayKey = activeDayObj.formatStr;
      
      // If already cached, just return
      if (scheduleByDay[dayKey]) {
        return;
      }

      setError('');
      setLoading(true);

      try {
        const startDay = activeDayObj.date;
        const endDay = new Date(startDay.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        let allDaySchedules: AiringSchedule[] = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage && page <= 5) {
          const data = await fetchAnilist(AIRING_SCHEDULE_QUERY, {
            airingAt_greater: Math.floor(startDay.getTime() / 1000),
            airingAt_lesser: Math.floor(endDay.getTime() / 1000),
            page,
            perPage: 50
          });
          
          if (data?.Page?.airingSchedules) {
            const filtered = data.Page.airingSchedules.filter((s: any) => !s.media?.isAdult);
            allDaySchedules = [...allDaySchedules, ...filtered];
          }
          
          hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;
          page++;
        }
        
        setScheduleByDay(prev => ({ ...prev, [dayKey]: allDaySchedules }));
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to fetch schedule.');
      } finally {
        setLoading(false);
      }
    };

    loadDaySchedule();
  }, [selectedDay, activeDayObj, scheduleByDay]);

  const activeItems = (scheduleByDay[selectedDay] || []).filter(
    item => country ? item.media.countryOfOrigin === country : true
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Pills Header */}
      <div className="flex overflow-x-auto gap-3 pb-4 mb-4 custom-scrollbar">
        {scheduleDays.map(d => {
          const isSelected = selectedDay === d.formatStr;
          return (
            <button
              key={d.formatStr}
              onClick={() => setSelectedDay(d.formatStr)}
              className={`flex flex-col items-center justify-center min-w-[104px] h-[52px] px-4 rounded-[20px] border transition-colors shrink-0 ${
                isSelected 
                  ? 'bg-primary border-primary text-[#0B0C0F] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' 
                  : 'bg-transparent border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className={`font-bold ${isSelected ? 'text-[#0B0C0F]' : ''}`}>{d.labelDay}</span>
                <span className={`text-[11px] ${isSelected ? 'text-[#0B0C0F]/90 font-semibold' : 'text-gray-500'}`}>{d.labelDate}</span>
              </div>
              {d.relLabel && (
                <div className="mt-0.5">
                  <span className={`text-[9px] leading-none ${isSelected ? 'text-[#0B0C0F]/90 font-black tracking-wider uppercase' : getRelColor(d.relLabel)}`}>
                    {d.relLabel}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info Bar */}
      <div className="bg-[#101319] rounded-xl border border-white/5 px-5 py-3.5 flex items-center justify-between mb-6 shadow-md">
        <div className="flex items-center gap-2.5 text-gray-300 text-sm">
          <Clock size={16} className="text-gray-400" />
          <span>Schedule for <span className="font-bold text-white">{activeDayObj ? format(activeDayObj.date, 'EEE, MMM d') : ''}</span></span>
        </div>
        <div className="text-sm text-gray-400 font-medium">
          {activeItems.length} releases
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {error ? (
            <div className="text-center text-red-500 py-12 bg-[#0B0C0F] rounded-2xl border border-white/5">{error}</div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-[#0B0C0F] rounded-2xl border border-white/5">No releases scheduled for this day.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeItems.map(item => {
                const hasAired = item.airingAt * 1000 < Date.now();
                return (
                  <Link
                    key={item.id}
                    to={`/anime/${item.media.id}`}
                    className="bg-[#0D1016] border border-white/5 rounded-2xl p-3 flex gap-4 hover:bg-[#151F2E] hover:border-primary/40 transition-colors group cursor-pointer shadow-lg relative overflow-hidden"
                  >
                    {/* Image */}
                    <div className="relative w-[84px] h-[116px] shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-white/5">
                      <img src={item.media.coverImage?.large} alt={item.media.title.english || item.media.title.romaji} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-1.5 left-1.5 bg-primary text-[#0B0C0F] text-[9px] font-black px-1.5 py-0.5 rounded-md z-10 leading-none shadow-md">
                        EP {item.episode}
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex flex-col flex-1 py-1.5 min-w-0 justify-center">
                      <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-primary transition-colors leading-tight mb-2">
                        {item.media.title.english || item.media.title.romaji}
                      </h3>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-primary font-bold">Episode {item.episode}</span>
                        <span className="text-gray-600 text-[10px]">•</span>
                        {hasAired ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e] border border-[#22c55e]/20 bg-[#22c55e]/10 px-1.5 py-[2px] rounded-md">
                            <Check size={10} strokeWidth={3} />
                            <span>Aired</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400 border border-orange-400/20 bg-orange-400/10 px-1.5 py-[2px] rounded-md">
                            <Sparkles size={10} strokeWidth={2.5} />
                            <span>Airing Soon</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-auto">
                        <Clock size={12} className="text-primary" />
                        <span>Airs at <span className="font-bold text-gray-200">{format(fromUnixTime(item.airingAt), 'HH:mm')}</span></span>
                      </div>
                    </div>
                    
                    {/* Play Button */}
                    <div className="flex items-center justify-center pr-2 pl-3">
                       <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-[#0B0C0F] group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]">
                         <Play size={20} fill="currentColor" className="ml-0.5" />
                       </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

