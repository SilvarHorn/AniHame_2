import React, { useEffect, useState } from 'react';
import { format, fromUnixTime, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { fetchAnilist, AIRING_SCHEDULE_QUERY } from '../../api/anilist';
import { AiringSchedule } from '../../types';
import { Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Timetable() {
  const getProfileRegion = () => {
    try {
      const saved = localStorage.getItem('anime_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultRegion !== undefined) return parsed.defaultRegion;
      }
    } catch (e) {}
    return 'JP';
  };

  const [schedule, setSchedule] = useState<AiringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [country, setCountry] = useState(getProfileRegion);

  useEffect(() => {
    const loadSchedule = async () => {
      setError('');
      try {
        const now = Math.floor(Date.now() / 1000);
        // Get next 7 days
        const nextWeek = now + 7 * 24 * 60 * 60;
        
        const data = await fetchAnilist(AIRING_SCHEDULE_QUERY, {
          airingAt_greater: now,
          airingAt_lesser: nextWeek,
        });
        
        if (data?.Page?.airingSchedules) {
          const filtered = data.Page.airingSchedules.filter((s: any) => !s.media?.isAdult);
          setSchedule(filtered);
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

  const filteredSchedule = schedule.filter(item => country ? item.media.countryOfOrigin === country : true);

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
          
          return (
            <Link 
              to={`/anime/${item.media.id}`}
              key={item.id} 
              className="flex items-center gap-3 py-2 border border-gray-800 bg-[#0B0C0F] hover:border-primary/50 transition-colors group px-3 rounded-lg"
            >
              <div className="w-12 text-center shrink-0">
                <div className="text-[10px] font-bold text-gray-500 group-hover:text-gray-400">{dayName}</div>
                <div className="text-xs font-black text-[#EDF1F5]">{time}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#EDF1F5] truncate group-hover:text-primary transition-colors">
                  {item.media.title.english || item.media.title.romaji}
                </div>
                <div className="text-[10px] text-primary truncate">
                  Ep {item.episode} Airing
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
}
