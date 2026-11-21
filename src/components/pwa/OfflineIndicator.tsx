import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#10141d]/95 backdrop-blur-md border border-amber-500/40 px-3.5 py-2 text-xs font-semibold text-amber-300 shadow-2xl">
      <WifiOff size={14} className="shrink-0 text-amber-400" />
      <span>Offline Mode — Showing cached content</span>
    </div>
  );
};
