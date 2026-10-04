import React, { useEffect, useState } from 'react';
import { format, fromUnixTime, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { fetchAnilist, AIRING_SCHEDULE_QUERY, isHanimeMode } from '../../api/anilist';
import { AiringSchedule } from '../../types';
import { Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default React.memo(function Timetable() {
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

  const [schedule, setSchedule] = useState<AiringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [country, setCountry] = useState(getProfileRegion);

  useEffect(() => {
    const loadSchedule = async () => {
      setError('');
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startSec = Math.floor(startOfToday.getTime() / 1000);
        // Get next 7 days including all of today's broadcasts
        const nextWeek = startSec + 7 * 24 * 60 * 60;
        
        const data = await fetchAnilist(AIRING_SCHEDULE_QUERY, {
          airingAt_greater: startSec,
          airingAt_lesser: nextWeek,
        });
        
        if (data?.Page?.airingSchedules) {
          const filtered = data.Page.airingSchedules.filter((s: any) => isHanimeMode() ? s.media?.isAdult : !s.media?.isAdult);
          const seen = new Set<string>();
          const deduped: AiringSchedule[] = [];
          for (const item of filtered) {
            const key = `${item.media?.id}-${item.episode}`;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(item);
            }
          }
          setSchedule(deduped);
        }
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to fetch schedule.');
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  if (error) {
    return (
      <div className="bg-[#151F2E] rounded-xl border border-primary/10 flex flex-col p-3 h-full w-full min-h-0 items-center justify-center">
        <div className="text-red-500 text-xs font-medium">{error}</div>
      </div>
    );
  }

  if (loading && schedule.length === 0) return null;

  const filteredSchedule = schedule.filter(item => country ? (item.media.countryOfOrigin || 'JP') === country : true);
  const nowMs = Date.now();

  return (
    <div className="bg-[#151F2E] rounded-xl border border-primary/10 flex flex-col p-3 h-full w-full min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Schedule</h2>
        <select 
          value={country} 
          onChange={(e) => setCountry(e.target.value)}
          className="bg-[#0B0C0F] border border-gray-700 text-gray-400 text-[10px] uppercase font-bold rounded px-2 py-0.5 focus:outline-none focus:border-primary"
        >
          <option value="">All Regions</option>
          <option value="JP">Japanese</option>
          <option value="CN">Chinese</option>
        </select>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {filteredSchedule.slice(0, 12).map(item => {
          const date = fromUnixTime(item.airingAt);
          const dayName = format(date, 'E').toUpperCase();
          const time = format(date, 'HH:mm');
          const hasAired = item.airingAt * 1000 <= nowMs;
          const targetUrl = hasAired ? `/watch/${item.media.id}/${item.episode}` : `/anime/${item.media.id}`;
          
          return (
            <Link 
              to={targetUrl}
              key={`${item.media?.id}-${item.episode}`} 
              className="flex items-center gap-3 py-2 border border-gray-800 bg-[#0B0C0F] hover:border-primary/50 transition-colors group px-3 rounded-lg"
            >
              <div className="w-12 text-center shrink-0">
                <div className="text-[10px] font-bold text-gray-500 group-hover:text-gray-400">{dayName}</div>
                <div className="text-xs font-black text-[#FBF3E5]">{time}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#FBF3E5] truncate group-hover:text-primary transition-colors">
                  {isHanimeMode() ? (item.media.title.romaji || item.media.title.english) : (item.media.title.english || item.media.title.romaji)}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-primary font-bold">
                    Ep {item.episode}
                  </span>
                  {hasAired ? (
                    <span className="text-[9px] font-bold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-1 py-0.5 rounded leading-none">
                      Aired
                    </span>
                  ) : (
                    <span className="text-[9px] text-gray-400 font-medium">
                      Airing
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link 
        to="/schedule"
        className="mt-4 w-full py-2 bg-[#0B0C0F] border border-gray-800 rounded text-[10px] font-bold hover:text-primary text-gray-400 transition-colors shrink-0 text-center flex justify-center items-center"
      >
        FULL SCHEDULE
      </Link>
    </div>
  );
});
