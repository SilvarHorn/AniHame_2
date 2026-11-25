import React, { useState, useEffect, useMemo } from 'react';
import { Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnimeCard from '../components/ui/AnimeCard';
import { preloadAnimeThumbnails } from '../utils/imagePreload';
import { MyListStatus, getMyList, MyListItem } from '../utils/myList';
import { cn } from '../lib/utils';

const TABS: { label: string; value: MyListStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Watching', value: 'WATCHING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'On-Hold', value: 'ON_HOLD' },
  { label: 'Dropped', value: 'DROPPED' },
  { label: 'Plan to Watch', value: 'PLAN_TO_WATCH' }
];

export default function MyList() {
  const [activeTab, setActiveTab] = useState<MyListStatus | 'ALL'>('ALL');
  const [myList, setMyList] = useState<MyListItem[]>(() => getMyList());
  const [page, setPage] = useState(1);
  const [batchReady, setBatchReady] = useState(false);
  const itemsPerPage = 24;

  useEffect(() => {
    const handleListUpdate = () => setMyList(getMyList());
    handleListUpdate();
    window.addEventListener('my-list-updated', handleListUpdate);
    window.addEventListener('storage', handleListUpdate);
    return () => {
      window.removeEventListener('my-list-updated', handleListUpdate);
      window.removeEventListener('storage', handleListUpdate);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const filteredList = useMemo(
    () => (activeTab === 'ALL' ? myList : myList.filter((i) => i.status === activeTab)),
    [activeTab, myList]
  );

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = useMemo(
    () => filteredList.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [filteredList, page]
  );

  useEffect(() => {
    let isCurrent = true;
    setBatchReady(false);
    if (paginatedList.length === 0) {
      setBatchReady(true);
      return;
    }
    preloadAnimeThumbnails(paginatedList).then(() => {
      if (isCurrent) setBatchReady(true);
    });
    return () => {
      isCurrent = false;
    };
  }, [paginatedList]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#FBF3E5] flex items-center gap-3">
          <span className="w-1.5 h-7 bg-primary rounded-full inline-block"></span>
          My List
        </h1>
        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-bold border border-white/5 whitespace-nowrap self-start sm:self-auto">
          {filteredList.length} Anime
        </span>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-4 mb-4 custom-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'relative whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors duration-200 active:scale-95 cursor-pointer',
                isActive
                  ? 'text-[#0B0C0F]'
                  : 'bg-[#151F2E] text-gray-400 hover:text-[#FBF3E5] border border-gray-800'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="my-list-tab"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-primary"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {paginatedList.length > 0 ? (
          <motion.div
            key={`${activeTab}-${page}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
              {paginatedList.map((item, idx) => (
                <AnimeCard
                  key={item.animeId}
                  anime={item.anime as any}
                  index={idx}
                  batchReady={batchReady}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 active:scale-95 transition-all font-bold text-sm"
                >
                  Previous
                </button>
                <span className="text-gray-400 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 active:scale-95 transition-all font-bold text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`empty-${activeTab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-20 bg-[#151F2E] rounded-2xl border border-gray-800 border-dashed"
          >
            <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-[#FBF3E5] mb-2">No anime found</h3>
            <p className="text-gray-400">
              Add anime to your &quot;{TABS.find((t) => t.value === activeTab)?.label}&quot; list to see them here.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
